# Subagents — 10 core + meta-orchestrator + custom

## Concept (confirmed)

1. **10 core subagents** — stable roster for almost every coding task.
2. **`orchestrator` (meta)** — one of the 10; decomposes goals and spawns others from the roster (or brief-built specialists).
3. **Custom subagents** — JSON under `.agentforge/subagents/` (project) or `~/.agentforge/subagents/` (global); also `register_subagent` tool.
4. **Temporary specialists** — `spawn_subagent` with `brief` + optional `baseAgent` builds a one-shot profile without persisting.

## Core 10

| Name | Category | Role |
|------|----------|------|
| `explorer` | explore | Map files / modules / entry points |
| `researcher` | explore | Deep investigation with evidence |
| `architect` | explore | Structure, trade-offs, plan |
| `coder` | build | Focused code changes |
| `frontend` | build | UI / components / a11y |
| `backend` | build | APIs, DB, auth, jobs |
| `reviewer` | verify | Bugs, security, style |
| `tester` | verify | Write + run tests |
| `devops` | ops | CI, Docker, deploy hygiene |
| `orchestrator` | meta | Decompose → spawn → synthesize |

## Tools

- `spawn_subagent` — `{ agentName, task, brief?, baseAgent? }`
- `register_subagent` — persist custom profile to project

## Custom profile file

`.agentforge/subagents/sql-migrator.json`:

```json
{
  "name": "sql-migrator",
  "label": "SQL Migrator",
  "systemAddon": "You only write and review SQL migrations...",
  "maxToolCalls": 15,
  "readOnly": false
}
```

## Graph

`kind: "subagent"` nodes + `addSubagentNode` / `executeGraphNode` — nested `AgentHarness` + nested TaskGraph per spawn.
