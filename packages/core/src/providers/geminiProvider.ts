import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatParams, LLMProvider, LLMResponse, ToolCall } from "./types.js";

export class GeminiProvider implements LLMProvider {
  id = "gemini";
  label = "Google Gemini";
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is required for the Gemini provider");
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async chat(params: ChatParams): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: params.model || "gemini-1.5-flash",
      systemInstruction: params.messages.find((m) => m.role === "system")?.content,
    });

    const history = params.messages
      .filter((m) => m.role !== "system")
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastUser = params.messages.filter((m) => m.role === "user").pop()?.content || "";

    const chat = model.startChat({ history: history as any });
    const result = await chat.sendMessage(lastUser);
    const text = result.response.text();

    return {
      text,
      finishReason: "stop",
    };
  }
}
