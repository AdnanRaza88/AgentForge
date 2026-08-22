import readline from "node:readline";
import chalk from "chalk";
import {
  loadSettings,
  createProvider,
  MemoryManager,
  ToolRegistry,
  PermissionEngine,
  HookEngine,
  AgentHarness,
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
  resolveMcpServers,
  compileSystemStack,
  SubagentOrchestrator,
  createSpawnSubagentTool,
  createRegisterSubagentTool,
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
  agentLoop: AgentHarness;
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

  console.log(
    chalk.bold.cyan("\n  AgentForge") +
      chalk.gray(" — open source terminal AI coding agent\n"),
  );

  let provider;
  try {
    const env = { ...process.env };
    if (settings.customBaseURL) env.CUSTOM_BASE_URL = settings.customBaseURL;
    if (settings.customProviderLabel)
      env.CUSTOM_PROVIDER_LABEL = settings.customProviderLabel;
    provider = createProvider(settings.provider as ProviderId, env);
  } catch (err) {
    console.log(chalk.red(`Provider error: ${(err as Error).message}`));
    console.log(
      chalk.gray(
        "Set your API key in .env, or run /config to pick a different provider (e.g. ollama needs no key).\n",
      ),
    );
    process.exit(1);
  }

  const session: Session =
    (opts.resumeSessionId && SessionStore.load(opts.resumeSessionId)) ||
    SessionStore.create(
      cwd,
      settings.provider,
      settings.model,
      opts.initialMode,
    );

  if (opts.resumeSessionId) {
    console.log(
      chalk.gray(
        `Resumed session ${session.id}${session.name ? ` ("${session.name}")` : ""}\n`,
      ),
    );
  }

  const todoStore = new TodoStore(session.todos);
  const tools = new ToolRegistry();
  [
    readFileTool,
    writeFileTool,
    deleteFileTool,
    listDirTool,
    bashTool,
    gitTool,
    createTodoTool(todoStore),
    createTodoUpdateTool(todoStore),
  ].forEach((t) => tools.register(t));

  const permissions = new PermissionEngine(settings.permissions, async (req) => {
    console.log(
      chalk.yellow(
        `\nPermission requested: ${req.toolName}\n  ${req.description}\n`,
      ),
    );
    return askYesNo(rl, "Allow? [y/N] ");
  });

  const hooks = new HookEngine();
  const subagents = new SubagentOrchestrator(
    cwd,
    provider,
    settings.model,
    tools,
    permissions,
  );
  tools.register(createSpawnSubagentTool(subagents));
  tools.register(createRegisterSubagentTool(subagents));

  const mcp = new McpClientManager();
  const mcpConfig = resolveMcpServers(
    settings.mcpCatalogEnabled ?? [],
    settings.mcpServers ?? {},
  );
  if (Object.keys(mcpConfig).length > 0) {
    console.log(chalk.gray("Connecting MCP servers..."));
    const mcpTools = await mcp.connectAll(mcpConfig);
    mcpTools.forEach((t) => tools.register(t));
    if (mcpTools.length)
      console.log(chalk.gray(`  → ${mcpTools.length} MCP tool(s) available\n`));
  }

  const agentLoop = new AgentHarness({
    cwd,
    provider,
    model: settings.model,
    tools,
    permissions,
    hooks,
    mode: session.mode,
    ignorePatterns: memory.loadIgnorePatterns(),
    sessionId: session.id,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const state: ReplState = {
    cwd,
    settings,
    session,
    memory,
    tools,
    permissions,
    agentLoop,
    todoStore,
    mcp,
    rl,
  };
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
      const result = await runBash(command, {
        cwd,
        onTerminalOutput: (o) => agentLoop.recordTerminalOutput(o),
      });
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
        console.log(
          chalk.red(`Unknown command: /${cmdName}. Type /help for a list.`),
        );
      }
      rl.prompt();
      return;
    }

    await handleUserMessage(state, line);
    rl.prompt();
  });

  rl.on("close", () => {
    SessionStore.save(state.session);
    console.log(
      chalk.gray(
        "\nSession saved. Resume anytime with `agentforge -r`. Goodbye!\n",
      ),
    );
    mcp.disconnectAll().finally(() => process.exit(0));
  });
}

async function handleUserMessage(
  state: ReplState,
  input: string,
): Promise<void> {
  const { session, agentLoop } = state;
  process.stdout.write(chalk.gray("\nthinking...\n"));

  try {
    const result = await agentLoop.runTurn(
      input,
      session.messages,
      buildSystemPrompt(state),
    );
    session.messages.push(...result.messages);
    session.todos = state.todoStore.items;
    SessionStore.save(session);

    if (result.blocked) {
      console.log(chalk.red(`\n[circuit breaker] ${result.tripReason}\n`));
    }
    console.log(`\n${chalk.green("agentforge")} ${result.text}\n`);
    if (result.toolCallCount > 0) {
      console.log(
        chalk.gray(
          `  tools: ${result.toolCallCount}  ·  phases: ${result.phaseHistory.length}`,
        ),
      );
    }
    if (result.graph) {
      const nodes = Object.values(result.graph.nodes) as { status: string }[];
      const done = nodes.filter((n) => n.status === "done").length;
      const blockedN = nodes.filter(
        (n) => n.status === "blocked" || n.status === "failed",
      ).length;
      console.log(
        chalk.gray(
          `  graph: ${nodes.length} nodes · done=${done} blocked=${blockedN} · ${result.graph.status}`,
        ),
      );
    }
  } catch (err) {
    console.log(chalk.red(`\nError: ${(err as Error).message}\n`));
  }
}

function buildSystemPrompt(state: ReplState): string {
  const memoryBlock = state.memory.buildCombinedMemory();
  const rules = state.settings.rules.length
    ? `Project rules:\n- ${state.settings.rules.join("\n- ")}`
    : "";
  const toolNames = state.tools
    .list()
    .map((t) => `- ${t.name}: ${t.description?.slice(0, 80) ?? ""}`)
    .join("\n");
  const mcpIds = [
    ...(state.settings.mcpCatalogEnabled ?? []),
    ...Object.keys(state.settings.mcpServers ?? {}),
  ];
  return compileSystemStack({
    toolsSummary: toolNames || "(built-in tools)",
    mcpSkillsSummary: mcpIds.length
      ? mcpIds.map((id) => `- ${id}`).join("\n")
      : "(none connected — enable via settings.mcpCatalogEnabled)",
    subagentsSummary:
      "explorer, researcher, architect, coder, frontend, backend, reviewer, tester, devops, orchestrator",
    projectMemory: [memoryBlock, rules].filter(Boolean).join("\n\n"),
    sessionState: `Session ${state.session.id} · mode ${state.agentLoop.getMode()}`,
    mode: state.agentLoop.getMode(),
  });
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
  const label =
    mode === "plan"
      ? chalk.yellow("PLAN MODE (read-only)")
      : chalk.green("AGENT MODE (executes)");
  console.log(
    chalk.gray(
      `Mode: ${label}  ·  type "tab" to toggle  ·  "!<cmd>" for bash mode  ·  /help for commands`,
    ),
  );
}

function promptFor(state: ReplState): string {
  const mode =
    state.agentLoop.getMode() === "plan"
      ? chalk.yellow("plan")
      : chalk.green("agent");
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
