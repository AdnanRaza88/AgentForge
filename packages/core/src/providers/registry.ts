import type { LLMProvider } from "./types.js";
import { AnthropicProvider } from "./anthropicProvider.js";
import { OpenAIProvider } from "./openaiProvider.js";
import { GeminiProvider } from "./geminiProvider.js";
import { createGroqProvider, createOpenRouterProvider, createOllamaProvider } from "./openaiCompatible.js";

export type ProviderId = "anthropic" | "openai" | "gemini" | "groq" | "openrouter" | "ollama";

export const AVAILABLE_PROVIDERS: { id: ProviderId; label: string; free: boolean }[] = [
  { id: "anthropic", label: "Anthropic (Claude)", free: false },
  { id: "openai", label: "OpenAI (GPT)", free: false },
  { id: "gemini", label: "Google Gemini", free: true },
  { id: "groq", label: "Groq (fast open models)", free: true },
  { id: "openrouter", label: "OpenRouter (many models incl. free)", free: true },
  { id: "ollama", label: "Ollama (local, 100% free)", free: true },
];

/**
 * Builds a live provider instance from an id + the process env. This is the
 * single choke point for "which provider is active" — swap providers by
 * changing `provider` in .agentforge/settings.json, nothing else changes.
 */
export function createProvider(id: ProviderId, env: NodeJS.ProcessEnv = process.env): LLMProvider {
  switch (id) {
    case "anthropic":
      return new AnthropicProvider(env.ANTHROPIC_API_KEY);
    case "openai":
      return new OpenAIProvider(env.OPENAI_API_KEY);
    case "gemini":
      return new GeminiProvider(env.GEMINI_API_KEY);
    case "groq":
      return createGroqProvider(env.GROQ_API_KEY);
    case "openrouter":
      return createOpenRouterProvider(env.OPENROUTER_API_KEY);
    case "ollama":
      return createOllamaProvider(env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1");
    default:
      throw new Error(`Unknown provider id: ${id}`);
  }
}
