import type { ToolContext } from "../tools/ToolRegistry.js";
import { runBash } from "../tools/bashTool.js";

export type HookEvent = "BeforeCommand" | "AfterFileSave" | "AfterResponse" | "BeforeToolCall" | "AfterToolCall";

export interface HookPayload {
  event: HookEvent;
  toolName?: string;
  file?: string;
  [key: string]: unknown;
}

/**
 * Event-based triggers (docs feature #15). Hooks are shell command templates
 * from settings.hooks[event], with `{file}` / `{tool}` placeholders
 * substituted from the payload. They run best-effort — a failing hook logs
 * a warning but never blocks the agent loop.
 */
export class HookEngine {
  constructor(
    private hooks: Record<string, string[]>,
    private ctx: ToolContext,
  ) {}

  async fire(payload: HookPayload): Promise<void> {
    const commands = this.hooks[payload.event];
    if (!commands || commands.length === 0) return;

    for (const template of commands) {
      const command = template
        .replace("{file}", payload.file ?? "")
        .replace("{tool}", payload.toolName ?? "");
      try {
        const result = await runBash(command, this.ctx);
        if (!result.success) {
          console.warn(`[hook:${payload.event}] "${command}" failed: ${result.error}`);
        }
      } catch (err) {
        console.warn(`[hook:${payload.event}] "${command}" threw: ${(err as Error).message}`);
      }
    }
  }
}
