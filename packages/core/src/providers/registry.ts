import type { LLMProvider } from "./types.js";
import { AnthropicProvider } from "./anthropicProvider.js";
import { OpenAIProvider } from "./openaiProvider.js";
import { GeminiProvider } from "./geminiProvider.js";
import {
  createGroqProvider,
  createOpenRouterProvider,
  createOllamaProvider,
  createDeepSeekProvider,
  createCompatibleProvider,
} from "./openaiCompatible.js";
import { DEFAULT_MODELS } from "./models.js";

export type ProviderId =
  | "anthropic"
  | "openai"
  | "gemini"
  | "groq"
  | "openrouter"
  | "ollama"
  | "deepseek"
  | "opencode-zen"
  | "custom";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  free: boolean;
  envKey: string;
  defaultModel: string;
  help: string;
}

export const AVAILABLE_PROVIDERS: ProviderMeta[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    free: false,
    envKey: "ANTHROPIC_API_KEY",
    defaultModel: DEFAULT_MODELS.anthropic,
    help: "Best coding quality. Set ANTHROPIC_API_KEY.",
  },
  {
    id: "openai",
    label: "OpenAI (GPT)",
    free: false,
    envKey: "OPENAI_API_KEY",
    defaultModel: DEFAULT_MODELS.openai,
    help: "GPT-4o and family. Set OPENAI_API_KEY.",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    free: true,
    envKey: "GEMINI_API_KEY",
    defaultModel: DEFAULT_MODELS.gemini,
    help: "Strong free tier. Get a key at aistudio.google.com.",
  },
  {
    id: "groq",
    label: "Groq (fast open models)",
    free: true,
    envKey: "GROQ_API_KEY",
    defaultModel: DEFAULT_MODELS.groq,
    help: "Very fast Llama/etc. Free tier available.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    free: false,
    envKey: "DEEPSEEK_API_KEY",
    defaultModel: DEFAULT_MODELS.deepseek,
    help: "Strong coding + reasoning models at low cost.",
  },
  {
    id: "openrouter",
    label: "OpenRouter (many models)",
    free: true,
    envKey: "OPENROUTER_API_KEY",
    defaultModel: DEFAULT_MODELS.openrouter,
    help: "One key → many models, including free ones.",
  },
  {
    id: "ollama",
    label: "Ollama (local, 100% free)",
    free: true,
    envKey: "OLLAMA_BASE_URL",
    defaultModel: DEFAULT_MODELS.ollama,
    help: "Fully local. Install ollama.com — no API key needed.",
  },
  {
    id: "opencode-zen",
    label: "OpenCode Zen",
    free: false,
    envKey: "OPENCODE_API_KEY",
    defaultModel: "opencode/gpt-5.1-codex",
    help: "Curated coding models via opencode.ai/zen. Set OPENCODE_API_KEY.",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    free: true,
    envKey: "CUSTOM_API_KEY",
    defaultModel: "default",
    help: "Any OpenAI-compatible base URL. Set customBaseURL + CUSTOM_API_KEY in settings.",
  },
];

export function createProvider(
  id: ProviderId,
  env: NodeJS.ProcessEnv = process.env,
): LLMProvider {
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
      return createOllamaProvider(
        env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
      );
    case "deepseek":
      return createDeepSeekProvider(env.DEEPSEEK_API_KEY);
    case "opencode-zen":
      return createCompatibleProvider({
        apiKey: env.OPENCODE_API_KEY || env.OPENCODE_ZEN_API_KEY,
        baseURL: "https://opencode.ai/zen/v1",
        label: "OpenCode Zen",
        id: "opencode-zen",
      });
    case "custom": {
      const base =
        env.CUSTOM_BASE_URL || env.OPENAI_BASE_URL || "http://localhost:8080/v1";
      return createCompatibleProvider({
        apiKey: env.CUSTOM_API_KEY || env.OPENAI_API_KEY || "no-key",
        baseURL: base,
        label: env.CUSTOM_PROVIDER_LABEL || "Custom",
        id: "custom",
      });
    }
    default:
      throw new Error(`Unknown provider id: ${id}`);
  }
}

export function createCustomProvider(opts: {
  apiKey?: string;
  baseURL: string;
  label?: string;
}): LLMProvider {
  return createCompatibleProvider(opts);
}

export function getProviderMeta(id: string): ProviderMeta | undefined {
  return AVAILABLE_PROVIDERS.find((p) => p.id === id);
}

export function defaultModelFor(id: ProviderId): string {
  return DEFAULT_MODELS[id] ?? "gpt-4o";
}
