import type { LLMProvider } from "../providers/types.js";
import type { ToolRegistry } from "../tools/ToolRegistry.js";
import type { PermissionEngine } from "../permissions/PermissionEngine.js";
import { AgentLoop } from "../agent/AgentLoop.js";

export interface SubagentResult {
  agentName: string;
  success: boolean;
  result: string;
}

/**
 * Spawns focused sub-agents for delegated tasks. Each subagent gets its own
 * short-lived AgentLoop with the same tools/permissions but a specialized
 * system prompt.
 */
export class SubagentOrchestrator {
  constructor(
    private cwd: string,
    private provider: LLMProvider,
    private model: string,
    private tools: ToolRegistry,
    private permissions: PermissionEngine,
  ) {}

  listAvailable(): { name: string }[] {
    return [
      { name: "researcher" },
      { name: "coder" },
      { name: "reviewer" },
      { name: "tester" },
    ];
  }

  async run(opts: { agentName: string; task: string }): Promise<SubagentResult> {
    const system = this.systemFor(opts.agentName);
    const loop = new AgentLoop({
      cwd: this.cwd,
      provider: this.provider,
      model: this.model,
      tools: this.tools,
      permissions: this.permissions,
      hooks: { fire: async () => {} } as any,
      mode: "agent",
      ignorePatterns: [],
    });

    try {
      const result = await loop.runTurn(opts.task, [], system);
      return { agentName: opts.agentName, success: true, result: result.text };
    } catch (err) {
      return { agentName: opts.agentName, success: false, result: (err as Error).message };
    }
  }

  async runParallel(tasks: { agentName: string; task: string }[]): Promise<SubagentResult[]> {
    return Promise.all(tasks.map((t) => this.run(t)));
  }

  private systemFor(name: string): string {
    const prompts: Record<string, string> = {
      researcher: "You are a research subagent. Investigate thoroughly and return concise findings with sources if possible.",
      coder: "You are a coding subagent. Write clean, working code. Prefer small focused changes.",
      reviewer: "You are a code-review subagent. Point out bugs, style issues, and improvements.",
      tester: "You are a testing subagent. Propose and (when possible) run tests for the given task.",
    };
    return prompts[name] || `You are the "${name}" subagent. Complete the assigned task carefully.`;
  }
}
