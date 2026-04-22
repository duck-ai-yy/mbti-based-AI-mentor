/**
 * Claude API client wrapper.
 * OWNER: Agent C (backend).
 *
 * Responsibilities:
 *  - Initialize Anthropic SDK with server-side key
 *  - Stream completions with proper timeout + abort
 *  - Expose a single streamChat() that returns an async iterable of text deltas
 *  - Never log full user content; redact for observability
 */
import { INPUT_LIMITS, type ChatMessage, type MBTIType } from './types';

export interface StreamChatParams {
  mbti: MBTIType;
  systemPrompt: string;
  messages: ChatMessage[];
  tier: 'free' | 'paid';
  signal?: AbortSignal;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function* streamChat(_params: StreamChatParams): AsyncIterable<string> {
  // TODO(Agent C): implement with @anthropic-ai/sdk
  // - respect INPUT_LIMITS.maxOutputTokens
  // - timeout via AbortController after INPUT_LIMITS.requestTimeoutMs
  // - handle 429/5xx from Anthropic with typed error
  void INPUT_LIMITS;
  throw new Error('streamChat: not implemented');
}
