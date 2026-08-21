import chalk from "chalk";
import { saveProjectSettings, AVAILABLE_PROVIDERS, createProvider } from "@agentforge/core";
import type { SlashCommand } from "./types.js";

export const configCommand: SlashCommand = {
  name: "config",
  description:
    "View or change model/provider settings. Usage: /config  |  /config provider <id>  |  /config model <name>  |  /config thinking <on|off>",
  async run(args, state) {
    const parts = args.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      const providerLines = AVAILABLE_PROVIDERS.map(
        (p) => `  ${p.id === state.settings.provider ? chalk.green("●") : " "} ${p.id}${p.free ? chalk.gray(" (free/local option)") : ""}`,
      ).join("\n");
      return {
        output:
          chalk.bold("Current config:\n") +
          `  provider: ${state.settings.provider}\n  model: ${state.settings.model}\n  thinking: ${state.settings.thinking}\n\n` +
          chalk.bold("Available providers:\n") +
          providerLines,
      };
    }

    const [key, ...rest] = parts;
    const value = rest.join(" ");

    if (key === "provider") {
      try {
        const newProvider = createProvider(value as any);
        state.settings.provider = value;
        saveProjectSettings(state.cwd, { provider: value });
        return { output: chalk.green(`Provider switched to "${newProvider.label}". Restart or continue — new turns will use it.`) };
      } catch (err) {
        return { output: chalk.red((err as Error).message) };
      }
    }

    if (key === "model") {
      state.settings.model = value;
      saveProjectSettings(state.cwd, { model: value });
      return { output: chalk.green(`Model set to "${value}".`) };
    }

    if (key === "thinking") {
      if (value !== "on" && value !== "off") return { output: chalk.red("Usage: /config thinking <on|off>") };
      state.settings.thinking = value;
      saveProjectSettings(state.cwd, { thinking: value });
      return { output: chalk.green(`Thinking set to "${value}".`) };
    }

    return { output: chalk.red(`Unknown config key: ${key}`) };
  },
};

export const permissionCommand: SlashCommand = {
  name: "permission",
  description: "View or set tool permissions. Usage: /permission  |  /permission <tool> <allow|ask|deny>",
  async run(args, state) {
    const parts = args.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      const lines = Object.entries(state.settings.permissions).map(([k, v]) => `  ${k}: ${colorForDecision(v)}`);
      return { output: chalk.bold("Current permissions:\n") + lines.join("\n") };
    }

    const [tool, decision] = parts;
    if (!["allow", "ask", "deny"].includes(decision)) {
      return { output: chalk.red("Usage: /permission <tool> <allow|ask|deny>") };
    }

    state.permissions.updatePermission(tool, decision as "allow" | "ask" | "deny");
    saveProjectSettings(state.cwd, { permissions: { ...state.settings.permissions, [tool]: decision } as any });
    return { output: chalk.green(`Permission for "${tool}" set to "${decision}".`) };
  },
};

function colorForDecision(d: string): string {
  if (d === "allow") return chalk.green(d);
  if (d === "deny") return chalk.red(d);
  return chalk.yellow(d);
}
