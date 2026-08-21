# AgentForge — Architecture

## High-level

```
┌─────────────────────────────────────────────────────────┐
│                     Interfaces                          │
│  apps/cli  ·  apps/web  ·  apps/desktop (Tauri)         │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              packages/core  (@agentforge/core)          │
│  AgentLoop · Providers · Tools · Permissions · Memory   │
│  Session · Skills · Plugins · MCP · Hooks · Subagents   │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     LLM Providers     Local FS/Shell    MCP Servers
   (OpenAI/Anthropic/   (tools)         (stdio/HTTP)
    Gemini/Groq/...)
```

## Core packages

- **AgentLoop** — turn orchestration, tool calling, plan/agent modes
- **Providers** — thin adapters behind a common `LLMProvider` interface
- **ToolRegistry** — bash, file, git, todo, + plugin/MCP tools
- **PermissionEngine** — allow / ask / deny
- **MemoryManager** — AGENTFORGE.md + ignore patterns
- **SessionStore** — JSON sessions under `~/.agentforge/sessions`
- **SkillLoader / CommandLoader / PluginLoader** — extensibility
- **SubagentOrchestrator** — delegated parallel agents
- **HookEngine** — event-triggered shell hooks
- **McpClientManager** — MCP tool bridging

## Data flow (one user turn)

1. CLI/Web receives input
2. Mentions expanded (`@file`, `@folder`, …)
3. AgentLoop builds messages + system prompt (memory + rules)
4. Provider.chat() → text and/or tool_calls
5. For each tool_call: permission check → execute → result back to model
6. Loop until no more tool calls or iteration limit
7. Session saved

## Extensibility points

| Mechanism | Location | What it adds |
|-----------|----------|--------------|
| Skills | `skills/*/SKILL.md` | Prompt guidance by keyword |
| Custom commands | `.agentforge/commands/*.md` | New `/slash` commands |
| Plugins | `plugins/*/index.js` | Tools + commands |
| MCP servers | settings.mcpServers | External tool servers |
| Hooks | settings.hooks | Shell on agent events |
