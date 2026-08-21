import fs from "node:fs";
import path from "node:path";

export interface ProjectScan {
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  hasGit: boolean;
  rootFiles: string[];
}

/**
 * Lightweight static scan used by /init to seed AGENTFORGE.md.
 * Detects languages and popular frameworks from common config files.
 */
export function scanProject(cwd: string): ProjectScan {
  const rootFiles = fs.existsSync(cwd) ? fs.readdirSync(cwd) : [];
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  let packageManager: string | undefined;

  if (rootFiles.includes("package.json")) {
    languages.add("TypeScript/JavaScript");
    packageManager = rootFiles.includes("pnpm-lock.yaml")
      ? "pnpm"
      : rootFiles.includes("yarn.lock")
        ? "yarn"
        : "npm";
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.react) frameworks.add("React");
      if (deps.next) frameworks.add("Next.js");
      if (deps.vue) frameworks.add("Vue");
      if (deps["@angular/core"]) frameworks.add("Angular");
      if (deps.express) frameworks.add("Express");
      if (deps.fastify) frameworks.add("Fastify");
      if (deps.tauri || deps["@tauri-apps/api"]) frameworks.add("Tauri");
    } catch {}
  }
  if (rootFiles.includes("tsconfig.json")) languages.add("TypeScript");
  if (rootFiles.includes("Cargo.toml")) languages.add("Rust");
  if (rootFiles.includes("go.mod")) languages.add("Go");
  if (rootFiles.includes("pyproject.toml") || rootFiles.includes("requirements.txt")) languages.add("Python");
  if (rootFiles.includes("pom.xml") || rootFiles.includes("build.gradle")) languages.add("Java");

  return {
    languages: [...languages],
    frameworks: [...frameworks],
    packageManager,
    hasGit: rootFiles.includes(".git") || fs.existsSync(path.join(cwd, ".git")),
    rootFiles,
  };
}
