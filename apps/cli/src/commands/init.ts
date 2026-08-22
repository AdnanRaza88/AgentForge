import chalk from "chalk";
import { scanProject } from "@agentforge/core";
import type { SlashCommand } from "./types.js";

export const initCommand: SlashCommand = {
  name: "init",
  description:
    "Scan the project and generate .agentforge/AGENTFORGE.md project memory",
  async run(_args, state) {
    if (state.memory.projectMemoryExists()) {
      return {
        output: chalk.yellow(
          "AGENTFORGE.md already exists for this project. Edit it directly, or delete it and run /init again to regenerate.",
        ),
      };
    }

    const scan = scanProject(state.cwd);
    const memoryPath = await state.memory.initProjectMemory(scan);

    return {
      output:
        chalk.green(`✓ Created ${memoryPath}\n`) +
        chalk.gray(
          `  Detected: ${scan.languages.join(", ") || "no specific language signals"}${
            scan.frameworks.length ? ` · ${scan.frameworks.join(", ")}` : ""
          }\n` +
            `  Also scaffolded .agentforge/{commands,skills,agents}/ and .agentforgeignore\n` +
            `  Edit AGENTFORGE.md to add architecture notes, style rules, and hard rules.`,
        ),
    };
  },
};
