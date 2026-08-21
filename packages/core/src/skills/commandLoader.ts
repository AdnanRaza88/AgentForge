import fs from "node:fs";
import path from "node:path";
import { projectAgentforgeDir, GLOBAL_DIR } from "../config/settings.js";

export interface CustomCommand {
  /** the slash command name, e.g. "deploy" for /deploy */
  name: string;
  /** prompt template; supports {{args}} placeholder for anything typed after the command */
  template: string;
  source: "project" | "global";
}

/**
 * Custom Slash Commands (docs feature #2b): any `.md` file in
 * `.agentforge/commands/` becomes `/<filename>`. Its content is the prompt
 * template sent to the agent, with `{{args}}` substituted for whatever the
 * user typed after the command name.
 */
export class CommandLoader {
  constructor(private cwd: string) {}

  loadAll(): CustomCommand[] {
    const projectDir = path.join(projectAgentforgeDir(this.cwd), "commands");
    const globalDir = path.join(GLOBAL_DIR, "commands");
    return [...loadFromDir(projectDir, "project"), ...loadFromDir(globalDir, "global")];
  }
}

function loadFromDir(dir: string, source: "project" | "global"): CustomCommand[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      name: path.basename(f, ".md"),
      template: fs.readFileSync(path.join(dir, f), "utf-8"),
      source,
    }));
}

export function renderCommandTemplate(template: string, args: string): string {
  return template.replaceAll("{{args}}", args);
}
