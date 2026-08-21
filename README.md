# AgentForge

**AgentForge** is an open-source, terminal-first AI coding agent — built as a
provider-agnostic alternative to closed-source agents. One shared engine
(`@agentforge/core`) powers three interfaces: a **CLI**, a **Web dashboard**,
and a **Desktop** app (Tauri).

## Features

- Multi-provider: OpenAI, Anthropic, Gemini, OpenRouter, Groq, and any OpenAI-compatible endpoint
- Skills system + plugins
- Permissions engine, hooks, subagents, MCP support
- Session management & compaction
- Project-aware memory & scanning
- Full CLI with `/init`, `/plan`, `/todo`, `/config`, `/session`, `/agents`
- Web UI + Tauri desktop shell

## Quick Start

```bash
git clone https://github.com/AdnanRaza88/AgentForge.git
cd AgentForge
npm install
cp .env.example .env   # add at least one API key
npm run cli
```

## Structure

```
AgentForge/
├── packages/core/     # Shared agent engine
├── apps/cli/          # Terminal interface
├── apps/web/          # Web dashboard (client + server)
├── apps/desktop/      # Tauri desktop
├── docs/              # PRD, Architecture, Tech Spec, Roadmap...
├── plugins/           # Example plugins
└── skills/            # Example skills
```

See `docs/` for full product & technical documentation.

## License

MIT
