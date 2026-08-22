import type { GraphNode, SchedulerOptions, ReadySetResult } from "./types.js";
import { DEFAULT_SCHEDULER_OPTIONS } from "./types.js";
import type { TaskGraph } from "./TaskGraph.js";

/**
 * Graph scheduler.
 *
 * Algorithm (Master PRD §5.3):
 *   ready = pending nodes whose dependsOn are all done
 *   apply concurrency limit + path-overlap serialization
 *   dispatch up to limit → mark running
 *   on completion → re-derive ready set
 *
 * Deterministic given the same graph state.
 */
export class Scheduler {
  private readonly opts: SchedulerOptions;

  constructor(opts?: Partial<SchedulerOptions>) {
    this.opts = { ...DEFAULT_SCHEDULER_OPTIONS, ...opts };
  }

  getOptions(): SchedulerOptions {
    return { ...this.opts };
  }

  getReadySet(graph: TaskGraph): ReadySetResult {
    const all = graph.getNodes();
    const running = all.filter((n) => n.status === "running" || n.status === "verifying");
    const done = all.filter((n) => n.status === "done");
    const failed = all.filter((n) => n.status === "failed");
    const blocked = all.filter((n) => n.status === "blocked");

    const pendingReady = graph.computePendingReady();

    const blockedByOverlap: GraphNode[] = [];
    const candidates: GraphNode[] = [];

    for (const node of pendingReady) {
      if (
        this.opts.serializePathOverlap &&
        this.overlapsAny(node, running)
      ) {
        blockedByOverlap.push(node);
      } else {
        candidates.push(node);
      }
    }

    const selected: GraphNode[] = [];
    const selectedTouches: string[] = [];

    const slots = Math.max(0, this.opts.concurrencyLimit - running.length);

    for (const node of candidates) {
      if (selected.length >= slots) break;
      if (
        this.opts.serializePathOverlap &&
        this.overlapsPaths(node.touches ?? [], selectedTouches)
      ) {
        blockedByOverlap.push(node);
        continue;
      }
      selected.push(node);
      selectedTouches.push(...(node.touches ?? []));
    }

    return {
      ready: selected,
      blockedByOverlap,
      running,
      done,
      failed,
      blocked,
    };
  }

  markRunning(graph: TaskGraph, nodes: GraphNode[]): void {
    for (const n of nodes) {
      graph.updateNodeStatus(n.id, "running");
    }
  }

  onNodeComplete(
    graph: TaskGraph,
    nodeId: string,
    success: boolean,
    output: string,
    verifiedBy?: string,
  ): boolean {
    const node = graph.getNode(nodeId);
    if (!node) return graph.isTerminal();

    if (success) {
      graph.updateNodeStatus(nodeId, "done", {
        success: true,
        output,
        verifiedBy,
      });
    } else if (node.attempts >= node.maxAttempts) {
      graph.updateNodeStatus(nodeId, "blocked", {
        success: false,
        output,
      });
    } else {
      graph.updateNodeStatus(nodeId, "pending", {
        success: false,
        output,
      });
    }

    if (graph.isTerminal()) {
      const hasBlocked = graph.blockedIds().length > 0;
      graph.setStatus(hasBlocked ? "blocked" : "completed");
    }

    return graph.isTerminal();
  }

  private overlapsAny(node: GraphNode, others: GraphNode[]): boolean {
    const a = node.touches ?? [];
    if (a.length === 0) return false;
    for (const o of others) {
      if (this.overlapsPaths(a, o.touches ?? [])) return true;
    }
    return false;
  }

  private overlapsPaths(a: string[], b: string[]): boolean {
    if (a.length === 0 || b.length === 0) return false;
    const setB = new Set(b.map(normalizePath));
    return a.some((p) => setB.has(normalizePath(p)));
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}
