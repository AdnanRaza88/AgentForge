import type { LLMProvider } from "../providers/types.js";
import type { ToolRegistry } from "../tools/ToolRegistry.js";
import type { PermissionEngine } from "../permissions/PermissionEngine.js";
import { AgentHarness } from "../harness/AgentHarness.js";
import { TaskGraph } from "../graph/TaskGraph.js";
import type { TaskGraph as TaskGraphData } from "../graph/types.js";
import { compileSystemStack } from "../cognitive/IdentityStack.js";
import {
  CORE_SUBAGENT_PROFILES,
  getCoreProfile,
  type SubagentProfile,
} from "./profiles.js";
import { loadCustomProfiles, saveCustomProfile } from "./customProfiles.js";

export type { SubagentProfile };
export { CORE_SUBAGENT_PROFILES };

export interface SubagentResult {
  agentName: string;
  success: boolean;
  result: string;
  nestedGraph?: TaskGraphData;
  toolCallCount?: number;
}

/**
 * Subagents as first-class graph citizens.
 * Roster = 10 core + custom. Meta orchestrator decomposes work.
 */
export class SubagentOrchestrator {
  private custom: SubagentProfile[] = [];

  constructor(
    private cwd: string,
    private provider: LLMProvider,
    private model: string,
    private tools: ToolRegistry,
    private permissions: PermissionEngine,
  ) {
    this.reloadCustom();
  }

  reloadCustom(): void {
    this.custom = loadCustomProfiles(this.cwd);
  }

  listAvailable(): SubagentProfile[] {
    const byName = new Map<string, SubagentProfile>();
    for (const p of CORE_SUBAGENT_PROFILES) byName.set(p.name, p);
    for (const p of this.custom) byName.set(p.name, p);
    return [...byName.values()];
  }

  getProfile(name: string): SubagentProfile | undefined {
    return this.listAvailable().find((p) => p.name === name);
  }

  registerCustom(profile: {
    name: string;
    label?: string;
    systemAddon: string;
    maxToolCalls?: number;
    readOnly?: boolean;
  }): SubagentProfile {
    saveCustomProfile(this.cwd, {
      name: profile.name,
      label: profile.label || profile.name,
      systemAddon: profile.systemAddon,
      maxToolCalls: profile.maxToolCalls ?? 20,
      readOnly: profile.readOnly,
      category: "custom",
    });
    this.reloadCustom();
    const saved = this.getProfile(profile.name);
    if (!saved) {
      throw new Error(`Failed to load custom profile after save: ${profile.name}`);
    }
    return saved;
  }

  buildFromBrief(opts: {
    name: string;
    brief: string;
    baseAgent?: string;
    maxToolCalls?: number;
    readOnly?: boolean;
  }): SubagentProfile {
    const base =
      getCoreProfile(opts.baseAgent || "coder") || CORE_SUBAGENT_PROFILES[3];
    return {
      name: opts.name.toLowerCase().replace(/\s+/g, "-"),
      label: opts.name,
      category: "custom",
      readOnly: opts.readOnly ?? base.readOnly,
      maxToolCalls: opts.maxToolCalls ?? base.maxToolCalls,
      systemAddon: `${base.systemAddon}\n\n## Specialization for this run\n\n${opts.brief}`,
    };
  }

  async run(opts: {
    agentName: string;
    task: string;
    parentGraphId?: string;
    profileOverride?: SubagentProfile;
  }): Promise<SubagentResult> {
    const profile =
      opts.profileOverride ||
      this.getProfile(opts.agentName) ||
      this.buildFromBrief({
        name: opts.agentName,
        brief: `Complete the assigned task as a focused specialist named ${opts.agentName}.`,
        baseAgent: "coder",
      });

    const system = compileSystemStack({
      toolsSummary: this.tools
        .list()
        .map((t) => `- ${t.name}`)
        .join("\n"),
      mcpSkillsSummary: "(inherited from parent session)",
      subagentsSummary:
        profile.name === "orchestrator"
          ? this.listAvailable()
              .filter((p) => p.name !== "orchestrator")
              .map((p) => `- ${p.name}: ${p.label}`)
              .join("\n")
          : "(nested — complete the task; only orchestrator should fan out further)",
      projectMemory: "",
      sessionState: `Subagent: ${profile.name}${opts.parentGraphId ? ` · parent ${opts.parentGraphId.slice(0, 8)}` : ""}`,
      mode: profile.readOnly ? "plan" : "agent",
    });

    const fullSystem = `${system}\n\n---\n\n## Subagent role\n\n${profile.systemAddon}\n\n## Your task\n\n${opts.task}`;

    const harness = new AgentHarness({
      cwd: this.cwd,
      provider: this.provider,
      model: this.model,
      tools: this.tools,
      permissions: this.permissions,
      hooks: { fire: async () => {} } as any,
      mode: profile.readOnly ? "plan" : "agent",
      ignorePatterns: [],
      circuitBreakers: {
        maxToolCallsPerTask: profile.maxToolCalls,
        maxRetriesPerNode: 2,
      },
    });

    try {
      const result = await harness.runTurn(opts.task, [], fullSystem);
      return {
        agentName: profile.name,
        success: !result.blocked,
        result: result.text,
        nestedGraph: result.graph,
        toolCallCount: result.toolCallCount,
      };
    } catch (err) {
      return {
        agentName: profile.name,
        success: false,
        result: (err as Error).message,
      };
    }
  }

  async runParallel(
    tasks: { agentName: string; task: string }[],
  ): Promise<SubagentResult[]> {
    return Promise.all(tasks.map((t) => this.run(t)));
  }

  addSubagentNode(
    graph: TaskGraph,
    opts: {
      agentName: string;
      task: string;
      dependsOn?: string[];
      description?: string;
    },
  ): string {
    const profile = this.getProfile(opts.agentName);
    const node = graph.addNode({
      kind: "subagent",
      description:
        opts.description ||
        `Subagent ${profile?.label || opts.agentName}: ${opts.task.slice(0, 80)}`,
      dependsOn: opts.dependsOn ?? [],
      assignedTo: opts.agentName,
      args: { agentName: opts.agentName, task: opts.task },
      maxAttempts: 2,
    });
    return node.id;
  }

  async executeGraphNode(
    _nodeId: string,
    args: { agentName?: string; task?: string },
    parentGraphId?: string,
  ): Promise<{ success: boolean; output: string; nestedGraph?: TaskGraphData }> {
    const agentName = args.agentName || "coder";
    const task = args.task || "Complete the delegated work.";
    const result = await this.run({ agentName, task, parentGraphId });
    return {
      success: result.success,
      output: result.result,
      nestedGraph: result.nestedGraph,
    };
  }
}
