import { useCallback, useEffect, useState } from "react";
import { useTheme } from "./hooks/useTheme";
import {
  api,
  type SessionSummary,
  type SessionDetail,
  type Settings,
  type ProviderMeta,
  type ModelInfo,
  type McpEntry,
  type SubagentProfile,
} from "./api/client";
import "./styles/theme.css";

type Page = "sessions" | "settings" | "providers" | "mcp" | "agents";

export default function App() {
  const { theme, setTheme } = useTheme();
  const [page, setPage] = useState<Page>("sessions");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cwd, setCwd] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    api.health().then((h) => setCwd(h.cwd)).catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="mark">AF</span>
          <span>AgentForge</span>
          {cwd && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)", marginLeft: 8 }}>{cwd}</span>
          )}
        </div>
        <div className="topbar-actions">
          <button type="button" className={`btn-icon ${theme === "light" ? "active" : ""}`} title="Light" onClick={() => setTheme("light")} aria-label="Light theme">☀</button>
          <button type="button" className={`btn-icon ${theme === "dark" ? "active" : ""}`} title="Dark" onClick={() => setTheme("dark")} aria-label="Dark theme">◐</button>
        </div>
      </header>
      <aside className="sidebar">
        <nav className="sidebar-nav">
          {([["sessions", "Sessions", "◉"], ["settings", "Settings", "⚙"], ["providers", "Providers", "◈"], ["mcp", "MCP", "⬡"], ["agents", "Subagents", "◎"]] as const).map(([id, label, icon]) => (
            <button key={id} type="button" className={`nav-item ${page === id ? "active" : ""}`} onClick={() => { setPage(id); setError(null); }}>
              <span className="icon">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>v0.1 · connected API</div>
        </div>
      </aside>
      <main className="main">
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button type="button" className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        {page === "sessions" && <SessionsPage onError={setError} onToast={showToast} />}
        {page === "settings" && <SettingsPage onError={setError} onToast={showToast} />}
        {page === "providers" && <ProvidersPage onError={setError} onToast={showToast} />}
        {page === "mcp" && <McpPage onError={setError} onToast={showToast} />}
        {page === "agents" && <AgentsPage onError={setError} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function SessionsPage({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rename, setRename] = useState("");
  const refresh = useCallback(() => {
    setLoading(true);
    api.sessions().then(setSessions).catch((e) => onError(String(e.message || e))).finally(() => setLoading(false));
  }, [onError]);
  useEffect(() => { refresh(); }, [refresh]);
  const open = (id: string) => {
    api.session(id).then((s) => { setSelected(s); setRename(s.name || ""); }).catch((e) => onError(String(e.message || e)));
  };
  const saveName = async () => {
    if (!selected || !rename.trim()) return;
    try {
      const updated = await api.renameSession(selected.id, rename.trim());
      setSelected(updated); refresh(); onToast("Session renamed");
    } catch (e) { onError(String((e as Error).message)); }
  };
  return (
    <>
      <h1 className="page-title">Sessions</h1>
      <p className="page-sub">CLI sessions under ~/.agentforge/sessions.</p>
      <div className="split">
        <div className="card" style={{ display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 140px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <span className="section-label" style={{ padding: 0 }}>Recent</span>
            <button type="button" className="btn btn-ghost" onClick={refresh} style={{ padding: "4px 8px" }}>Refresh</button>
          </div>
          {loading && <div className="empty">Loading…</div>}
          {!loading && sessions.length === 0 && <div className="empty">No sessions yet. Run <code>npm run cli</code></div>}
          <ul className="session-list">
            {sessions.map((s) => (
              <li key={s.id}>
                <button type="button" className={`session-item ${selected?.id === s.id ? "selected" : ""}`} onClick={() => open(s.id)}>
                  <div className="name">{s.name || s.id}</div>
                  <div className="meta">{s.mode} · {new Date(s.updatedAt).toLocaleString()}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          {!selected && <div className="empty card card-pad">Select a session.</div>}
          {selected && (
            <div className="card card-pad">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, flex: 1 }}>{selected.name || selected.id}</h2>
                <span className={`badge ${selected.mode === "plan" ? "badge-plan" : "badge-agent"}`}>{selected.mode}</span>
                <span className="badge badge-muted">{selected.provider}/{selected.model}</span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--mono)", marginTop: 0 }}>{selected.cwd}</p>
              <div className="field" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="rename">Display name</label>
                  <input id="rename" value={rename} onChange={(e) => setRename(e.target.value)} />
                </div>
                <button type="button" className="btn btn-primary" onClick={saveName}>Save name</button>
              </div>
              <h3 style={{ fontSize: 14, marginTop: 20 }}>Todos</h3>
              <ul style={{ paddingLeft: 18 }}>
                {(selected.todos || []).map((t, i) => (
                  <li key={i} style={{ color: t.status === "done" ? "var(--success)" : "var(--text)" }}>{t.status === "done" ? "✓" : "○"} {t.text}</li>
                ))}
              </ul>
              <h3 style={{ fontSize: 14, marginTop: 20 }}>Messages ({selected.messages?.length || 0})</h3>
              {(selected.messages || []).map((m, i) => (
                <div key={i} className="msg">
                  <div className={`msg-role ${m.role}`}>{m.role}</div>
                  <pre className="msg-body">{m.content || (m.tool_calls ? "[tool calls]" : "")}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SettingsPage({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    Promise.all([api.settings(), api.providers()]).then(([s, p]) => { setSettings(s); setProviders(p); }).catch((e) => onError(String(e.message || e)));
  }, [onError]);
  useEffect(() => {
    if (!settings?.provider) return;
    api.models(settings.provider).then(setModels).catch(() => setModels([]));
  }, [settings?.provider]);
  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await api.saveSettings({
        provider: settings.provider, model: settings.model, thinking: settings.thinking,
        permissions: settings.permissions, customBaseURL: settings.customBaseURL,
        customProviderLabel: settings.customProviderLabel, rules: settings.rules,
      });
      setSettings(next); onToast("Settings saved");
    } catch (e) { onError(String((e as Error).message)); }
    finally { setSaving(false); }
  };
  if (!settings) return <div className="empty">Loading settings…</div>;
  const permKeys = Object.keys(settings.permissions || {});
  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Saved via API to .agentforge/settings.json.</p>
      <div className="card card-pad" style={{ maxWidth: 640 }}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="provider">Provider</label>
            <select id="provider" value={settings.provider} onChange={(e) => setSettings({ ...settings, provider: e.target.value, model: providers.find((p) => p.id === e.target.value)?.defaultModel || settings.model })}>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.label}{p.free ? " (free)" : ""}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="model">Model</label>
            <select id="model" value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>
              {models.length === 0 && <option value={settings.model}>{settings.model}</option>}
              {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="thinking">Thinking</label>
          <select id="thinking" value={settings.thinking} onChange={(e) => setSettings({ ...settings, thinking: e.target.value as "on" | "off" })}>
            <option value="off">off</option><option value="on">on</option>
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="base">Custom base URL</label>
            <input id="base" value={settings.customBaseURL || ""} onChange={(e) => setSettings({ ...settings, customBaseURL: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="plabel">Custom provider label</label>
            <input id="plabel" value={settings.customProviderLabel || ""} onChange={(e) => setSettings({ ...settings, customProviderLabel: e.target.value })} />
          </div>
        </div>
        <h3 style={{ fontSize: 14 }}>Permissions</h3>
        {permKeys.map((key) => (
          <div key={key} className="field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 120, fontFamily: "var(--mono)", fontSize: 12 }}>{key}</span>
            <select value={settings.permissions[key]} onChange={(e) => setSettings({ ...settings, permissions: { ...settings.permissions, [key]: e.target.value as "allow" | "ask" | "deny" } })} style={{ maxWidth: 140 }}>
              <option value="allow">allow</option><option value="ask">ask</option><option value="deny">deny</option>
            </select>
          </div>
        ))}
        <div className="field">
          <label htmlFor="rules">Rules (one per line)</label>
          <textarea id="rules" rows={4} value={(settings.rules || []).join("\n")} onChange={(e) => setSettings({ ...settings, rules: e.target.value.split("\n").map((r) => r.trim()).filter(Boolean) })} />
        </div>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
      </div>
    </>
  );
}

function ProvidersPage({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    Promise.all([api.providers(), api.settings()]).then(([p, s]) => { setProviders(p); setSettings(s); }).catch((e) => onError(String(e.message || e)));
  }, [onError]);
  const select = async (id: string, defaultModel: string) => {
    try {
      const next = await api.saveSettings({ provider: id, model: defaultModel });
      setSettings(next); onToast(`Provider → ${id}`);
    } catch (e) { onError(String((e as Error).message)); }
  };
  return (
    <>
      <h1 className="page-title">Providers</h1>
      <p className="page-sub">Click to set active provider.</p>
      <div className="grid-cards">
        {providers.map((p) => (
          <button key={p.id} type="button" className={`provider-card ${settings?.provider === p.id ? "active" : ""}`} onClick={() => select(p.id, p.defaultModel)}>
            <div className="title">{p.label}{p.free && <span className="badge badge-muted" style={{ marginLeft: 8 }}>free</span>}</div>
            <div className="help">{p.help}</div>
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-muted)" }}>{p.envKey} · {p.defaultModel}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function McpPage({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [catalog, setCatalog] = useState<McpEntry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filter, setFilter] = useState("");
  useEffect(() => {
    Promise.all([api.mcpCatalog(), api.settings()]).then(([c, s]) => { setCatalog(c); setSettings(s); }).catch((e) => onError(String(e.message || e)));
  }, [onError]);
  const enabled = new Set(settings?.mcpCatalogEnabled || []);
  const toggle = async (id: string) => {
    if (!settings) return;
    const next = enabled.has(id) ? settings.mcpCatalogEnabled.filter((x) => x !== id) : [...settings.mcpCatalogEnabled, id];
    try {
      const s = await api.saveSettings({ mcpCatalogEnabled: next });
      setSettings(s); onToast(enabled.has(id) ? `Disabled ${id}` : `Enabled ${id}`);
    } catch (e) { onError(String((e as Error).message)); }
  };
  const filtered = catalog.filter((e) => !filter || e.name.toLowerCase().includes(filter.toLowerCase()) || e.id.includes(filter.toLowerCase()) || e.category.includes(filter.toLowerCase()));
  return (
    <>
      <h1 className="page-title">MCP catalog</h1>
      <p className="page-sub">Toggle servers — settings.mcpCatalogEnabled.</p>
      <div className="field" style={{ maxWidth: 320 }}>
        <input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="grid-cards">
        {filtered.map((e) => (
          <button key={e.id} type="button" className={`mcp-card ${enabled.has(e.id) ? "active" : ""}`} onClick={() => toggle(e.id)}>
            <div className="title">{e.name}</div>
            <div className="skill">{e.skill}</div>
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-muted)" }}>{e.category} · {e.id}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function AgentsPage({ onError }: { onError: (e: string | null) => void }) {
  const [agents, setAgents] = useState<SubagentProfile[]>([]);
  useEffect(() => {
    api.subagents().then(setAgents).catch((e) => onError(String(e.message || e)));
  }, [onError]);
  return (
    <>
      <h1 className="page-title">Subagents</h1>
      <p className="page-sub">Core roster of 10.</p>
      <div className="grid-cards">
        {agents.map((a) => (
          <div key={a.name} className="agent-card" style={{ cursor: "default" }}>
            <div className="title">{a.label} <span className="badge badge-muted">{a.category}</span></div>
            <div className="desc" style={{ marginTop: 6 }}>{a.systemAddon.slice(0, 160)}…</div>
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-muted)" }}>{a.name} · max {a.maxToolCalls}</div>
          </div>
        ))}
      </div>
    </>
  );
}
