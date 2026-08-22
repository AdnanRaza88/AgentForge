# AgentForge — Providers (v2)

Provider-agnostic by design. Configure via `.env` + `/config`.

## Supported

| Provider    | Env key            | Tools | Notes |
|-------------|--------------------|-------|-------|
| Anthropic   | `ANTHROPIC_API_KEY`| ✅    | Full tool_use / tool_result multi-turn |
| OpenAI      | `OPENAI_API_KEY`   | ✅    | GPT-4o family |
| Gemini      | `GEMINI_API_KEY`   | ✅    | Free tier; function calling |
| Groq        | `GROQ_API_KEY`     | ✅    | Fast open models |
| DeepSeek    | `DEEPSEEK_API_KEY` | ✅    | Strong coding + reasoner |
| OpenRouter  | `OPENROUTER_API_KEY`| ✅   | Many models, some free |
| Ollama      | `OLLAMA_BASE_URL`  | ✅    | Local, no key |
| OpenCode Zen| `OPENCODE_API_KEY` | ✅    | Curated coding models |
| Custom      | any base URL + key | ✅    | `createCustomProvider()` |

## Defaults

See `packages/core/src/providers/models.ts`.

## Usage

```ts
import { createProvider, defaultModelFor } from "@agentforge/core";

const provider = createProvider("deepseek");
const model = defaultModelFor("deepseek");
const res = await provider.chat({ model, messages: [...] });
```
