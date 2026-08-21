import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Tool } from "../tools/ToolRegistry.js";
import type { CustomCommand } from "../skills/commandLoader.js";

export interface PluginContext {
  registerTool(tool: Tool): void;
  registerCommand(cmd: CustomCommand): void;
  cwd: string;
}

export interface AgentForgePlugin {
  name: string;
  version?: string;
  activate(ctx: PluginContext): void | Promise<void>;
}

/**
 * Loads plugins from the project `plugins/` directory and the global
 * `~/.agentforge/plugins/` directory. Plugins are expected to be already
 * compiled to ESM `.js` (or pure JS) that default-export an AgentForgePlugin.
 */
export class PluginLoader {
  constructor(private cwd: string) {}

  async loadAll(ctx: PluginContext): Promise<string[]> {
    const loaded: string[] = [];
    const dirs = [
      path.join(this.cwd, "plugins"),
      path.join(process.env.HOME || process.env.USERPROFILE || "", ".agentforge", "plugins"),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        const pluginDir = path.join(dir, entry);
        if (!fs.statSync(pluginDir).isDirectory()) continue;
        const indexJs = path.join(pluginDir, "index.js");
        if (!fs.existsSync(indexJs)) continue;
        try {
          const mod = await import(pathToFileURL(indexJs).href);
          const plugin: AgentForgePlugin = mod.default ?? mod;
          if (plugin && typeof plugin.activate === "function") {
            await plugin.activate(ctx);
            loaded.push(plugin.name || entry);
          }
        } catch (err) {
          console.warn(`[PluginLoader] Failed to load ${entry}: ${(err as Error).message}`);
        }
      }
    }
    return loaded;
  }
}
