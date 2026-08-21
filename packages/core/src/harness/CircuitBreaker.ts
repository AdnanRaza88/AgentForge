import type { CircuitBreakerConfig } from "./types.js";
import { DEFAULT_CIRCUIT_BREAKERS } from "./types.js";

interface FailureSignature {
  toolName: string;
  argsHash: string;
  errorSignature: string;
  count: number;
}

/**
 * Deterministic circuit breakers.
 * Protects the user's codebase and the agent's budget from runaway loops.
 */
export class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private toolCallCount = 0;
  private nodeAttempts = new Map<string, number>();
  private lastFailures: FailureSignature[] = [];
  private tripped = false;
  private tripReason: string | null = null;

  constructor(partial?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKERS, ...partial };
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  recordToolCall(): void {
    this.toolCallCount += 1;
    if (this.toolCallCount > this.config.maxToolCallsPerTask) {
      this.trip(
        `Task exceeded global tool-call budget (${this.config.maxToolCallsPerTask})`,
      );
    }
  }

  getToolCallCount(): number {
    return this.toolCallCount;
  }

  recordNodeAttempt(nodeId: string): number {
    const current = (this.nodeAttempts.get(nodeId) ?? 0) + 1;
    this.nodeAttempts.set(nodeId, current);
    return Math.max(0, this.config.maxRetriesPerNode - current);
  }

  getNodeAttempts(nodeId: string): number {
    return this.nodeAttempts.get(nodeId) ?? 0;
  }

  isNodeExhausted(nodeId: string): boolean {
    return this.getNodeAttempts(nodeId) >= this.config.maxRetriesPerNode;
  }

  recordFailure(
    toolName: string,
    args: Record<string, unknown>,
    error: string,
  ): boolean {
    const argsHash = stableHash(args);
    const errorSignature = error.slice(0, 240).replace(/\s+/g, " ").trim();

    const existing = this.lastFailures.find(
      (f) =>
        f.toolName === toolName &&
        f.argsHash === argsHash &&
        f.errorSignature === errorSignature,
    );

    if (existing) {
      existing.count += 1;
      if (existing.count >= this.config.identicalFailureLimit) {
        return true;
      }
    } else {
      this.lastFailures.push({
        toolName,
        argsHash,
        errorSignature,
        count: 1,
      });
      if (this.lastFailures.length > 12) this.lastFailures.shift();
    }
    return false;
  }

  clearFailure(toolName: string, args: Record<string, unknown>): void {
    const argsHash = stableHash(args);
    this.lastFailures = this.lastFailures.filter(
      (f) => !(f.toolName === toolName && f.argsHash === argsHash),
    );
  }

  isTripped(): boolean {
    return this.tripped;
  }

  getTripReason(): string | null {
    return this.tripReason;
  }

  private trip(reason: string): void {
    this.tripped = true;
    this.tripReason = reason;
    throw new CircuitBreakerError(reason);
  }

  shouldWarnTokenBudget(cumulativeTokens: number): boolean {
    return (
      this.config.tokenBudgetWarning > 0 &&
      cumulativeTokens >= this.config.tokenBudgetWarning
    );
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

function stableHash(obj: Record<string, unknown>): string {
  try {
    return JSON.stringify(obj, Object.keys(obj).sort());
  } catch {
    return String(Math.random());
  }
}
