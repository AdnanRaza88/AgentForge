import type { Session } from "./SessionStore.js";
import type { LLMProvider, ChatMessage } from "../providers/types.js";

/** Rough char-based estimate (docs note real tokenizers as Phase 2 work). */
export function contextUsagePercent(session: Session, contextWindow = 128_000): number {
  const chars = session.messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const approxTokens = chars / 4;
  return Math.min(100, Math.round((approxTokens / contextWindow) * 100));
}

/**
 * Summarize older messages into a single system-style note so the live
 * conversation stays within the context window. The most recent N messages
 * are kept verbatim.
 */
export async function compactSession(
  session: Session,
  provider: LLMProvider,
  keepRecent = 12,
): Promise<Session> {
  if (session.messages.length <= keepRecent + 2) return session;

  const toSummarize = session.messages.slice(0, -keepRecent);
  const recent = session.messages.slice(-keepRecent);

  const summaryPrompt: ChatMessage[] = [
    {
      role: "system",
      content: "Summarize the following conversation history into a concise paragraph that preserves key decisions, file paths, and outstanding tasks. Output only the summary.",
    },
    {
      role: "user",
      content: toSummarize.map((m) => `${m.role}: ${m.content}`).join("\n\n"),
    },
  ];

  try {
    const result = await provider.chat({ model: session.model, messages: summaryPrompt, maxTokens: 800 });
    const summaryMsg: ChatMessage = {
      role: "system",
      content: `[Conversation summary of earlier turns]\n${result.text}`,
    };
    return { ...session, messages: [summaryMsg, ...recent] };
  } catch {
    // If summarization fails, just drop the oldest half
    return { ...session, messages: session.messages.slice(-Math.floor(session.messages.length / 2)) };
  }
}
