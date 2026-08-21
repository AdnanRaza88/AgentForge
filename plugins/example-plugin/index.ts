/**
 * Example AgentForge plugin (source form — compile to index.js with
 * `tsc` before AgentForge's PluginLoader will pick it up, or just hand-edit
 * the compiled index.js directly for quick experiments).
 *
 * Demonstrates: registering a new tool AND a new slash command from a
 * single plugin, per docs/04-FEATURES-SPEC.md #16.
 */
import type { AgentForgePlugin, PluginContext } from "@agentforge/core";

const plugin: AgentForgePlugin = {
  name: "example-plugin",
  version: "0.1.0",
  activate(ctx: PluginContext) {
    ctx.registerTool({
      schema: {
        name: "word_count",
        description: "Counts words in a given piece of text.",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
        permissionKey: "word_count",
      },
      async execute(args) {
        const text = String(args.text ?? "");
        const count = text.trim().split(/\s+/).filter(Boolean).length;
        return { success: true, output: `${count} words` };
      },
    });

    ctx.registerCommand({
      name: "example",
      template: "This is an example custom command from a plugin. You typed: {{args}}",
      source: "project",
    });
  },
};

export default plugin;
