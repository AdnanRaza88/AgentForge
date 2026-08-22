/** Thin fetch wrapper for AgentForge Web API */

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface SessionSummary {
  id: string;
  name?: string;
  updatedAt: string;
  createdAt?: string;
  cwd: string;
  mode: string;
  provider?: string;
  model?: string;
}

export interface SessionDetail extends SessionSummary {
  messages: { role: string; content: string; tool_calls?: unknown[] }[];
  todos: { text: string; status: string }[];
}

export interface Settings {
  provider: string;
  model: string;
  thinking: "on" | "off";
  permissions: Record<string, "allow" | "ask" | "deny">;
  mcpCatalogEnabled: string[];
  mcpServers: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>;
  rules: string[];
  customBaseURL?: string;
  customProviderLabel?: string;
}

export interface ProviderMeta {
  id: string;
  label: string;
  free: boolean;
  envKey: string;
  defaultModel: string;
  help: string;
}

export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  free?: boolean;
  contextWindow?: number;
}

export interface McpEntry {
  id: string;
  name: string;
  skill: string;
  category: string;
  command: string;
  args?: string[];
  envKeys?: string[];
  official?: boolean;
}

export interface SubagentProfile {
  name: string;
  label: string;
  category: string;
  systemAddon: string;
  maxToolCalls: number;
  readOnly?: boolean;
}

export const api = {
  health: () => req<{ ok: boolean; cwd: string }>("/api/health"),
  sessions: () => req<SessionSummary[]>("/api/sessions"),
  session: (id: string) => req<SessionDetail>(`/api/sessions/${id}`),
  renameSession: (id: string, name: string) =>
    req<SessionDetail>(`/api/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  settings: () => req<Settings>("/api/settings"),
  saveSettings: (partial: Partial<Settings>) =>
    req<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(partial),
    }),
  providers: () => req<ProviderMeta[]>("/api/providers"),
  models: (provider?: string) =>
    req<ModelInfo[]>(provider ? `/api/models?provider=${encodeURIComponent(provider)}` : "/api/models"),
  mcpCatalog: () => req<McpEntry[]>("/api/mcp/catalog"),
  subagents: () => req<SubagentProfile[]>("/api/subagents"),
};
