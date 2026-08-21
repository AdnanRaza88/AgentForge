import { exec } from "node:child_process";
import type { Tool, ToolContext, ToolResult } from "./ToolRegistry.js";

export const bashTool: Tool = {
  schema: {
    name: "bash",
    description: "Run a shell command in the project directory and return stdout/stderr.",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string", description: "Shell command to execute" } },
      required: ["command"],
    },
    permissionKey: "bash",
  },
  async execute(args, ctx: ToolContext): Promise<ToolResult> {
    const command = String(args.command);
    return runBash(command, ctx);
  },
};

/** Shared executor also used directly by CLI Bash Mode (Shift+!) */
export function runBash(command: string, ctx: ToolContext): Promise<ToolResult> {
  return new Promise((resolve) => {
    exec(command, { cwd: ctx.cwd, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const output = [stdout, stderr].filter(Boolean).join("\n").trim();
      ctx.onTerminalOutput?.(output);
      if (error && error.killed) {
        resolve({ success: false, output, error: "Command timed out after 120s." });
      } else if (error) {
        resolve({ success: false, output, error: error.message });
      } else {
        resolve({ success: true, output });
      }
    });
  });
}
