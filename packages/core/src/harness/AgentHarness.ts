import type { LLMProvider, ChatMessage, ToolCall } from "../providers/types.js";
import type { ToolRegistry, ToolContext } from "../tools/ToolRegistry.js";
import type { PermissionEngine } from "../permissions/PermissionEngine.js";
import type { HookEngine } from "../hooks/HookEngine.js";
import type { AgentMode } from "../session/SessionStore.js";
import { parseMentions, formatMentionContexts } from "../mentions/parseMentions.js";
import { Telemetry } from "./Telemetry.js";
import { CircuitBreaker, CircuitBreakerError } from "./CircuitBreaker.js";
import { SnapshotManager } from "./Snapshot.js";
import { LoopStateMachine } from "./LoopStateMachine.js";
import type { CircuitBreakerConfig } from "./types.js";
import {
  TaskGraph,
  Scheduler,
  planFromGoal,
  VerificationRunner,
} from "../graph/index.js";
import type { TaskGraph as TaskGraphData } from "../graph/types.js";
import { randomUUID } from "node:crypto";

export interface AgentHarnessOptions {
  cwd: string;
  provider: LLMProvider;
  model: string;
  tools: ToolRegistry;
  permissions: PermissionEngine;
  hooks: HookEngine;
  mode: AgentMode;
  ignorePatterns: string[];
  sessionId?: string;
  circuitBreakers?: Partial<CircuitBreakerConfig>;
  telemetryDir?: string;
  snapshotDir?: string;
}

export interface TurnResult {
  text: string;
  messages: ChatMessage[];
  phaseHistory: ReturnType<LoopStateMachine["getHistory"]>;
  toolCallCount: number;
  blocked?: boolean;
  tripReason?: string;
  graph?: TaskGraphData;
}

/**
 * Production harness around the agent loop.
 * Typed phase SM, circuit breakers, snapshot/revert, telemetry, VERIFY+REFLECT.
 */
export class AgentHarness {
  private mode: AgentMode;
  private terminalBuffer: string[] = [];
  private readonly telemetry: Telemetry;
  private readonly circuit: CircuitBreaker;
  private readonly snapshots: SnapshotManager;
  private readonly sm: LoopStateMachine;
  private readonly sessionId: string;
  private readonly scheduler: Scheduler;
  private snapshotTaken = false;
  private cumulativeTokens = 0;
  private currentGraph: TaskGraph | null = null;

  constructor(private opts: AgentHarnessOptions) {
    this.mode = opts.mode;
    this.sessionId = opts.sessionId ?? randomUUID();
    this.telemetry = new Telemetry(this.sessionId, opts.telemetryDir);
    this.circuit = new CircuitBreaker(opts.circuitBreakers);
    this.snapshots = new SnapshotManager(opts.cwd, opts.snapshotDir);
    this.sm = new LoopStateMachine(this.telemetry, this.sessionId);
    this.scheduler = new Scheduler({ concurrencyLimit: 3, serializePathOverlap: true });
  }

  getGraph(): TaskGraph | null {
    return this.currentGraph;
  }
  getMode(): AgentMode {
    return this.mode;
  }
  setMode(mode: AgentMode): void {
    this.mode = mode;
  }
  getSessionId(): string {
    return this.sessionId;
  }
  getPhase(): string {
    return this.sm.getPhase();
  }
  getTelemetryPath(): string {
    return this.telemetry.getPath();
  }
  recordTerminalOutput(output: string): void {
    this.terminalBuffer.push(output);
    if (this.terminalBuffer.length > 200) this.terminalBuffer.shift();
  }

  async runTurn(
    userInput: string,
    history: ChatMessage[],
    systemPrompt: string,
  ): Promise<TurnResult> {
    try {
      this.sm.toPerceive(userInput);

      const { cleaned, contexts } = parseMentions(
        userInput,
        this.opts.cwd,
        this.terminalBuffer,
      );
      const mentionBlock = formatMentionContexts(contexts);
      const effectiveInput = mentionBlock
        ? `${mentionBlock}\n\n${cleaned}`
        : cleaned;

      const isTrivial =
        this.mode === "plan" ||
        (!userInput.includes("@") &&
          userInput.length < 80 &&
          !/\b(fix|create|edit|delete|run|install|build|test|commit)\b/i.test(
            userInput,
          ));

      this.sm.toPlan(effectiveInput.slice(0, 200), isTrivial);

      let planBlock = "";
      if (!isTrivial) {
        this.currentGraph = planFromGoal(effectiveInput);
        this.sm.setGraphId(this.currentGraph.id);
        this.telemetry.emit(
          "node_status_change",
          {
            event: "graph_created",
            graphId: this.currentGraph.id,
            nodeCount: this.currentGraph.getNodes().length,
            summary: this.currentGraph.summary(),
          },
          { graphId: this.currentGraph.id },
        );
        planBlock =
          "\n\n[TASK GRAPH]\n" +
          this.currentGraph
            .getNodes()
            .map(
              (n) =>
                `- (${n.id.slice(0, 8)}) [${n.kind}] ${n.description}` +
                (n.dependsOn.length
                  ? ` ← depends: ${n.dependsOn.map((d) => d.slice(0, 8)).join(",")}`
                  : ""),
            )
            .join("\n") +
          "\nExecute nodes respecting dependencies. Verification nodes gate downstream work.";
      }

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: effectiveInput + planBlock },
      ];

      const newMessages: ChatMessage[] = [{ role: "user", content: userInput }];
      let finalText = "";
      const maxIterations = this.circuit.getConfig().maxToolCallsPerTask;

      for (let i = 0; i < maxIterations; i++) {
        if (this.circuit.isTripped()) break;

        const tools = this.mode === "plan" ? [] : this.opts.tools.list();

        this.telemetry.emit("provider_call", {
          model: this.opts.model,
          iteration: i,
          toolCount: tools.length,
        });

        const response = await this.opts.provider.chat({
          model: this.opts.model,
          messages,
          tools: tools.length ? tools : undefined,
        });

        if (response.usage) {
          this.cumulativeTokens +=
            (response.usage.inputTokens ?? 0) +
            (response.usage.outputTokens ?? 0);
        }

        finalText = response.text || finalText;

        if (!response.toolCalls || response.toolCalls.length === 0) {
          newMessages.push({ role: "assistant", content: response.text || "" });
          break;
        }

        newMessages.push({
          role: "assistant",
          content: response.text || "",
          tool_calls: response.toolCalls,
        });
        messages.push({
          role: "assistant",
          content: response.text || "",
          tool_calls: response.toolCalls,
        });

        for (const tc of response.toolCalls) {
          const nodeId = tc.id || randomUUID();
          const result = await this.runToolUnderHarness(tc, nodeId);
          const toolMsg: ChatMessage = {
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: result,
          };
          newMessages.push(toolMsg);
          messages.push(toolMsg);
        }
      }

      const blocked = this.circuit.isTripped();
      const graphSummary = this.currentGraph?.summary() ?? "";
      const summary = blocked
        ? `Stopped by circuit breaker: ${this.circuit.getTripReason()}`
        : finalText || "Done.";

      const completed = this.currentGraph?.completedIds() ?? [];
      const blockedNodes =
        this.currentGraph?.blockedIds() ?? (blocked ? ["budget"] : []);

      this.sm.toReport(
        graphSummary ? `${summary}\n\n${graphSummary}` : summary,
        completed,
        blockedNodes,
      );
      this.sm.toPersist(this.sessionId);
      this.telemetry.flush();
      this.sm.toIdle();

      return {
        text: summary,
        messages: newMessages,
        phaseHistory: this.sm.getHistory(),
        toolCallCount: this.circuit.getToolCallCount(),
        blocked,
        tripReason: this.circuit.getTripReason() ?? undefined,
        graph: this.currentGraph?.toJSON(),
      };
    } catch (err) {
      if (err instanceof CircuitBreakerError) {
        this.sm.toReport(err.message, [], ["circuit_breaker"]);
        this.sm.toPersist(this.sessionId);
        this.telemetry.flush();
        this.sm.toIdle();
        return {
          text: err.message,
          messages: [],
          phaseHistory: this.sm.getHistory(),
          toolCallCount: this.circuit.getToolCallCount(),
          blocked: true,
          tripReason: err.message,
          graph: this.currentGraph?.toJSON(),
        };
      }
      throw err;
    }
  }

  private async runToolUnderHarness(
    tc: ToolCall,
    nodeId: string,
  ): Promise<string> {
    const toolName = tc.function.name;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(tc.function.arguments || "{}");
    } catch {
      return `Error: invalid tool arguments`;
    }

    this.sm.toAct(nodeId, `Call ${toolName}`, toolName, args);

    if (this.mode === "plan") {
      return `Plan mode: would call ${toolName}(${JSON.stringify(args)})`;
    }

    this.sm.toPermission(nodeId, toolName, args);
    const allowed = await this.opts.permissions.check(
      toolName,
      `Run tool ${toolName}`,
      args,
    );
    this.telemetry.emit(
      "permission_decision",
      { toolName, allowed, args },
      { nodeId },
    );
    if (!allowed) {
      this.sm.toReflect(
        nodeId,
        `Permission denied for ${toolName}`,
        1,
        this.circuit.getConfig().maxRetriesPerNode,
      );
      return `Permission denied for tool ${toolName}`;
    }

    if (!this.snapshotTaken && isMutatingTool(toolName)) {
      const snapId = this.snapshots.create(this.sessionId, []);
      this.snapshotTaken = true;
      this.telemetry.emit("snapshot", { snapshotId: snapId }, { nodeId });
    }

    try {
      this.circuit.recordToolCall();
    } catch (err) {
      if (err instanceof CircuitBreakerError) throw err;
    }

    this.sm.toExecute(nodeId, toolName, args);
    await this.opts.hooks.fire({ event: "BeforeToolCall", toolName });

    const tool = this.opts.tools.get(toolName);
    if (!tool) {
      this.sm.toVerify(nodeId, toolName, `Error: unknown tool ${toolName}`, false);
      return `Error: unknown tool ${toolName}`;
    }

    const ctx: ToolContext = {
      cwd: this.opts.cwd,
      onTerminalOutput: (o) => this.recordTerminalOutput(o),
    };

    let rawResult: string;
    let success = false;

    try {
      const result = await tool.execute(args, ctx);
      success = result.success;
      rawResult = result.success
        ? result.output
        : `Error: ${result.error || result.output}`;
      await this.opts.hooks.fire({ event: "AfterToolCall", toolName });
    } catch (err) {
      success = false;
      rawResult = `Error: ${(err as Error).message}`;
    }

    this.sm.toVerify(nodeId, toolName, rawResult, success);
    this.telemetry.emit(
      "verify_result",
      { toolName, success, resultPreview: rawResult.slice(0, 300) },
      { nodeId },
    );

    this.syncGraphNode(nodeId, toolName, args, success, rawResult);

    if (success) {
      this.circuit.clearFailure(toolName, args);
      await this.runReadyVerificationNodes();
      return rawResult;
    }

    const remaining = this.circuit.recordNodeAttempt(nodeId);
    const forceReflect = this.circuit.recordFailure(toolName, args, rawResult);

    this.sm.toReflect(
      nodeId,
      rawResult,
      this.circuit.getNodeAttempts(nodeId),
      this.circuit.getConfig().maxRetriesPerNode,
      forceReflect
        ? "Identical failure repeated — do not retry the same action without a new diagnosis."
        : undefined,
    );

    this.telemetry.emit(
      "reflect",
      {
        toolName,
        remaining,
        forceReflect,
        failurePreview: rawResult.slice(0, 200),
      },
      { nodeId },
    );

    if (forceReflect) {
      return `${rawResult}\n\n[HARNESS] Identical failure detected. Diagnose root cause before retrying the same tool+args.`;
    }
    if (remaining <= 0) {
      return `${rawResult}\n\n[HARNESS] Node retry budget exhausted. Mark this step blocked and continue independent work.`;
    }
    return rawResult;
  }

  private syncGraphNode(
    nodeId: string,
    toolName: string,
    args: Record<string, unknown>,
    success: boolean,
    output: string,
  ): void {
    if (!this.currentGraph) return;

    let node = this.currentGraph.getNode(nodeId);
    if (!node) {
      node = this.currentGraph.addNode({
        id: nodeId,
        kind: "tool_call",
        description: `Call ${toolName}`,
        toolName,
        args,
        touches: extractTouches(toolName, args),
      });
    }

    this.scheduler.onNodeComplete(this.currentGraph, node.id, success, output);

    this.telemetry.emit(
      "node_status_change",
      {
        nodeId: node.id,
        status: this.currentGraph.getNode(node.id)?.status,
        toolName,
        success,
      },
      { graphId: this.currentGraph.id, nodeId: node.id },
    );
  }

  private async runReadyVerificationNodes(): Promise<void> {
    if (!this.currentGraph || this.mode === "plan") return;

    const ready = this.scheduler.getReadySet(this.currentGraph).ready.filter(
      (n) => n.kind === "verification",
    );
    if (ready.length === 0) return;

    const runner = new VerificationRunner(this.opts.cwd, this.opts.tools);
    this.scheduler.markRunning(this.currentGraph, ready);

    for (const node of ready) {
      const commands = node.verifyCommands ?? ["typecheck"];
      this.sm.toVerify(node.id, "verification", commands.join(", "), false);

      const { success, results } = await runner.run(commands);
      const output = results
        .map((r) => `[${r.command}] ${r.success ? "OK" : "FAIL"}\n${r.output}`)
        .join("\n\n");

      this.scheduler.onNodeComplete(
        this.currentGraph,
        node.id,
        success,
        output,
        commands.join(","),
      );

      this.telemetry.emit(
        "verify_result",
        { nodeId: node.id, success, commands },
        { graphId: this.currentGraph.id, nodeId: node.id },
      );

      if (!success) {
        this.sm.toReflect(
          node.id,
          output,
          node.attempts,
          node.maxAttempts,
          "Verification failed — fix before downstream nodes run.",
        );
      }
    }
  }

  revertTask(): { restored: string[]; errors: string[] } {
    const result = this.snapshots.revert();
    this.telemetry.emit("snapshot", {
      action: "revert",
      restored: result.restored.length,
      errors: result.errors,
    });
    this.telemetry.flush();
    return result;
  }
}

function isMutatingTool(name: string): boolean {
  const mutating = [
    "write_file",
    "edit_file",
    "create_file",
    "delete_file",
    "bash",
    "run_terminal",
    "git",
  ];
  return mutating.some((m) => name.includes(m) || name === m);
}

function extractTouches(
  toolName: string,
  args: Record<string, unknown>,
): string[] {
  const paths: string[] = [];
  for (const key of ["path", "file", "file_path", "filename", "target"]) {
    const v = args[key];
    if (typeof v === "string" && v.length > 0) paths.push(v);
  }
  if (toolName.includes("write") || toolName.includes("edit")) {
    if (paths.length === 0) paths.push("src/");
  }
  return paths;
}
