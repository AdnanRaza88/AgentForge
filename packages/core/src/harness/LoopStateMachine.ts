import type { LoopPhase, LoopState, PhaseTransition } from "./types.js";
import type { Telemetry } from "./Telemetry.js";

/**
 * Explicit, typed state machine for the agentic loop.
 * Phases: IDLE → PERCEIVE → PLAN → ACT → PERMISSION → EXECUTE → VERIFY
 *        → (REFLECT on failure) → REPORT → PERSIST → IDLE
 */
export class LoopStateMachine {
  private state: LoopState = { phase: "idle" };
  private history: PhaseTransition[] = [];
  private readonly telemetry: Telemetry;
  private readonly sessionId: string;
  private graphId?: string;

  constructor(telemetry: Telemetry, sessionId: string) {
    this.telemetry = telemetry;
    this.sessionId = sessionId;
  }

  getState(): LoopState {
    return this.state;
  }

  getPhase(): LoopPhase {
    return this.state.phase;
  }

  getHistory(): readonly PhaseTransition[] {
    return this.history;
  }

  setGraphId(id: string): void {
    this.graphId = id;
  }

  transition(next: LoopState, reason?: string): void {
    const from = this.state.phase;
    const to = next.phase;

    if (!isAllowedTransition(from, to)) {
      throw new Error(
        `Illegal loop transition: ${from} → ${to}${reason ? ` (${reason})` : ""}`,
      );
    }

    const at = new Date().toISOString();
    this.history.push({ from, to, at, reason, meta: extractMeta(next) });
    this.state = next;

    this.telemetry.emit(
      "phase_transition",
      { from, to, reason, ...extractMeta(next) },
      { graphId: this.graphId },
    );
  }

  toPerceive(userInput: string): void {
    this.transition({ phase: "perceive", userInput });
  }

  toPlan(goal: string, isTrivial = false): void {
    this.transition({ phase: "plan", goal, isTrivial });
  }

  toAct(
    nodeId: string,
    description: string,
    toolName?: string,
    args?: Record<string, unknown>,
  ): void {
    this.transition({ phase: "act", nodeId, description, toolName, args });
  }

  toPermission(
    nodeId: string,
    toolName: string,
    args: Record<string, unknown>,
    decision?: "allow" | "deny" | "ask",
  ): void {
    this.transition({
      phase: "permission",
      nodeId,
      toolName,
      args,
      decision,
    });
  }

  toExecute(
    nodeId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): void {
    this.transition({ phase: "execute", nodeId, toolName, args });
  }

  toVerify(
    nodeId: string,
    toolName: string,
    rawResult: string,
    success: boolean,
  ): void {
    this.transition({
      phase: "verify",
      nodeId,
      toolName,
      rawResult,
      success,
    });
  }

  toReflect(
    nodeId: string,
    failure: string,
    attempt: number,
    maxAttempts: number,
    diagnosis?: string,
  ): void {
    this.transition({
      phase: "reflect",
      nodeId,
      failure,
      attempt,
      maxAttempts,
      diagnosis,
    });
  }

  toReport(
    summary: string,
    completedNodes: string[],
    blockedNodes: string[],
  ): void {
    this.transition({
      phase: "report",
      summary,
      completedNodes,
      blockedNodes,
    });
  }

  toPersist(sessionId: string): void {
    this.transition({ phase: "persist", sessionId });
  }

  toIdle(): void {
    this.transition({ phase: "idle" });
  }
}

const ALLOWED: Record<LoopPhase, LoopPhase[]> = {
  idle: ["perceive"],
  perceive: ["plan", "act"],
  plan: ["act", "report"],
  act: ["permission", "execute", "verify", "reflect", "report"],
  permission: ["execute", "act", "reflect", "report"],
  execute: ["verify", "reflect", "report"],
  verify: ["act", "reflect", "report"],
  reflect: ["act", "plan", "report"],
  report: ["persist"],
  persist: ["idle"],
};

function isAllowedTransition(from: LoopPhase, to: LoopPhase): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

function extractMeta(state: LoopState): Record<string, unknown> {
  const { phase, ...rest } = state as LoopState & Record<string, unknown>;
  return rest;
}
