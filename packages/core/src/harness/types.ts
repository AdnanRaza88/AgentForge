/**
 * Harness types — the scaffolding that makes the agent loop safe, observable,
 * and self-checking. Independent of any specific LLM output.
 *
 * Designed from Master PRD v2 + hardened patterns from production harnesses.
 */

/** Named phases of the agentic loop. Explicit, inspectable, logged. */
export type LoopPhase =
  | "idle"
  | "perceive"
  | "plan"
  | "act"
  | "permission"
  | "execute"
  | "verify"
  | "reflect"
  | "report"
  | "persist";

/** Discriminated union for the state machine. Every transition is typed. */
export type LoopState =
  | { phase: "idle" }
  | { phase: "perceive"; userInput: string }
  | { phase: "plan"; goal: string; isTrivial: boolean }
  | {
      phase: "act";
      nodeId: string;
      description: string;
      toolName?: string;
      args?: Record<string, unknown>;
    }
  | {
      phase: "permission";
      nodeId: string;
      toolName: string;
      args: Record<string, unknown>;
      decision?: "allow" | "deny" | "ask";
    }
  | {
      phase: "execute";
      nodeId: string;
      toolName: string;
      args: Record<string, unknown>;
    }
  | {
      phase: "verify";
      nodeId: string;
      toolName: string;
      rawResult: string;
      success: boolean;
    }
  | {
      phase: "reflect";
      nodeId: string;
      failure: string;
      attempt: number;
      maxAttempts: number;
      diagnosis?: string;
    }
  | {
      phase: "report";
      summary: string;
      blockedNodes: string[];
      completedNodes: string[];
    }
  | { phase: "persist"; sessionId: string };

export type NodeStatus =
  | "pending"
  | "ready"
  | "running"
  | "verifying"
  | "done"
  | "failed"
  | "blocked"
  | "skipped";

export interface CircuitBreakerConfig {
  maxToolCallsPerTask: number;
  maxRetriesPerNode: number;
  identicalFailureLimit: number;
  tokenBudgetWarning: number;
}

export const DEFAULT_CIRCUIT_BREAKERS: CircuitBreakerConfig = {
  maxToolCallsPerTask: 60,
  maxRetriesPerNode: 3,
  identicalFailureLimit: 2,
  tokenBudgetWarning: 0,
};

export interface TelemetryEvent {
  ts: string;
  sessionId: string;
  graphId?: string;
  nodeId?: string;
  type:
    | "phase_transition"
    | "tool_call"
    | "permission_decision"
    | "node_status_change"
    | "provider_call"
    | "circuit_breaker"
    | "snapshot"
    | "verify_result"
    | "reflect";
  payload: Record<string, unknown>;
}

export interface SnapshotManifest {
  id: string;
  createdAt: string;
  sessionId: string;
  graphId?: string;
  files: Record<string, string>;
  root: string;
}

export interface HarnessOptions {
  cwd: string;
  sessionId: string;
  circuitBreakers?: Partial<CircuitBreakerConfig>;
  telemetryDir?: string;
  snapshotDir?: string;
  allowNetwork?: boolean;
}

export interface PhaseTransition {
  from: LoopPhase;
  to: LoopPhase;
  at: string;
  reason?: string;
  meta?: Record<string, unknown>;
}
