# AgentForge — Technical Specification

## Stack

- **Language**: TypeScript (Node 18+)
- **Monorepo**: npm workspaces
- **CLI**: commander + readline + chalk
- **Web**: Express + Vite + React
- **Desktop**: Tauri 2 (Rust shell + WebView)
- **Providers**: official SDKs (Anthropic, OpenAI, Google Generative AI) + OpenAI-compatible clients

## Packages

### `@agentforge/core`

Shared engine. All interfaces import from here.

Key modules under `packages/core/src/`:

- `agent/AgentLoop.ts` — main turn runner
- `providers/*` — Anthropic, OpenAI, Gemini, OpenAI-compatible factories
- `tools/*` — ToolRegistry + built-in tools
- `permissions/PermissionEngine.ts`
- `memory/*` — MemoryManager + projectScanner
- `session/*` — SessionStore + compaction
- `skills/*`, `plugins/*`, `mcp/*`, `hooks/*`, `subagents/*`, `mentions/*`, `config/settings.ts`

### `apps/cli`

Entry: `src/cli.ts` → `src/repl.ts`

Commands live under `src/commands/`.

### `apps/web`

- `server/` — Express API for sessions
- `client/` — React dashboard (Vite)

### `apps/desktop`

Tauri 2 project wrapping the web client for native installers (MSI/NSIS).

## Configuration

- Global: `~/.agentforge/settings.json`
- Project: `.agentforge/settings.json`
- Env: `.env` (API keys)
- Ignore: `.agentforgeignore`

## Session format

JSON files in `~/.agentforge/sessions/<id>.json` containing messages, todos, mode, provider, model, timestamps.

## Security notes

- Tools that mutate state (write_file, delete_file, bash, git) default to `ask`
- Path resolution rejects escapes outside project root
- No secrets in repo; `.env` is gitignored

## Build & run

```bash
npm install
cp .env.example .env   # add keys
npm run cli            # terminal agent
npm run dev:web        # web dashboard
```
