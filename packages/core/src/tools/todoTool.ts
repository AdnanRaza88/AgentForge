import type { Tool, ToolContext, ToolResult } from "./ToolRegistry.js";

export interface TodoItem {
  text: string;
  status: "pending" | "done";
}

export class TodoStore {
  items: TodoItem[] = [];

  constructor(initial: TodoItem[] = []) {
    this.items = [...initial];
  }

  add(text: string): void {
    this.items.push({ text, status: "pending" });
  }

  markDone(index: number): void {
    if (this.items[index]) this.items[index].status = "done";
  }

  write(items: TodoItem[]): void {
    this.items = items;
  }
}

export function createTodoTool(store: TodoStore): Tool {
  return {
    schema: {
      name: "todo_add",
      description: "Add a new todo item to the current session todo list.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
      permissionKey: "todo",
    },
    async execute(args): Promise<ToolResult> {
      const text = String(args.text || "");
      store.add(text);
      return { success: true, output: `Added todo: ${text}` };
    },
  };
}

export function createTodoUpdateTool(store: TodoStore): Tool {
  return {
    schema: {
      name: "todo_update",
      description: "Mark a todo item as done by its 1-based index.",
      inputSchema: {
        type: "object",
        properties: { index: { type: "number" } },
        required: ["index"],
      },
      permissionKey: "todo",
    },
    async execute(args): Promise<ToolResult> {
      const idx = Number(args.index) - 1;
      store.markDone(idx);
      return { success: true, output: `Marked todo #${idx + 1} as done` };
    },
  };
}
