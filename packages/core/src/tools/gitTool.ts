import { exec } from "node:child_process";
import type { Tool, ToolContext, ToolResult } from "./ToolRegistry.js";

export const gitTool: Tool = {
  schema: {
    name: "git",
    description: "Run a git command (status, diff, log, branch, etc.) in the project directory.",
    inputSchema: {
      type: "object",
      properties: {
        args: { type: "string", description: "Arguments to pass to git, e.g. \"status --short\" or \"diff HEAD~1\"" },
      },
      required: ["args"],
    },
    permissionKey: "git",
  },
  async execute(args, ctx: ToolContext): Promise<ToolResult> {
    const gitArgs = String(args.args || "status");
    return new Promise((resolve) => {
      exec(`git ${gitArgs}`, { cwd: ctx.cwd, timeout: 60_000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join("\n").trim();
        if (error) {
          resolve({ success: false, output, error: error.message });
        } else {
          resolve({ success: true, output });
        }
      });
    });
  },
};
