import fs from "node:fs";
import path from "node:path";
import { projectAgentforgeDir, GLOBAL_DIR } from "../config/settings.js";

export interface Skill {
  name: string;
  description: string;
  keywords: string[];
  body: string;
  source: "project" | "global";
}

/**
 * Skills are markdown files with YAML frontmatter under skills/ or
 * .agentforge/skills/. They inject specialized guidance into the system
 * prompt when their keywords match the user message.
 */
export class SkillLoader {
  constructor(private cwd: string) {}

  loadAll(): Skill[] {
    const dirs = [
      path.join(this.cwd, "skills"),
      path.join(projectAgentforgeDir(this.cwd), "skills"),
      path.join(GLOBAL_DIR, "skills"),
    ];
    const skills: Skill[] = [];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        const skillPath = path.join(dir, entry, "SKILL.md");
        if (!fs.existsSync(skillPath)) continue;
        try {
          skills.push(parseSkill(skillPath, dir.includes(GLOBAL_DIR) ? "global" : "project"));
        } catch {}
      }
    }
    return skills;
  }

  match(userMessage: string): Skill[] {
    const lower = userMessage.toLowerCase();
    return this.loadAll().filter((s) =>
      s.keywords.some((k) => lower.includes(k.toLowerCase())),
    );
  }
}

function parseSkill(filePath: string, source: "project" | "global"): Skill {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { name: path.basename(path.dirname(filePath)), description: "", keywords: [], body: raw, source };
  }
  const front = match[1];
  const body = match[2].trim();
  const name = (front.match(/name:\s*(.+)/) || [])[1]?.trim() || path.basename(path.dirname(filePath));
  const description = (front.match(/description:\s*(.+)/) || [])[1]?.trim() || "";
  const kwMatch = front.match(/keywords:\s*\[(.*?)\]/s);
  const keywords = kwMatch
    ? kwMatch[1].split(",").map((k) => k.trim().replace(/["\']/g, ""))
    : [];
  return { name, description, keywords, body, source };
}
