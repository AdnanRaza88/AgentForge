# AgentForge — Providers

AgentForge is provider-agnostic. Configure via `.env` or `/config`.

## Supported

| Provider     | Env key              | Notes                          |
|--------------|----------------------|--------------------------------|
| Anthropic    | ANTHROPIC_API_KEY    | Claude models                  |
| OpenAI       | OPENAI_API_KEY       | GPT-4o, o1, etc.               |
| Gemini       | GEMINI_API_KEY       | Free tier available            |
| Groq         | GROQ_API_KEY         | Fast inference                 |
| OpenRouter   | OPENROUTER_API_KEY   | Many models via one key        |
| Ollama       | OLLAMA_BASE_URL      | Local, no key needed           |
| OpenAI-compat| any base URL + key   | Any OpenAI-compatible endpoint |

See `packages/core/src/providers/` for implementation.
