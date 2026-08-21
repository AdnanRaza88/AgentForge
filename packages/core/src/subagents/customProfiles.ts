/**
 * Load user-defined subagent profiles from:
 *   - <project>/.agentforge/subagents/*.json
 *   - ~/.agentforge/subagents/*.json
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { SubagentProfile } from "./profiles.js";

function readProfileDir(dir: string): SubagentProfile[] {
  if (!fs.existsSync(dir)) return [];
  const out: SubagentProfile[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      if (!raw.name || !raw.systemAddon) continue;
      out.push({
        name: String(raw.name).toLowerCase().replace(/\s+/g, "-"),
        label: String(raw.label || raw.name),
        systemAddon: String(raw.systemAddon),
        maxToolCalls: Number(raw.maxToolCalls) || 20,
        readOnly: Boolean(raw.readOnly),
        category: "custom",
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

export function loadCustomProfiles(cwd: string): SubagentProfile[] {
  const globalDir = path.join(os.homedir(), ".agentforge", "subagents");
  const projectDir = path.join(cwd, ".agentforge", "subagents");
  const byName = new Map<string, SubagentProfile>();
  for (const p of [...readProfileDir(globalDir), ...readProfileDir(projectDir)]) {
    byName.set(p.name, p);
  }
  return [...byName.values()];
}

export function saveCustomProfile(
  cwd: string,
  profile: Omit<SubagentProfile, "category"> & { category?: string },
): string {
  const dir = path.join(cwd, ".agentforge", "subagents");
  fs.mkdirSync(dir, { recursive: true });
  const name = profile.name.toLowerCase().replace(/\s+/g, "-");
  const file = path.join(dir, `${name}.json`);
  const data = {
    name,
    label: profile.label || name,
    systemAddon: profile.systemAddon,
    maxToolCalls: profile.maxToolCalls ?? 20,
    readOnly: Boolean(profile.readOnly),
  };
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}
