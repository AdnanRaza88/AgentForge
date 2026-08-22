import type { ReplState } from "../repl.js";

export interface SlashCommand {
  name: string;
  description: string;
  run: (
    args: string,
    state: ReplState,
  ) => Promise<{ output?: string; exit?: boolean }>;
}
