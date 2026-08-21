import type { Settings } from "../config/settings.js";

export type PermissionDecision = "allow" | "ask" | "deny";

export interface PermissionRequest {
  toolName: string;
  description: string;
  args?: Record<string, unknown>;
}

/**
 * Resolves whether a tool call is allowed, denied, or needs interactive
 * approval. Decisions come from settings.permissions and can be updated at
 * runtime via /permission.
 */
export class PermissionEngine {
  constructor(
    private settings: Settings,
    private askUser: (req: PermissionRequest) => Promise<boolean>,
  ) {}

  async check(toolName: string, description: string, args?: Record<string, unknown>): Promise<boolean> {
    const key = toolName;
    const decision: PermissionDecision =
      (this.settings.permissions[key] as PermissionDecision) ??
      (this.settings.permissions["*"] as PermissionDecision) ??
      "ask";

    if (decision === "allow") return true;
    if (decision === "deny") return false;

    // "ask"
    return this.askUser({ toolName, description, args });
  }

  updatePermission(tool: string, decision: PermissionDecision): void {
    this.settings.permissions[tool] = decision;
  }
}
