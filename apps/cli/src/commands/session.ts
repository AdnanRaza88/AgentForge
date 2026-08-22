import chalk from "chalk";
import {
  SessionStore,
  compactSession,
  contextUsagePercent,
} from "@agentforge/core";
import type { SlashCommand } from "./types.js";

export const resumeCommand: SlashCommand = {
  name: "resume",
  description: "List past sessions, or resume one by id: /resume <sessionId>",
  async run(args, state) {
    const id = args.trim();
    if (!id) {
      const sessions = SessionStore.list().slice(0, 10);
      if (sessions.length === 0)
        return { output: chalk.gray("No past sessions found.") };
      const lines = sessions.map(
        (s) =>
          `${s.id}  ${chalk.gray(s.updatedAt)}  ${s.name ? chalk.cyan(s.name) : ""}  ${chalk.gray(s.cwd)}`,
      );
      return {
        output:
          chalk.bold("Recent sessions (use /resume <id>):\n") +
          lines.join("\n"),
      };
    }

    const session = SessionStore.load(id);
    if (!session)
      return { output: chalk.red(`No session found with id ${id}`) };

    state.session.messages = session.messages;
    state.session.todos = session.todos;
    state.todoStore.write(
      session.todos.map((t) => ({ text: t.text, status: t.status })),
    );
    state.session.mode = session.mode;
    state.agentLoop.setMode(session.mode);

    return {
      output: chalk.green(
        `Resumed session ${id}${session.name ? ` ("${session.name}")` : ""} (${session.messages.length} messages).`,
      ),
    };
  },
};

export const renameCommand: SlashCommand = {
  name: "rename",
  description: "Assign a custom name to the current session: /rename <name>",
  async run(args, state) {
    const name = args.trim();
    if (!name) return { output: chalk.red("Usage: /rename <name>") };
    SessionStore.rename(state.session, name);
    return { output: chalk.green(`Session renamed to "${name}".`) };
  },
};

export const compactCommand: SlashCommand = {
  name: "compact",
  description:
    "Manually summarize/compact the conversation history to free up context window",
  async run(_args, state) {
    const before = contextUsagePercent(state.session);
    const provider = (await import("@agentforge/core")).createProvider(
      state.settings.provider as any,
    );
    const compacted = await compactSession(state.session, provider);
    state.session.messages = compacted.messages;
    const after = contextUsagePercent(state.session);
    return {
      output: chalk.green(
        `Compacted conversation history: ${before}% → ${after}% of context window used.`,
      ),
    };
  },
};
