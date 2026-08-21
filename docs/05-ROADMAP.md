# AgentForge — Roadmap (Post-v1)

## Phase 2 — Hardening
- Real tokenizer per provider (replace chars/4 heuristic) for accurate
  compaction thresholds.
- MCP HTTP/SSE transport (remote servers, not just local stdio).
- Subagent queueing + concurrency limits + streaming partial results to Web UI.
- Permission system: per-directory rules, glob-based file permission scoping.

## Phase 3 — IDE Integration (Extension API)
Contract (not yet built):
```ts
// packages/core exposes a stable IPC contract any IDE extension can use
interface AgentForgeIpc {
  sendMessage(text: string, mentions?: string[]): Promise<void>;
  onStream(cb: (chunk: string) => void): void;
  onPermissionRequest(cb: (req: PermissionRequest) => Promise<"allow"|"deny">): void;
  getActiveSession(): SessionSnapshot;
}
```

## Phase 4 — Marketplace & Distribution
- Skills/plugins registry (npm-like publish + install).
- Official Docker image + one-line install script.
- Desktop auto-update via Tauri updater.

## Phase 5 — Multi-user / Team
- Shared project memory + shared session history (optional remote backend).
- Role-based permissions for team workspaces.
