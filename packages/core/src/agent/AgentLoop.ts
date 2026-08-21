import type { LLMProvider, ChatMessage, ToolCall } from "../providers/types.js";
import type { ToolRegistry, ToolContext } from "../tools/ToolRegistry.js";
import type { PermissionEngine } from "../permissions/PermissionEngine.js";
import type { HookEngine } from "../hooks/HookEngine.js";
import type { AgentMode } from "../session/SessionStore.js";
import { parseMentions, formatMentionContexts } from "../mentions/parseMentions.js";

export interface AgentLoopOptions {
  cwd: string;
  provider: LLMProvider;
  model: string;
  tools: ToolRegistry;
  permissions: PermissionEngine;
  hooks: HookEngine;
  mode: AgentMode;
  ignorePatterns: string[];
}

export interface TurnResult {
  text: string;
  messages: ChatMessage[];
}

/**
 * The heart of AgentForge. Runs one user turn: expand mentions → call LLM →
 * execute tool calls (with permission checks) → loop until the model stops
 * requesting tools or a safety limit is hit.
 */
export class AgentLoop {
  private mode: AgentMode;
  private terminalBuffer: string[] = [];

  constructor(private opts: AgentLoopOptions) {
    this.mode = opts.mode;
  }

  getMode(): AgentMode {
    return this.mode;
  }

  setMode(mode: AgentMode): void {
    this.mode = mode;
  }

  recordTerminalOutput(output: string): void {
    this.terminalBuffer.push(output);
    if (this.terminalBuffer.length > 200) this.terminalBuffer.shift();
  }

  async runTurn(userInput: string, history: ChatMessage[], systemPrompt: string): Promise<TurnResult> {
    const { cleaned, contexts } = parseMentions(userInput, this.opts.cwd, this.terminalBuffer);
    const mentionBlock = formatMentionContexts(contexts);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
      {
        role: "user",
        content: mentionBlock ? `${mentionBlock}\n\n${cleaned}` : cleaned,
      },
    ];

    const newMessages: ChatMessage[] = [{ role: "user", content: userInput }];
    let finalText = "";
    const maxIterations = 12;

    for (let i = 0; i < maxIterations; i++) {
      const tools = this.mode === "plan" ? [] : this.opts.tools.list();
      const response = await this.opts.provider.chat({
        model: this.opts.model,
        messages,
        tools: tools.length ? tools : undefined,
      });

      finalText = response.text || finalText;

      if (!response.toolCalls || response.toolCalls.length === 0) {
        newMessages.push({ role: "assistant", content: response.text || "" });
        break;
      }

      // Assistant message with tool calls
      newMessages.push({
        role: "assistant",
        content: response.text || "",
        tool_calls: response.toolCalls,
      });
      messages.push({
        role: "assistant",
        content: response.text || "",
        tool_calls: response.toolCalls,
      });

      for (const tc of response.toolCalls) {
        const result = await this.executeToolCall(tc);
        const toolMsg: ChatMessage = {
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: result,
        };
        newMessages.push(toolMsg);
        messages.push(toolMsg);
      }
    }

    return { text: finalText, messages: newMessages };
  }

  private async executeToolCall(tc: ToolCall): Promise<string> {
    const tool = this.opts.tools.get(tc.function.name);
    if (!tool) return `Error: unknown tool ${tc.function.name}`;

    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(tc.function.arguments || "{}");
    } catch {
      return `Error: invalid tool arguments`;
    }

    if (this.mode === "plan") {
      return `Plan mode: would call ${tc.function.name}(${JSON.stringify(args)})`;
    }

    const allowed = await this.opts.permissions.check(
      tc.function.name,
      `Run tool ${tc.function.name}`,
      args,
    );
    if (!allowed) return `Permission denied for tool ${tc.function.name}`;

    await this.opts.hooks.fire({ event: "BeforeToolCall", toolName: tc.function.name });

    const ctx: ToolContext = {
      cwd: this.opts.cwd,
      onTerminalOutput: (o) => this.recordTerminalOutput(o),
    };

    try {
      const result = await tool.execute(args, ctx);
      await this.opts.hooks.fire({ event: "AfterToolCall", toolName: tc.function.name });
      return result.success ? result.output : `Error: ${result.error || result.output}`;
    } catch (err) {
      return `Error: ${(err as Error).message}`;
    }
  }
}
