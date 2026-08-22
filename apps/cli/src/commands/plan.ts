import chalk from "chalk";
import type { SlashCommand } from "./types.js";

export const planCommand: SlashCommand = {
  name: "plan",
  description:
    "Switch to Plan Mode: the agent proposes a plan without writing code or running commands",
  async run(args, state) {
    state.agentLoop.setMode("plan");
    state.session.mode = "plan";

    if (args.trim()) {
      const result = await state.agentLoop.runTurn(
        args,
        state.session.messages,
        systemPromptFor(state),
      );
      state.session.messages.push(...result.messages);
      return { output: chalk.yellow("PLAN MODE") + "\n\n" + result.text };
    }

    return {
      output: chalk.yellow(
        "Switched to PLAN MODE — the agent will only propose plans, not execute them.",
      ),
    };
  },
};

export const agentModeCommand: SlashCommand = {
  name: "agent-mode",
  description:
    "Switch to Agent Mode: the agent plans AND executes (writes files, runs commands)",
  async run(_args, state) {
    state.agentLoop.setMode("agent");
    state.session.mode = "agent";
    return {
      output: chalk.green(
        "Switched to AGENT MODE — the agent may now write files and run commands (subject to permissions).",
      ),
    };
  },
};

export const planModeCommand: SlashCommand = {
  name: "plan-mode",
  description: "Alias for /plan with no task — just switches mode",
  async run(_args, state) {
    return planCommand.run("", state);
  },
};

function systemPromptFor(state: Parameters<SlashCommand["run"]>[1]): string {
  const memoryBlock = state.memory.buildCombinedMemory();
  return (
    "You are AgentForge in PLAN MODE. Propose a clear, numbered, actionable plan. Do not write code or claim to run commands." +
    (memoryBlock ? `\n\n${memoryBlock}` : "")
  );
}
