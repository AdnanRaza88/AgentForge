import chalk from "chalk";
import type { SlashCommand } from "./types.js";

export const todoCommand: SlashCommand = {
  name: "todo",
  description: "List or manage session todos: /todo  |  /todo add <text>  |  /todo done <index>",
  async run(args, state) {
    const parts = args.trim().split(/\s+/);
    const sub = parts[0];

    if (!sub) {
      const items = state.todoStore.items;
      if (items.length === 0) return { output: chalk.gray("No todos yet. Use /todo add <text>") };
      const lines = items.map((t, i) => {
        const mark = t.status === "done" ? chalk.green("✓") : chalk.yellow("○");
        return `  ${i + 1}. ${mark} ${t.text}`;
      });
      return { output: chalk.bold("Todos:\n") + lines.join("\n") };
    }

    if (sub === "add") {
      const text = parts.slice(1).join(" ");
      if (!text) return { output: chalk.red("Usage: /todo add <text>") };
      state.todoStore.add(text);
      state.session.todos = state.todoStore.items;
      return { output: chalk.green(`Added todo: ${text}`) };
    }

    if (sub === "done") {
      const idx = parseInt(parts[1], 10) - 1;
      if (isNaN(idx)) return { output: chalk.red("Usage: /todo done <index>") };
      state.todoStore.markDone(idx);
      state.session.todos = state.todoStore.items;
      return { output: chalk.green(`Marked todo #${idx + 1} done.`) };
    }

    return { output: chalk.red(`Unknown /todo subcommand: ${sub}`) };
  },
};
