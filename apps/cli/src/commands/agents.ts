import chalk from "chalk";
import { SubagentOrchestrator, createProvider } from "@agentforge/core";
import type { SlashCommand } from "./types.js";

export const agentsCommand: SlashCommand = {
  name: "agents",
  description:
    "List available subagents, or delegate a task: /agents run <name> <task>  |  /agents parallel <name1>::<task1> | <name2>::<task2>",
  async run(args, state) {
    const provider = createProvider(state.settings.provider as any);
    const orchestrator = new SubagentOrchestrator(
      state.cwd,
      provider,
      state.settings.model,
      state.tools,
      state.permissions,
    );

    const parts = args.trim().split(/\s+/);
    const sub = parts[0];

    if (!sub || sub === "list") {
      const list = orchestrator.listAvailable();
      return {
        output:
          chalk.bold("Available subagents:\n") +
          list.map((a) => `  - ${a.name}`).join("\n") +
          chalk.gray("\n\nUsage: /agents run <name> <task text>"),
      };
    }

    if (sub === "run") {
      const [, name, ...taskParts] = args.trim().split(/\s+/);
      const task = taskParts.join(" ");
      if (!name || !task)
        return { output: chalk.red("Usage: /agents run <name> <task text>") };

      console.log(chalk.gray(`\nDelegating to subagent "${name}"...`));
      const result = await orchestrator.run({ agentName: name, task });
      return {
        output: `${chalk.bold(`[${result.agentName}]`)} ${result.success ? chalk.green("done") : chalk.red("failed")}\n${result.result}`,
      };
    }

    if (sub === "parallel") {
      const rest = args.trim().slice("parallel".length).trim();
      const taskSpecs = rest.split("|").map((s) => s.trim());
      const tasks = taskSpecs
        .map((spec) => {
          const [name, ...taskParts] = spec.split("::");
          return {
            agentName: name?.trim(),
            task: taskParts.join("::").trim(),
          };
        })
        .filter((t) => t.agentName && t.task);

      if (tasks.length === 0) {
        return {
          output: chalk.red(
            'Usage: /agents parallel name1::"task 1" | name2::"task 2"',
          ),
        };
      }

      console.log(
        chalk.gray(`\nRunning ${tasks.length} subagent(s) in parallel...`),
      );
      const results = await orchestrator.runParallel(
        tasks as { agentName: string; task: string }[],
      );
      return {
        output: results
          .map(
            (r) =>
              `${chalk.bold(`[${r.agentName}]`)} ${r.success ? chalk.green("done") : chalk.red("failed")}\n${r.result}`,
          )
          .join("\n\n"),
      };
    }

    return { output: chalk.red(`Unknown /agents subcommand: ${sub}`) };
  },
};
