import OpenAI from "openai";
import type { ChatParams, LLMProvider, LLMResponse, ToolCall } from "./types.js";

export class OpenAIProvider implements LLMProvider {
  id = "openai";
  label = "OpenAI";
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string, label?: string) {
    if (!apiKey) throw new Error("OPENAI_API_KEY (or compatible key) is required");
    this.client = new OpenAI({ apiKey, baseURL });
    if (label) this.label = label;
    if (baseURL?.includes("groq")) this.id = "groq";
    if (baseURL?.includes("openrouter")) this.id = "openrouter";
    if (baseURL?.includes("ollama") || baseURL?.includes("11434")) this.id = "ollama";
  }

  async chat(params: ChatParams): Promise<LLMResponse> {
    const tools = params.tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: params.model || "gpt-4o",
      messages: params.messages as any,
      tools: tools?.length ? tools : undefined,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    });

    const choice = response.choices[0];
    const message = choice.message;
    const toolCalls: ToolCall[] | undefined = message.tool_calls?.map((tc) => ({
      id: tc.id,
      type: "function",
      function: { name: tc.function.name, arguments: tc.function.arguments },
    }));

    return {
      text: message.content || "",
      toolCalls,
      finishReason: choice.finish_reason || undefined,
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
      },
    };
  }
}
