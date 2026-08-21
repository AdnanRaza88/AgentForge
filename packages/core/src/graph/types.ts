/**
 * Task Graph types — every unit of work is a node in a typed DAG.
 * Parallelism, partial failure, and verification fall out of the structure.
 * (Master PRD §5)
 */

export type NodeStatus =
  | "pending"
  | "ready"
  | "running"
  | "verifying"
  | "done"
  | "failed"
  | "blocked"
  | "skipped";

export type NodeKind =
  | "tool_call"
  | "subagent"
  | "verification"
  | "checkpoint"
  | "human_review"
  | "plan";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  description: string;
  dependsOn: string[];
  assignedTo?: "root" | string;
  toolName?: string;
  args?: Record<string, unknown>;
  verifyCommands?: string[];
  status: NodeStatus;
  attempts: number;
  maxAttempts: number;
  result?: {
    success: boolean;
    output: string;
    verifiedBy?: string;
  };
  touches?: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface TaskGraph {
  id: string;
  rootGoal: string;
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
  createdAt: string;
  updatedAt: string;
  status: "planning" | "running" | "completed" | "blocked" | "cancelled";
}

export interface SchedulerOptions {
  concurrencyLimit: number;
  serializePathOverlap: boolean;
}

export const DEFAULT_SCHEDULER_OPTIONS: SchedulerOptions = {
  concurrencyLimit: 3,
  serializePathOverlap: true,
};

export interface ReadySetResult {
  ready: GraphNode[];
  blockedByOverlap: GraphNode[];
  running: GraphNode[];
  done: GraphNode[];
  failed: GraphNode[];
  blocked: GraphNode[];
}
