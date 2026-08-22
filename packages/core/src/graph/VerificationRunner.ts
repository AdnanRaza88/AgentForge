import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ToolRegistry, ToolContext } from "../tools/ToolRegistry.js";

export interface VerifyResult {
  command: string;
  success: boolean;
  output: string;
}

/**
 * Runs verification commands for `kind: "verification"` graph nodes.
 * Built-ins auto-detect from project files; custom commands run via bash.
 */
export class VerificationRunner {
  constructor(
    private cwd: string,
    private tools: ToolRegistry,
  ) {}

  async run(commands: string[]): Promise<{ success: boolean; results: VerifyResult[] }> {
    const results: VerifyResult[] = [];
    let allOk = true;

    for (const cmd of commands) {
      const resolved = this.resolveCommand(cmd);
      const result = await this.execute(resolved);
      results.push({ command: cmd, success: result.success, output: result.output });
      if (!result.success) allOk = false;
    }

    return { success: allOk, results };
  }

  private resolveCommand(name: string): string {
    const n = name.toLowerCase().trim();
    if (n === "typecheck" || n === "tsc") {
      if (existsSync(join(this.cwd, "tsconfig.json"))) {
        return "npx tsc --noEmit";
      }
      return "echo 'no tsconfig — typecheck skipped' && true";
    }
    if (n === "lint") {
      if (existsSync(join(this.cwd, "package.json"))) {
        const pkg = safeReadPkg(this.cwd);
        if (pkg?.scripts?.lint) return "npm run lint";
        if (pkg?.devDependencies?.eslint || pkg?.dependencies?.eslint) {
          return "npx eslint . --max-warnings=0";
        }
      }
      return "echo 'no lint script — skipped' && true";
    }
    if (n === "test") {
      if (existsSync(join(this.cwd, "package.json"))) {
        const pkg = safeReadPkg(this.cwd);
        if (pkg?.scripts?.test) return "npm test -- --run 2>/dev/null || npm test";
      }
      if (existsSync(join(this.cwd, "pytest.ini")) || existsSync(join(this.cwd, "pyproject.toml"))) {
        return "pytest -q";
      }
      return "echo 'no test script — skipped' && true";
    }
    if (n === "build") {
      if (existsSync(join(this.cwd, "package.json"))) {
        const pkg = safeReadPkg(this.cwd);
        if (pkg?.scripts?.build) return "npm run build";
      }
      return "echo 'no build script — skipped' && true";
    }
    return name;
  }

  private async execute(command: string): Promise<{ success: boolean; output: string }> {
    const bash = this.tools.get("bash") ?? this.tools.get("run_terminal");
    if (!bash) {
      return { success: false, output: "No bash tool available for verification" };
    }
    const ctx: ToolContext = {
      cwd: this.cwd,
      onTerminalOutput: () => {},
    };
    try {
      const result = await bash.execute({ command }, ctx);
      return {
        success: result.success,
        output: result.success ? result.output : result.error || result.output,
      };
    } catch (err) {
      return { success: false, output: (err as Error).message };
    }
  }
}

function safeReadPkg(cwd: string): {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} | null {
  try {
    return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  } catch {
    return null;
  }
}
