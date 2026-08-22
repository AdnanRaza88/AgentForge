import type { Tool, ToolContext, ToolResult } from "./ToolRegistry.js";
import type { SubagentOrchestrator } from "../subagents/SubagentOrchestrator.js";
import { listCoreProfileNames } from "../subagents/profiles.js";

export function createSpawnSubagentTool(
  orchestrator: SubagentOrchestrator,
): Tool {
  return {
    schema: {
      name: "spawn_subagent",
      description:
        "Delegate a focused task to a subagent. Core roster: explorer, researcher, architect, coder, frontend, backend, reviewer, tester, devops, orchestrator. Custom names from .agentforge/subagents/ also work.",
      inputSchema: {
        type: "object",
        properties: {
          agentName: {
            type: "string",
            description:
              "Subagent name. Core: " +
              listCoreProfileNames().join(", ") +
              ". Or any registered custom name.",
          },
          task: {
            type: "string",
            description: "Clear task description for the subagent",
          },
          brief: {
            type: "string",
            description:
              "Optional specialization brief. If agentName is unknown, builds a temporary agent from base coder + this brief.",
          },
          baseAgent: {
            type: "string",
            description:
              "When using brief for a new specialist, which core agent to anchor on (default: coder)",
          },
        },
        required: ["agentName", "task"],
      },
      permissionKey: "spawn_subagent",
    },
    async execute(
      args: Record<string, unknown>,
      _ctx: ToolContext,
    ): Promise<ToolResult> {
      const agentName = String(args.agentName || "coder");
      const task = String(args.task || "");
      const brief = args.brief ? String(args.brief) : undefined;
      if (!task.trim()) {
        return { success: false, output: "", error: "task is required" };
      }

      try {
        let profileOverride = undefined;
        if (brief && !orchestrator.getProfile(agentName)) {
          profileOverride = orchestrator.buildFromBrief({
            name: agentName,
            brief,
            baseAgent: args.baseAgent ? String(args.baseAgent) : "coder",
          });
        }

        const result = await orchestrator.run({
          agentName,
          task,
          profileOverride,
        });
        const status = result.success ? "ok" : "failed";
        const tools = result.toolCallCount ?? 0;
        const header =
          "[subagent:" + result.agentName + "] " + status + " · tools=" + tools;
        return {
          success: result.success,
          output: header + "\n\n" + result.result,
        };
      } catch (err) {
        return {
          success: false,
          output: "",
          error: (err as Error).message,
        };
      }
    },
  };
}

export function createRegisterSubagentTool(
  orchestrator: SubagentOrchestrator,
): Tool {
  return {
    schema: {
      name: "register_subagent",
      description:
        "Create a custom subagent profile for this project (saved to .agentforge/subagents/<name>.json).",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short id, e.g. sql-migrator" },
          label: { type: "string" },
          systemAddon: {
            type: "string",
            description: "Role instructions for the custom agent",
          },
          maxToolCalls: { type: "number" },
          readOnly: { type: "boolean" },
        },
        required: ["name", "systemAddon"],
      },
      permissionKey: "register_subagent",
    },
    async execute(
      args: Record<string, unknown>,
      _ctx: ToolContext,
    ): Promise<ToolResult> {
      try {
        const saved = orchestrator.registerCustom({
          name: String(args.name),
          label: args.label ? String(args.label) : undefined,
          systemAddon: String(args.systemAddon),
          maxToolCalls: args.maxToolCalls
            ? Number(args.maxToolCalls)
            : undefined,
          readOnly: Boolean(args.readOnly),
        });
        return {
          success: true,
          output:
            'Registered custom subagent "' +
            saved.name +
            '" (' +
            saved.label +
            "). Available via spawn_subagent.',
        };
      } catch (err) {
        return {
          success: false,
          output: "",
          error: (err as Error).message,
        };
      }
    },
  };
}
