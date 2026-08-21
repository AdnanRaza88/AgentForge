# AgentForge — Product Requirements Document (PRD)

Status: v1.0 (spec-driven baseline)
Owner: AgentForge Core Team
Related docs: 02-ARCHITECTURE.md, 03-TECH-SPEC.md, 04-FEATURES-SPEC.md, 05-ROADMAP.md

## Vision

AgentForge is an open-source, terminal-first AI coding agent. One shared engine (`@agentforge/core`) powers three interfaces: CLI, Web dashboard, and Desktop (Tauri).

It is provider-agnostic, skill/plugin extensible, and designed so developers own their agent instead of renting a closed product.

## Goals (v1)

- Reliable agent loop with tools, permissions, and plan/agent modes
- First-class CLI experience (`agentforge`)
- Project memory via `/init` + AGENTFORGE.md
- Multi-provider support including free/local options (Ollama, Groq, Gemini free tier)
- Extensibility: skills, plugins, custom slash commands, MCP
- Web UI for session visibility
- Desktop packaging path via Tauri

## Non-goals (v1)

- Cloud-hosted multi-tenant backend
- Full IDE extension (planned later)
- Marketplace of skills/plugins (Phase 4)

## Success metrics

- Developer can install, set one API key, and complete a real coding task in < 10 minutes
- Provider switch does not require code changes
- Session resume works across CLI restarts
