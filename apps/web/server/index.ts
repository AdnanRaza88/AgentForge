import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SessionStore } from "@agentforge/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/sessions", (_req, res) => {
  res.json(SessionStore.list());
});

app.get("/api/sessions/:id", (req, res) => {
  const session = SessionStore.load(req.params.id);
  if (!session) return res.status(404).json({ error: "not found" });
  res.json(session);
});

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err)
      res
        .status(200)
        .send("AgentForge Web UI — run npm run dev:client or build first.");
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`AgentForge Web UI running at http://localhost:${PORT}`);
});
