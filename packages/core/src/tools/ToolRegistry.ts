import type { ToolSchema } from "../providers/types.js";

export interface ToolContext {
  cwd: string;
  onTerminalOutput?: (output: string) => void;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface Tool {
  schema: ToolSchema;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.schema.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): ToolSchema[] {
    return [...this.tools.values()].map((t) => t.schema);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}
