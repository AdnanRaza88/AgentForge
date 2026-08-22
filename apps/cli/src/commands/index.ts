import chalk from "chalk";
import type { SlashCommand } from "./types.js";
import { initCommand } from "./init.js";
import { planCommand, agentModeCommand, planModeCommand } from "./plan.js";
import { todoCommand } from "./todo.js";
import { resumeCommand, renameCommand, compactCommand } from "./session.js";
import { configCommand, permissionCommand } from "./config.js";
import { agentsCommand } from "./agents.js";

const exitCommand: SlashCommand = {
  name: "exit",
  description: "Save the session and exit AgentForge",
  async run() {
    return { output: "", exit: true };
  },
};

export function registerAllCommands(): SlashCommand[] {
  const commands: SlashCommand[] = [
    initCommand,
    planCommand,
    planModeCommand,
    agentModeCommand,
    todoCommand,
    resumeCommand,
    renameCommand,
    compactCommand,
    configCommand,
    permissionCommand,
    agentsCommand,
    exitCommand,
  ];

  const helpCommand: SlashCommand = {
    name: "help",
    description: "List all available commands",
    async run() {
      const lines = commands
        .concat(helpCommandSelfRef)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(
          (c) =>
            `  ${chalk.cyan(`/${c.name}`.padEnd(16))} ${c.description}`,
        );
      return {
        output:
          chalk.bold("AgentForge commands:\n") +
          lines.join("\n") +
          chalk.gray(
            "\n\nAlso:\n  @file / @folder/ / @git / @terminal   → inline context mentions\n  !<command>                              → run a bash command directly (Bash Mode)\n  tab                                     → toggle Plan Mode / Agent Mode",
          ),
      };
    },
  };
  const helpCommandSelfRef = helpCommand;

  commands.push(helpCommand);
  return commands;
}
