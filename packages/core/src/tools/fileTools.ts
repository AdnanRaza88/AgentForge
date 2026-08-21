import fs from "node:fs";
import path from "node:path";
import type { Tool, ToolContext, ToolResult } from "./ToolRegistry.js";

export const readFileTool: Tool = {
  schema: {
    name: "read_file",
    description: "Read the contents of a file relative to the project root.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
    permissionKey: "read_file",
  },
  async execute(args, ctx): Promise<ToolResult> {
    const full = path.resolve(ctx.cwd, String(args.path));
    if (!full.startsWith(ctx.cwd)) return { success: false, output: "", error: "Path escapes project root" };
    if (!fs.existsSync(full)) return { success: false, output: "", error: "File not found" };
    const content = fs.readFileSync(full, "utf-8");
    return { success: true, output: content.slice(0, 100_000) };
  },
};

export const writeFileTool: Tool = {
  schema: {
    name: "write_file",
    description: "Write or overwrite a file relative to the project root.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
    permissionKey: "write_file",
  },
  async execute(args, ctx): Promise<ToolResult> {
    const full = path.resolve(ctx.cwd, String(args.path));
    if (!full.startsWith(ctx.cwd)) return { success: false, output: "", error: "Path escapes project root" };
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, String(args.content));
    return { success: true, output: `Wrote ${args.path}` };
  },
};

export const deleteFileTool: Tool = {
  schema: {
    name: "delete_file",
    description: "Delete a file relative to the project root.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
    permissionKey: "delete_file",
  },
  async execute(args, ctx): Promise<ToolResult> {
    const full = path.resolve(ctx.cwd, String(args.path));
    if (!full.startsWith(ctx.cwd)) return { success: false, output: "", error: "Path escapes project root" };
    if (!fs.existsSync(full)) return { success: false, output: "", error: "File not found" };
    fs.unlinkSync(full);
    return { success: true, output: `Deleted ${args.path}` };
  },
};

export const listDirTool: Tool = {
  schema: {
    name: "list_dir",
    description: "List files and directories in a path relative to the project root.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Directory path (default .)" } },
    },
    permissionKey: "list_dir",
  },
  async execute(args, ctx): Promise<ToolResult> {
    const rel = String(args.path || ".");
    const full = path.resolve(ctx.cwd, rel);
    if (!full.startsWith(ctx.cwd)) return { success: false, output: "", error: "Path escapes project root" };
    if (!fs.existsSync(full)) return { success: false, output: "", error: "Directory not found" };
    const entries = fs.readdirSync(full, { withFileTypes: true }).map((e) => (e.isDirectory() ? e.name + "/" : e.name));
    return { success: true, output: entries.join("\n") };
  },
};
