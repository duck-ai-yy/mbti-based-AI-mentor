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
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { INPUT_LIMITS, type ChatMessage, type MBTIType } from './types';

const DEFAULT_FREE_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_PAID_MODEL = 'claude-sonnet-4-6';
const SDK_TIMEOUT_MS = 25_000;

export class ClaudeError extends Error {
  readonly statusCode: number;
  readonly upstream: boolean;

  constructor(message: string, statusCode: number, opts?: { upstream?: boolean; cause?: unknown }) {
    super(message);
    this.name = 'ClaudeError';
    this.statusCode = statusCode;
    this.upstream = opts?.upstream ?? true;
    if (opts?.cause !== undefined) {
      (this as { cause?: unknown }).cause = opts.cause;
    }
  }
}

export interface StreamChatParams {
  mbti: MBTIType;
  systemPrompt: string;
  messages: ChatMessage[];
  tier: 'free' | 'paid';
  signal?: AbortSignal;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new ClaudeError('Service not configured', 503, { upstream: false });
  }
  cachedClient = new Anthropic({ apiKey, timeout: SDK_TIMEOUT_MS, maxRetries: 0 });
  return cachedClient;
}

function pickModel(tier: 'free' | 'paid'): string {
  const fromEnv =
    tier === 'paid'
      ? process.env.CLAUDE_MODEL_PAID?.trim()
      : process.env.CLAUDE_MODEL_FREE?.trim();
  if (fromEnv) return fromEnv;
  return tier === 'paid' ? DEFAULT_PAID_MODEL : DEFAULT_FREE_MODEL;
}

export async function* streamChat(
  params: StreamChatParams,
): AsyncIterable<string> {
  const { systemPrompt, messages, tier, signal } = params;
  const client = getClient();
  const model = pickModel(tier);

  try {
    const stream = client.messages.stream(
      {
        model,
        max_tokens: INPUT_LIMITS.maxOutputTokens,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      signal ? { signal } : undefined,
    );

    try {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }
    } finally {
      try {
        stream.controller.abort();
      } catch {
        // ignore: stream may already be closed
      }
    }
  } catch (err) {
    if (err instanceof ClaudeError) throw err;
    if (err instanceof APIError) {
      const status = err.status ?? 502;
      throw new ClaudeError(err.message || 'Upstream error', status, {
        upstream: true,
        cause: err,
      });
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ClaudeError('Request aborted', 499, { upstream: false, cause: err });
    }
    throw new ClaudeError('Upstream connection failed', 502, {
      upstream: true,
      cause: err,
    });
  }
}
