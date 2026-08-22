import { randomUUID } from "node:crypto";
import type {
  GraphNode,
  GraphEdge,
  TaskGraph as TaskGraphData,
  NodeKind,
  NodeStatus,
} from "./types.js";

export interface AddNodeInput {
  kind: NodeKind;
  description: string;
  dependsOn?: string[];
  assignedTo?: "root" | string;
  toolName?: string;
  args?: Record<string, unknown>;
  verifyCommands?: string[];
  touches?: string[];
  maxAttempts?: number;
  id?: string;
}

/**
 * Mutable, typed task graph.
 * Nodes are first-class; dependencies are explicit; status is the single
 * source of truth for the scheduler and the UI.
 */
export class TaskGraph {
  private data: TaskGraphData;

  constructor(rootGoal: string, id?: string) {
    const now = new Date().toISOString();
    this.data = {
      id: id ?? randomUUID(),
      rootGoal,
      nodes: {},
      edges: [],
      createdAt: now,
      updatedAt: now,
      status: "planning",
    };
  }

  static fromJSON(raw: TaskGraphData): TaskGraph {
    const g = new TaskGraph(raw.rootGoal, raw.id);
    g.data = { ...raw, nodes: { ...raw.nodes }, edges: [...raw.edges] };
    return g;
  }

  get id(): string {
    return this.data.id;
  }

  get rootGoal(): string {
    return this.data.rootGoal;
  }

  get status(): TaskGraphData["status"] {
    return this.data.status;
  }

  setStatus(s: TaskGraphData["status"]): void {
    this.data.status = s;
    this.touch();
  }

  toJSON(): TaskGraphData {
    return structuredClone(this.data);
  }

  addNode(input: AddNodeInput): GraphNode {
    const id = input.id ?? randomUUID();
    if (this.data.nodes[id]) {
      throw new Error(`Node ${id} already exists`);
    }

    const node: GraphNode = {
      id,
      kind: input.kind,
      description: input.description,
      dependsOn: input.dependsOn ?? [],
      assignedTo: input.assignedTo ?? "root",
      toolName: input.toolName,
      args: input.args,
      verifyCommands: input.verifyCommands,
      touches: input.touches,
      status: "pending",
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      createdAt: new Date().toISOString(),
    };

    this.data.nodes[id] = node;

    for (const dep of node.dependsOn) {
      if (!this.data.nodes[dep] && dep !== id) {
        // Allow forward refs during planning; validate later
      }
      this.data.edges.push({ from: dep, to: id });
    }

    this.touch();
    return node;
  }

  getNode(id: string): GraphNode | undefined {
    return this.data.nodes[id];
  }

  getNodes(): GraphNode[] {
    return Object.values(this.data.nodes);
  }

  updateNodeStatus(id: string, status: NodeStatus, result?: GraphNode["result"]): void {
    const node = this.data.nodes[id];
    if (!node) throw new Error(`Unknown node ${id}`);

    node.status = status;
    if (status === "running" && !node.startedAt) {
      node.startedAt = new Date().toISOString();
    }
    if (status === "done" || status === "failed" || status === "blocked" || status === "skipped") {
      node.completedAt = new Date().toISOString();
    }
    if (result) node.result = result;
    if (status === "running") node.attempts += 1;

    this.touch();
  }

  computePendingReady(): GraphNode[] {
    return this.getNodes().filter((n) => {
      if (n.status !== "pending") return false;
      return n.dependsOn.every((depId) => {
        const dep = this.data.nodes[depId];
        return dep?.status === "done";
      });
    });
  }

  isTerminal(): boolean {
    const nodes = this.getNodes();
    if (nodes.length === 0) return true;
    return nodes.every(
      (n) =>
        n.status === "done" ||
        n.status === "failed" ||
        n.status === "blocked" ||
        n.status === "skipped",
    );
  }

  completedIds(): string[] {
    return this.getNodes()
      .filter((n) => n.status === "done")
      .map((n) => n.id);
  }

  blockedIds(): string[] {
    return this.getNodes()
      .filter((n) => n.status === "blocked" || n.status === "failed")
      .map((n) => n.id);
  }

  hasCycle(): boolean {
    const children = new Map<string, string[]>();
    for (const n of this.getNodes()) {
      for (const parent of n.dependsOn) {
        const list = children.get(parent) ?? [];
        list.push(n.id);
        children.set(parent, list);
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      for (const child of children.get(id) ?? []) {
        if (dfs(child)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };

    for (const id of Object.keys(this.data.nodes)) {
      if (dfs(id)) return true;
    }
    return false;
  }

  summary(): string {
    const nodes = this.getNodes();
    const byStatus = (s: NodeStatus) => nodes.filter((n) => n.status === s).length;
    return [
      `Goal: ${this.data.rootGoal}`,
      `Nodes: ${nodes.length}  done=${byStatus("done")}  blocked=${byStatus("blocked")}  failed=${byStatus("failed")}  pending=${byStatus("pending")}`,
    ].join("\n");
  }

  private touch(): void {
    this.data.updatedAt = new Date().toISOString();
  }
}
