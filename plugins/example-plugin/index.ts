import type { Plugin } from "@agentforge/core";

const plugin: Plugin = {
  name: "example-plugin",
  version: "0.1.0",
  register(api) {
    api.registerTool({
      schema: {
        name: "word_count",
        description: "Count words in a string",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
      },
      async execute(args) {
        const text = String(args.text || "");
        const count = text.trim() ? text.trim().split(/\s+/).length : 0;
        return { success: true, output: String(count) };
      },
    });
  },
};

export default plugin;
