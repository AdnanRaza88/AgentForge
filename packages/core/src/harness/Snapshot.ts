import {
  createHash,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import type { SnapshotManifest } from "./types.js";

/**
 * Per-task snapshot / revert system.
 * Before the first mutating action of a task, take a content-hash manifest
 * of touched (or project) files so the harness can offer a single
 * "revert this task" that undoes every file change across the entire graph.
 *
 * Deterministic and local-only.
 */
export class SnapshotManager {
  private readonly dir: string;
  private readonly root: string;
  private current: SnapshotManifest | null = null;

  constructor(root: string, snapshotDir?: string) {
    this.root = resolve(root);
    this.dir = snapshotDir ?? join(homedir(), ".agentforge", "snapshots");
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  create(
    sessionId: string,
    paths: string[] = [],
    graphId?: string,
  ): string {
    const id = randomUUID();
    const files: Record<string, string> = {};

    const targets =
      paths.length > 0
        ? paths.map((p) => resolve(this.root, p))
        : this.listProjectFiles();

    for (const abs of targets) {
      if (!existsSync(abs) || !statSync(abs).isFile()) continue;
      const rel = relative(this.root, abs);
      if (rel.startsWith("..") || this.shouldIgnore(rel)) continue;
      try {
        const content = readFileSync(abs);
        files[rel] = createHash("sha256").update(content).digest("hex");
        const contentPath = join(this.dir, id, rel);
        mkdirSync(join(contentPath, ".."), { recursive: true });
        writeFileSync(contentPath, content);
      } catch {
        // skip unreadable
      }
    }

    const manifest: SnapshotManifest = {
      id,
      createdAt: new Date().toISOString(),
      sessionId,
      graphId,
      files,
      root: this.root,
    };

    writeFileSync(
      join(this.dir, `${id}.json`),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );
    this.current = manifest;
    return id;
  }

  getCurrent(): SnapshotManifest | null {
    return this.current;
  }

  /**
   * Restore every file recorded in the snapshot to its exact previous content.
   * Files created after the snapshot that are not in the manifest are left alone.
   */
  revert(snapshotId?: string): { restored: string[]; errors: string[] } {
    const id = snapshotId ?? this.current?.id;
    if (!id) return { restored: [], errors: ["No snapshot to revert"] };

    const manifestPath = join(this.dir, `${id}.json`);
    if (!existsSync(manifestPath)) {
      return { restored: [], errors: [`Snapshot ${id} not found`] };
    }

    const manifest: SnapshotManifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    );
    const restored: string[] = [];
    const errors: string[] = [];

    for (const [rel, expectedHash] of Object.entries(manifest.files)) {
      const abs = resolve(this.root, rel);
      const contentPath = join(this.dir, id, rel);
      if (!existsSync(contentPath)) {
        errors.push(`Missing stored content for ${rel}`);
        continue;
      }
      try {
        const content = readFileSync(contentPath);
        const hash = createHash("sha256").update(content).digest("hex");
        if (hash !== expectedHash) {
          errors.push(`Hash mismatch for stored ${rel}`);
          continue;
        }
        mkdirSync(join(abs, ".."), { recursive: true });
        writeFileSync(abs, content);
        restored.push(rel);
      } catch (err) {
        errors.push(`${rel}: ${(err as Error).message}`);
      }
    }

    return { restored, errors };
  }

  private listProjectFiles(): string[] {
    const result: string[] = [];
    const walk = (dir: string) => {
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }
      for (const name of entries) {
        if (
          name === "node_modules" ||
          name === ".git" ||
          name === "dist" ||
          name === ".agentforge"
        )
          continue;
        const abs = join(dir, name);
        try {
          const st = statSync(abs);
          if (st.isDirectory()) walk(abs);
          else if (st.isFile() && st.size < 2_000_000) result.push(abs);
        } catch {
          // skip
        }
      }
    };
    walk(this.root);
    return result;
  }

  private shouldIgnore(rel: string): boolean {
    return (
      rel.includes("node_modules/") ||
      rel.includes(".git/") ||
      rel.startsWith("dist/") ||
      rel.endsWith(".map")
    );
  }

  prune(_keepIds: string[]): void {
    // reserved for future cleanup
  }
}
