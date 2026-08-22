import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SessionStore,
  loadSettings,
  saveProjectSettings,
  AVAILABLE_PROVIDERS,
  MODEL_CATALOG,
  MCP_CATALOG,
  CORE_SUBAGENT_PROFILES,
  type Settings,
} from "@agentforge/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function workspaceCwd(): string {
  return process.env.AGENTFORGE_CWD || process.cwd();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "AgentForge", version: "0.1.0", cwd: workspaceCwd() });
});

app.get("/api/sessions", (_req, res) => {
  try {
    res.json(SessionStore.list());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/sessions/:id", (req, res) => {
  try {
    const session = SessionStore.load(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch("/api/sessions/:id", (req, res) => {
  try {
    const session = SessionStore.load(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (typeof req.body?.name === "string") {
      SessionStore.rename(session, req.body.name.trim());
    }
    res.json(SessionStore.load(req.params.id));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/settings", (_req, res) => {
  try {
    res.json(loadSettings(workspaceCwd()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put("/api/settings", (req, res) => {
  try {
    const body = req.body as Partial<Settings>;
    const allowed = [
      "provider", "model", "thinking", "permissions",
      "mcpCatalogEnabled", "mcpServers", "rules",
      "customBaseURL", "customProviderLabel",
    ] as const;
    const partial: Partial<Settings> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) (partial as any)[key] = body[key];
    }
    saveProjectSettings(workspaceCwd(), partial);
    res.json(loadSettings(workspaceCwd()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/providers", (_req, res) => {
  res.json(AVAILABLE_PROVIDERS);
});

app.get("/api/models", (req, res) => {
  const provider = req.query.provider as string | undefined;
  if (provider) {
    res.json(MODEL_CATALOG.filter((m) => m.provider === provider));
  } else {
    res.json(MODEL_CATALOG);
  }
});

app.get("/api/mcp/catalog", (_req, res) => {
  res.json(MCP_CATALOG);
});

app.get("/api/subagents", (_req, res) => {
  res.json(CORE_SUBAGENT_PROFILES);
});

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) {
      res.status(200).type("html").send(
        "<!doctype html><html><body style=\"font-family:system-ui;padding:2rem\"><h1>AgentForge Web</h1><p>Run <code>npm run dev:client -w apps/web</code>.</p></body></html>",
      );
    }
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`AgentForge Web UI → http://localhost:${PORT}`);
});
