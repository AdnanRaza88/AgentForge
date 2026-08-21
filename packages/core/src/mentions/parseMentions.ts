import fs from "node:fs";
import path from "node:path";

export interface MentionContext {
  type: "file" | "folder" | "git" | "terminal";
  path?: string;
  content: string;
}

/**
 * Parses @file, @folder/, @git, @terminal mentions from user input and
 * expands them into context blocks that get prepended to the user message.
 */
export function parseMentions(input: string, cwd: string, terminalBuffer: string[] = []): {
  cleaned: string;
  contexts: MentionContext[];
} {
  const contexts: MentionContext[] = [];
  let cleaned = input;

  // @file path
  const fileRe = /@([\w./\\-]+\.[\w]+)/g;
  cleaned = cleaned.replace(fileRe, (match, filePath) => {
    const full = path.resolve(cwd, filePath);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      try {
        const content = fs.readFileSync(full, "utf-8").slice(0, 50_000);
        contexts.push({ type: "file", path: filePath, content });
        return `[file:${filePath}]`;
      } catch {}
    }
    return match;
  });

  // @folder/
  const folderRe = /@([\w./\\-]+\/)/g;
  cleaned = cleaned.replace(folderRe, (match, folderPath) => {
    const full = path.resolve(cwd, folderPath);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      try {
        const listing = fs.readdirSync(full).slice(0, 100).join("\n");
        contexts.push({ type: "folder", path: folderPath, content: listing });
        return `[folder:${folderPath}]`;
      } catch {}
    }
    return match;
  });

  if (/@git\b/.test(cleaned)) {
    contexts.push({ type: "git", content: "(git context requested — use git tool for details)" });
    cleaned = cleaned.replace(/@git\b/g, "[git]");
  }

  if (/@terminal\b/.test(cleaned)) {
    contexts.push({ type: "terminal", content: terminalBuffer.slice(-50).join("\n") });
    cleaned = cleaned.replace(/@terminal\b/g, "[terminal]");
  }

  return { cleaned, contexts };
}

export function formatMentionContexts(contexts: MentionContext[]): string {
  if (!contexts.length) return "";
  return contexts
    .map((c) => {
      if (c.type === "file") return `--- File: ${c.path} ---\n${c.content}`;
      if (c.type === "folder") return `--- Folder listing: ${c.path} ---\n${c.content}`;
      if (c.type === "git") return `--- Git context ---\n${c.content}`;
      if (c.type === "terminal") return `--- Recent terminal output ---\n${c.content}`;
      return "";
    })
    .join("\n\n");
}
