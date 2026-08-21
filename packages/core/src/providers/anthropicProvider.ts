import Anthropic from "@anthropic-ai/sdk";
import type { ChatParams, LLMProvider, LLMResponse, ToolCall } from "./types.js";

export class AnthropicProvider implements LLMProvider {
  id = "anthropic";
  label = "Anthropic (Claude)";
  private client: Anthropic;

  constructor(apiKey?: string) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required for the Anthropic provider");
    this.client = new Anthropic({ apiKey });
  }

  async chat(params: ChatParams): Promise<LLMResponse> {
    const system = params.messages.find((m) => m.role === "system")?.content;
    const messages = params.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    const tools = params.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
    }));

    const response = await this.client.messages.create({
      model: params.model || "claude-3-5-sonnet-20241022",
      max_tokens: params.maxTokens || 4096,
      system: system || undefined,
      messages,
      tools: tools?.length ? tools : undefined,
    });

    let text = "";
    const toolCalls: ToolCall[] = [];
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
      if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          type: "function",
          function: { name: block.name, arguments: JSON.stringify(block.input) },
        });
      }
    }

    return {
      text,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      finishReason: response.stop_reason || undefined,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  }
}
