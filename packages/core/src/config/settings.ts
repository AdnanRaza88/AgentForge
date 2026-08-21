import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const GLOBAL_DIR = path.join(os.homedir(), ".agentforge");

export function projectAgentforgeDir(cwd: string): string {
  return path.join(cwd, ".agentforge");
}

export interface Settings {
  provider: string;
  model: string;
  thinking: "on" | "off";
  permissions: Record<string, "allow" | "ask" | "deny">;
  hooks: Record<string, string[]>;
  mcpServers: Record<string, { command: string; args?: string[] }>;
  rules: string[];
}

const DEFAULTS: Settings = {
  provider: "openai",
  model: "gpt-4o",
  thinking: "off",
  permissions: {
    bash: "ask",
    write_file: "ask",
    delete_file: "ask",
    git: "ask",
    "*": "ask",
  },
  hooks: {},
  mcpServers: {},
  rules: [],
};

function loadJson(file: string): Partial<Settings> {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}

export function loadSettings(cwd: string): Settings {
  const globalFile = path.join(GLOBAL_DIR, "settings.json");
  const projectFile = path.join(projectAgentforgeDir(cwd), "settings.json");
  return {
    ...DEFAULTS,
    ...loadJson(globalFile),
    ...loadJson(projectFile),
  };
}

export function saveProjectSettings(cwd: string, partial: Partial<Settings>): void {
  const dir = projectAgentforgeDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "settings.json");
  const current = loadJson(file);
  fs.writeFileSync(file, JSON.stringify({ ...current, ...partial }, null, 2));
}
