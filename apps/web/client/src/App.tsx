import { useEffect, useState } from "react";

interface SessionSummary {
  id: string;
  name?: string;
  updatedAt: string;
  cwd: string;
  mode: string;
}

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then(setSessions)
      .catch((e) => setError(String(e)));
  }, []);

  const loadSession = (id: string) => {
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then(setSelected)
      .catch((e) => setError(String(e)));
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside style={{ width: 280, borderRight: "1px solid #222", padding: 16, overflow: "auto" }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>AgentForge</h2>
        <p style={{ color: "#888", fontSize: 13 }}>Sessions</p>
        {error && <p style={{ color: "#f66" }}>{error}</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => loadSession(s.id)}
                style={{
                  background: selected?.id === s.id ? "#1a1f2e" : "transparent",
                  border: "none",
                  color: "#e6e6e6",
                  textAlign: "left",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{s.name || s.id}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{s.mode} · {new Date(s.updatedAt).toLocaleString()}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main style={{ flex: 1, padding: 24, overflow: "auto" }}>
        {!selected && <p style={{ color: "#888" }}>Select a session to inspect messages & todos.</p>}
        {selected && (
          <>
            <h3 style={{ marginTop: 0 }}>{selected.name || selected.id}</h3>
            <p style={{ color: "#888", fontSize: 13 }}>{selected.cwd} · {selected.provider}/{selected.model}</p>
            <h4>Todos</h4>
            <ul>
              {(selected.todos || []).map((t: any, i: number) => (
                <li key={i} style={{ color: t.status === "done" ? "#6c6" : "#ccc" }}>
                  {t.status === "done" ? "✓" : "○"} {t.text}
                </li>
              ))}
            </ul>
            <h4>Messages ({selected.messages?.length || 0})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(selected.messages || []).map((m: any, i: number) => (
                <div key={i} style={{ background: "#12151c", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{m.role}</div>
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13 }}>{m.content}</pre>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
