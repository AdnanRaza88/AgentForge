# AgentForge — Features Spec

Status: v1 baseline

## Core CLI Features

1. **Agent Loop** — multi-turn tool-using agent with plan/agent modes
2. **Slash Commands** — `/init`, `/plan`, `/todo`, `/config`, `/session`, `/agents`, `/help`
2b. **Custom Commands** — `.md` files in `.agentforge/commands/` become `/name`
3. **Mentions** — `@file`, `@folder/`, `@git`, `@terminal`
4. **Bash Mode** — prefix `!` to run shell directly
5. **Permissions** — allow / ask / deny per tool
6. **Image attachments** — paste screenshots for vision models
7. **Session persistence** — resume with `-r` or `/resume`
8. **Compaction** — summarize history when context grows
9. **Project memory** — `/init` generates AGENTFORGE.md
10. **Skills** — keyword-triggered guidance from SKILL.md files
11. **Plugins** — register tools + commands from `plugins/`
12. **Subagents** — `/agents run` and parallel delegation
13. **MCP** — stdio MCP servers (HTTP planned)
14. **Hooks** — BeforeCommand, AfterFileSave, etc.
15. **Multi-provider** — Anthropic, OpenAI, Gemini, Groq, OpenRouter, Ollama

## Web UI
- Localhost dashboard of sessions, todos, messages

## Desktop
- Tauri shell wrapping the Web UI
