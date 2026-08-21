import fs from "node:fs";
import path from "node:path";
import { v4 as uuid } from "uuid";
import { GLOBAL_DIR } from "../config/settings.js";
import type { ChatMessage } from "../providers/types.js";

export type AgentMode = "agent" | "plan";

export interface TodoItem {
  text: string;
  status: "pending" | "done";
}

export interface Session {
  id: string;
  name?: string;
  cwd: string;
  provider: string;
  model: string;
  mode: AgentMode;
  messages: ChatMessage[];
  todos: TodoItem[];
  createdAt: string;
  updatedAt: string;
}

const sessionsDir = () => path.join(GLOBAL_DIR, "sessions");

function ensureDir() {
  fs.mkdirSync(sessionsDir(), { recursive: true });
}

export const SessionStore = {
  create(cwd: string, provider: string, model: string, mode: AgentMode = "agent"): Session {
    const now = new Date().toISOString();
    const session: Session = {
      id: uuid().slice(0, 8),
      cwd,
      provider,
      model,
      mode,
      messages: [],
      todos: [],
      createdAt: now,
      updatedAt: now,
    };
    this.save(session);
    return session;
  },

  save(session: Session): void {
    ensureDir();
    session.updatedAt = new Date().toISOString();
    const file = path.join(sessionsDir(), `${session.id}.json`);
    fs.writeFileSync(file, JSON.stringify(session, null, 2));
    // Track last session for -r flag
    fs.writeFileSync(path.join(sessionsDir(), "_last"), session.id);
  },

  load(id: string): Session | null {
    const file = path.join(sessionsDir(), `${id}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  },

  loadLast(): Session | null {
    const lastFile = path.join(sessionsDir(), "_last");
    if (!fs.existsSync(lastFile)) return null;
    const id = fs.readFileSync(lastFile, "utf-8").trim();
    return this.load(id);
  },

  list(): Session[] {
    ensureDir();
    return fs
      .readdirSync(sessionsDir())
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(sessionsDir(), f), "utf-8")) as Session)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  rename(session: Session, name: string): void {
    session.name = name;
    this.save(session);
  },
};
