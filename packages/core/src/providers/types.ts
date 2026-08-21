/**
 * Provider-agnostic LLM types.
 * Every adapter implements `LLMProvider` so the rest of the core never
 * branches on provider identity.
 */

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  permissionKey?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  tools?: ToolSchema[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface LLMProvider {
  id: string;
  label: string;
  supportsTools?: boolean;
  chat(params: ChatParams): Promise<LLMResponse>;
}

export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  inputPer1M?: number;
  outputPer1M?: number;
  contextWindow?: number;
  free?: boolean;
}
