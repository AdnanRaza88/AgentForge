import { OpenAIProvider } from "./openaiProvider.js";
import type { LLMProvider } from "./types.js";

/**
 * Factories for providers that speak the OpenAI Chat Completions API.
 * Reuses OpenAIProvider with a different baseURL + label + id.
 */

export function createGroqProvider(apiKey?: string): LLMProvider {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required for the Groq provider");
  }
  return new OpenAIProvider(
    apiKey,
    "https://api.groq.com/openai/v1",
    "Groq",
    "groq",
  );
}

export function createOpenRouterProvider(apiKey?: string): LLMProvider {
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for the OpenRouter provider");
  }
  return new OpenAIProvider(
    apiKey,
    "https://openrouter.ai/api/v1",
    "OpenRouter",
    "openrouter",
  );
}

export function createOllamaProvider(
  baseURL = "http://localhost:11434/v1",
): LLMProvider {
  return new OpenAIProvider("ollama", baseURL, "Ollama (local)", "ollama");
}

export function createDeepSeekProvider(apiKey?: string): LLMProvider {
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is required for the DeepSeek provider");
  }
  return new OpenAIProvider(
    apiKey,
    "https://api.deepseek.com",
    "DeepSeek",
    "deepseek",
  );
}

export function createCompatibleProvider(opts: {
  apiKey?: string;
  baseURL: string;
  label?: string;
  id?: string;
}): LLMProvider {
  return new OpenAIProvider(
    opts.apiKey || "no-key",
    opts.baseURL,
    opts.label || "OpenAI-compatible",
    opts.id || "compatible",
  );
}
