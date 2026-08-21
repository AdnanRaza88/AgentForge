import OpenAI from "openai";
import { OpenAIProvider } from "./openaiProvider.js";
import type { ChatParams, LLMResponse } from "./types.js";
import type { LLMProvider } from "./types.js";

/**
 * Factories for providers that speak the OpenAI Chat Completions API
 * (Groq, OpenRouter, Ollama, Together, Fireworks, etc.).
 * We reuse OpenAIProvider under the hood by pointing the client at a different baseURL.
 */

export function createGroqProvider(apiKey?: string): LLMProvider {
  if (!apiKey) throw new Error("GROQ_API_KEY is required for the Groq provider");
  return new OpenAIProvider(apiKey, "https://api.groq.com/openai/v1", "Groq");
}

export function createOpenRouterProvider(apiKey?: string): LLMProvider {
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required for the OpenRouter provider");
  return new OpenAIProvider(apiKey, "https://openrouter.ai/api/v1", "OpenRouter");
}

export function createOllamaProvider(baseURL = "http://localhost:11434/v1"): LLMProvider {
  // Ollama does not require an API key
  return new OpenAIProvider("ollama", baseURL, "Ollama");
}
