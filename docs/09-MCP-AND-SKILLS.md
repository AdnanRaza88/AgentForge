# MCP catalog, Skills, Cognitive stack

## MCP (50+)

`packages/core/src/mcp/catalog.ts` ships **60** curated servers.

Enable by id in settings:

```json
{
  "mcpCatalogEnabled": ["github", "playwright", "postgres"],
  "mcpServers": {
    "my-custom": { "command": "npx", "args": ["-y", "my-mcp-package"] }
  }
}
```

## Skills

- `skills/fable5/` — Fable5-grade reasoning
- `skills/coding/writing-tests/`
- `skills/coding/commit-message-style/`

## Cognitive stack

`compileSystemStack()` builds Layers 0–5 every turn (Fable5 identity + safety + plan/act/verify + capability manifest + memory).

## Providers

OpenCode Zen (`OPENCODE_API_KEY`), custom OpenAI-compatible (`customBaseURL`).
