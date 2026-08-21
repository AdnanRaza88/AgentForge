import type { ModelInfo } from "./types.js";
import type { ProviderId } from "./registry.js";

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    provider: "anthropic",
    inputPer1M: 3,
    outputPer1M: 15,
    contextWindow: 200_000,
  },
  {
    id: "claude-3-5-haiku-20241022",
    label: "Claude 3.5 Haiku",
    provider: "anthropic",
    inputPer1M: 0.8,
    outputPer1M: 4,
    contextWindow: 200_000,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    inputPer1M: 2.5,
    outputPer1M: 10,
    contextWindow: 128_000,
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    contextWindow: 128_000,
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    provider: "gemini",
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    contextWindow: 1_000_000,
    free: true,
  },
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "gemini",
    inputPer1M: 1.25,
    outputPer1M: 5,
    contextWindow: 2_000_000,
  },
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B (Groq)",
    provider: "groq",
    inputPer1M: 0.59,
    outputPer1M: 0.79,
    contextWindow: 128_000,
    free: true,
  },
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant (Groq)",
    provider: "groq",
    inputPer1M: 0.05,
    outputPer1M: 0.08,
    contextWindow: 128_000,
    free: true,
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek Chat (V3)",
    provider: "deepseek",
    inputPer1M: 0.27,
    outputPer1M: 1.1,
    contextWindow: 64_000,
  },
  {
    id: "deepseek-reasoner",
    label: "DeepSeek Reasoner (R1)",
    provider: "deepseek",
    inputPer1M: 0.55,
    outputPer1M: 2.19,
    contextWindow: 64_000,
  },
  {
    id: "openrouter/auto",
    label: "OpenRouter Auto",
    provider: "openrouter",
    free: true,
  },
  {
    id: "llama3.2",
    label: "Llama 3.2 (Ollama local)",
    provider: "ollama",
    inputPer1M: 0,
    outputPer1M: 0,
    free: true,
  },
  {
    id: "qwen2.5-coder",
    label: "Qwen2.5 Coder (Ollama local)",
    provider: "ollama",
    inputPer1M: 0,
    outputPer1M: 0,
    free: true,
  },
];

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  openrouter: "openrouter/auto",
  ollama: "llama3.2",
  deepseek: "deepseek-chat",
  "opencode-zen": "gpt-5.1-codex",
  custom: "default",
};

export function modelsForProvider(providerId: string): ModelInfo[] {
  return MODEL_CATALOG.filter((m) => m.provider === providerId);
}

export function estimateCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const m = MODEL_CATALOG.find((x) => x.id === modelId);
  if (!m || m.inputPer1M == null || m.outputPer1M == null) return null;
  return (
    (inputTokens / 1_000_000) * m.inputPer1M +
    (outputTokens / 1_000_000) * m.outputPer1M
  );
}
