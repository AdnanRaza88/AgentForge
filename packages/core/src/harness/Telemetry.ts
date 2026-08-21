import { appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { TelemetryEvent } from "./types.js";

/**
 * Local-only structured telemetry.
 * Appends JSONL events. Never leaves the machine by default.
 * Powers live graph view and post-hoc session replay.
 */
export class Telemetry {
  private readonly filePath: string;
  private readonly sessionId: string;
  private buffer: TelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(sessionId: string, telemetryDir?: string) {
    this.sessionId = sessionId;
    const dir = telemetryDir ?? join(homedir(), ".agentforge", "telemetry");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.filePath = join(dir, `${sessionId}.jsonl`);
  }

  emit(
    type: TelemetryEvent["type"],
    payload: Record<string, unknown>,
    opts?: { graphId?: string; nodeId?: string },
  ): void {
    const event: TelemetryEvent = {
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      graphId: opts?.graphId,
      nodeId: opts?.nodeId,
      type,
      payload,
    };
    this.buffer.push(event);
    if (this.buffer.length >= 8) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 80);
    }
  }

  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.buffer.length === 0) return;
    const lines = this.buffer.map((e) => JSON.stringify(e)).join("\n") + "\n";
    this.buffer = [];
    try {
      appendFileSync(this.filePath, lines, "utf8");
    } catch (err) {
      console.error("[telemetry] write failed:", (err as Error).message);
    }
  }

  getPath(): string {
    return this.filePath;
  }
}
