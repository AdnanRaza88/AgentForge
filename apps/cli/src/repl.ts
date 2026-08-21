import readline from "node:readline";
import chalk from "chalk";
import {
  loadSettings,
  createProvider,
  MemoryManager,
  ToolRegistry,
  PermissionEngine,
  HookEngine,
  AgentLoop,
  SessionStore,
  TodoStore,
  createTodoTool,
  createTodoUpdateTool,
  readFileTool,
  writeFileTool,
  deleteFileTool,
  listDirTool,
  bashTool,
  runBash,
  gitTool,
  McpClientManager,
  type Session,
  type ProviderId,
  type Settings,
  type AgentMode,
} from "@agentforge/core";
import { registerAllCommands } from "./commands/index.js";
import type { SlashCommand } from "./commands/types.js";

export interface ReplState {
  cwd: string;
  settings: Settings;
  session: Session;
  memory: MemoryManager;
  tools: ToolRegistry;
  permissions: PermissionEngine;
  agentLoop: AgentLoop;
  todoStore: TodoStore;
  mcp: McpClientManager;
  rl: readline.Interface;
}

export interface StartReplOptions {
  cwd: string;
  resumeSessionId?: string;
  initialMode: AgentMode;
}

export async function startRepl(opts: StartReplOptions): Promise<void> {
  const { cwd } = opts;
  const settings = loadSettings(cwd);
  const memory = new MemoryManager(cwd);

  console.log(chalk.bold.cyan("\n  AgentForge") + chalk.gray(" — open source terminal AI coding agent\n"));

  let provider;
  try {
    provider = createProvider(settings.provider as ProviderId);
  } catch (err) {
    console.log(chalk.red(`Provider error: ${(err as Error).message}`));
    console.log(chalk.gray("Set your API key in .env, or run /config to pick a different provider (e.g. ollama needs no key).\n"));
    process.exit(1);
  }

  const session: Session =
    (opts.resumeSessionId && SessionStore.load(opts.resumeSessionId)) ||
    SessionStore.create(cwd, settings.provider, settings.model, opts.initialMode);

  if (opts.resumeSessionId) {
    console.log(chalk.gray(`Resumed session ${session.id}${session.name ? ` ("${session.name}")` : ""}\n`));
  }

  const todoStore = new TodoStore(session.todos);
  const tools = new ToolRegistry();
  [readFileTool, writeFileTool, deleteFileTool, listDirTool, bashTool, gitTool, createTodoTool(todoStore), createTodoUpdateTool(todoStore)].forEach(
    (t) => tools.register(t),
  );

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const permissions = new PermissionEngine(settings, async (req) => {
    return askYesNo(rl, `\n${chalk.yellow("Permission requested:")} ${req.description}\nAllow? (y/N) `);
  });

  const hooks = new HookEngine(settings.hooks, { cwd });

  const mcp = new McpClientManager();
  if (Object.keys(settings.mcpServers).length > 0) {
    console.log(chalk.gray("Connecting MCP servers..."));
    const mcpTools = await mcp.connectAll(settings.mcpServers);
    mcpTools.forEach((t) => tools.register(t));
    if (mcpTools.length) console.log(chalk.gray(`  → ${mcpTools.length} MCP tool(s) available\n`));
  }

  const agentLoop = new AgentLoop({
    cwd,
    provider,
    model: settings.model,
    tools,
    permissions,
    hooks,
    mode: session.mode,
    ignorePatterns: memory.loadIgnorePatterns(),
  });

  const state: ReplState = { cwd, settings, session, memory, tools, permissions, agentLoop, todoStore, mcp, rl };
  const commands = registerAllCommands();

  printModeHint(state);
  rl.setPrompt(promptFor(state));
  rl.prompt();

  rl.on("line", async (lineRaw) => {
    const line = lineRaw.trim();

    if (!line) {
      rl.prompt();
      return;
    }

    if (line.startsWith("!")) {
      const command = line.slice(1).trim();
      console.log(chalk.gray(`$ ${command}`));
      const result = await runBash(command, { cwd, onTerminalOutput: (o) => agentLoop.recordTerminalOutput(o) });
      console.log(result.output || chalk.gray("(no output)"));
      if (result.error) console.log(chalk.red(result.error));
      rl.prompt();
      return;
    }

    if (line === "tab" || line === "/toggle-mode") {
      toggleMode(state);
      rl.prompt();
      return;
    }

    if (line.startsWith("/")) {
      const [cmdName, ...rest] = line.slice(1).split(" ");
      const cmd = commands.find((c) => c.name === cmdName);
      if (cmd) {
        const result = await cmd.run(rest.join(" "), state);
        if (result.output) console.log(result.output);
        if (result.exit) {
          rl.close();
          return;
        }
      } else {
        console.log(chalk.red(`Unknown command: /${cmdName}. Type /help for a list.`));
      }
      rl.prompt();
      return;
    }

    await handleUserMessage(state, line);
    rl.prompt();
  });

  rl.on("close", () => {
    SessionStore.save(state.session);
    console.log(chalk.gray("\nSession saved. Resume anytime with `agentforge -r`. Goodbye!\n"));
    mcp.disconnectAll().finally(() => process.exit(0));
  });
}

async function handleUserMessage(state: ReplState, input: string): Promise<void> {
  const { session, agentLoop } = state;
  process.stdout.write(chalk.gray("\nthinking...\n"));

  try {
    const result = await agentLoop.runTurn(input, session.messages, buildSystemPrompt(state));
    session.messages.push(...result.messages);
    session.todos = state.todoStore.items;
    SessionStore.save(session);

    console.log(`\n${chalk.green("agentforge")} ${result.text}\n`);
  } catch (err) {
    console.log(chalk.red(`\nError: ${(err as Error).message}\n`));
  }
}

function buildSystemPrompt(state: ReplState): string {
  const memoryBlock = state.memory.buildCombinedMemory();
  const rules = state.settings.rules.length ? `\n\nProject rules:\n- ${state.settings.rules.join("\n- ")}` : "";
  return (
    "You are AgentForge, an open-source terminal AI coding agent. You read code, plan, write code, and run commands to help the developer. Be precise and concise." +
    (memoryBlock ? `\n\n${memoryBlock}` : "") +
    rules
  );
}

function toggleMode(state: ReplState): void {
  const next = state.agentLoop.getMode() === "agent" ? "plan" : "agent";
  state.agentLoop.setMode(next);
  state.session.mode = next;
  printModeHint(state);
  state.rl.setPrompt(promptFor(state));
}

function printModeHint(state: ReplState): void {
  const mode = state.agentLoop.getMode();
  const label = mode === "plan" ? chalk.yellow("PLAN MODE (read-only)") : chalk.green("AGENT MODE (executes)");
  console.log(chalk.gray(`Mode: ${label}  ·  type "tab" to toggle  ·  "!<cmd>" for bash mode  ·  /help for commands`));
}

function promptFor(state: ReplState): string {
  const mode = state.agentLoop.getMode() === "plan" ? chalk.yellow("plan") : chalk.green("agent");
  return `${chalk.bold("agentforge")} [${mode}] > `;
}

function askYesNo(rl: readline.Interface, question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase().startsWith("y"));
    });
  });
}

export { registerAllCommands };
export type { SlashCommand };
