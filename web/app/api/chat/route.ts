/**
 * POST /api/chat — OWNER: Agent C.
 *
 * Flow:
 *  1. Validate Content-Type + same-origin
 *  2. Validate request body against chatRequestSchema (Zod)
 *  3. rateLimiter.check(fingerprint, ip)  -> 429 + Retry-After if blocked
 *  4. Sanitize last user message (sanitizeUserContent + wrapUserMessage)
 *  5. Load system prompt via loadSystemPrompt(mbti)
 *  6. Stream Claude response via streamChat() back as SSE
 *  7. On any error, emit an SSE error frame then [DONE]
 *
 * Security:
 *  - Never reflect the system prompt or API key to the client
 *  - Never log full user message content (redact)
 */
import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ClaudeError, hasApiKey, streamChat } from '@/lib/claude';
import { loadSystemPrompt } from '@/lib/mbti';
import { rateLimiter } from '@/lib/ratelimit';
import { redact, sanitizeUserContent, wrapUserMessage } from '@/lib/security';
import { encodeDone, encodeSSE } from '@/lib/stream';
import {
  chatRequestSchema,
  type ApiError,
  type ChatMessage,
  type ChatRequest,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SSE_HEADERS_BASE = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

const STREAM_TIMEOUT_MS = 25_000;

if (!hasApiKey() && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[chat] ANTHROPIC_API_KEY missing — /api/chat will respond 503 until configured.',
  );
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  const first = xff?.split(',')[0]?.trim();
  if (first) return first;
  return req.headers.get('x-client-ip')?.trim() || 'unknown';
}

function isSameOrigin(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser callers (curl) are fine; CSRF needs Origin.
  const host = req.headers.get('host');
  if (!host) return false;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

function sseError(
  err: ApiError,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(encodeSSE({ ...err })));
      controller.enqueue(enc.encode(encodeDone()));
      controller.close();
    },
  });
  return new Response(body, {
    status,
    headers: { ...SSE_HEADERS_BASE, ...(extraHeaders ?? {}) },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const startedAt = Date.now();
  let fingerprint = 'unknown';
  let mbti = '----';

  if (req.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return sseError(
      { error: 'validation_error', message: 'Content-Type must be application/json' },
      415,
    );
  }

  if (!isSameOrigin(req)) {
    return sseError(
      { error: 'validation_error', message: 'Cross-origin requests are not allowed' },
      403,
    );
  }

  if (!hasApiKey()) {
    console.error(`[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} status=503 ms=${Date.now() - startedAt} reason=missing_key`);
    return sseError(
      { error: 'internal_error', message: '服务未配置，请稍后再试' },
      503,
    );
  }

  let parsed: ChatRequest;
  try {
    const json = (await req.json()) as unknown;
    parsed = chatRequestSchema.parse(json);
  } catch (err) {
    const message =
      err instanceof ZodError
        ? err.issues[0]?.message ?? 'Invalid request body'
        : err instanceof SyntaxError
          ? 'Malformed JSON'
          : 'Invalid request body';
    console.error(`[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} status=400 ms=${Date.now() - startedAt} reason=${err instanceof ZodError ? 'zod' : 'json'}`);
    return sseError({ error: 'validation_error', message }, 400);
  }

  fingerprint = parsed.fingerprint;
  mbti = parsed.mbti;
  const ip = getClientIp(req);

  let limit;
  try {
    limit = await rateLimiter.check(fingerprint, ip);
  } catch (err) {
    console.error(
      `[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} rateLimiter_failed`,
      err instanceof Error ? err.message : err,
    );
    limit = {
      allowed: true,
      remaining: 0,
      limit: 0,
      resetAt: Date.now() + 60_000,
    };
  }

  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    console.warn(
      `[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} status=429 ms=${Date.now() - startedAt}`,
    );
    return sseError(
      { error: 'rate_limited', message: '今天的免费额度已用完', retryAfter },
      429,
      { 'Retry-After': String(retryAfter) },
    );
  }

  const lastUserIdx = (() => {
    for (let i = parsed.messages.length - 1; i >= 0; i--) {
      if (parsed.messages[i]?.role === 'user') return i;
    }
    return -1;
  })();

  if (lastUserIdx === -1) {
    console.error(`[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} status=400 ms=${Date.now() - startedAt} reason=no_user_message`);
    return sseError(
      { error: 'validation_error', message: '消息中必须包含用户提问' },
      400,
    );
  }

  const lastUser = parsed.messages[lastUserIdx]!;
  const sanitized = sanitizeUserContent(lastUser.content);
  if (!sanitized.safe) {
    console.warn(
      `[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} status=400 ms=${Date.now() - startedAt} reason=${sanitized.reason} preview="${redact(lastUser.content)}"`,
    );
    return sseError(
      { error: 'validation_error', message: '消息内容不被允许' },
      400,
    );
  }

  const wrappedMessages: ChatMessage[] = parsed.messages.map((m, i) =>
    i === lastUserIdx
      ? { role: m.role, content: wrapUserMessage(sanitized.content) }
      : m,
  );

  let systemPrompt: string;
  try {
    systemPrompt = await loadSystemPrompt(parsed.mbti);
  } catch (err) {
    console.error(
      `[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} status=500 ms=${Date.now() - startedAt} reason=prompt_load`,
      err instanceof Error ? err.message : err,
    );
    return sseError(
      { error: 'internal_error', message: '加载导师人格失败' },
      500,
    );
  }

  // eslint-disable-next-line no-console
  console.info(
    `[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} status=200 ms=${Date.now() - startedAt} preview="${redact(sanitized.content)}"`,
  );

  const upstreamAbort = new AbortController();
  const timeoutId = setTimeout(() => {
    upstreamAbort.abort();
  }, STREAM_TIMEOUT_MS);
  const onClientAbort = () => upstreamAbort.abort();
  req.signal.addEventListener('abort', onClientAbort);

  const enc = new TextEncoder();
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearTimeout(timeoutId);
    req.signal.removeEventListener('abort', onClientAbort);
  };

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          enc.encode(
            encodeSSE({
              meta: true,
              remaining: limit.remaining,
              limit: limit.limit,
              resetAt: limit.resetAt,
            }),
          ),
        );

        const iter = streamChat({
          mbti: parsed.mbti,
          systemPrompt,
          messages: wrappedMessages,
          tier: 'free',
          signal: upstreamAbort.signal,
        });

        for await (const delta of iter) {
          if (upstreamAbort.signal.aborted) break;
          controller.enqueue(enc.encode(encodeSSE({ delta })));
        }
      } catch (err) {
        const apiErr = mapErrorToApi(err);
        console.error(
          `[chat] fp=${fingerprint.slice(0, 8)} mbti=${mbti} status=stream_${apiErr.status} ms=${Date.now() - startedAt} reason=${apiErr.body.error}`,
          err instanceof Error ? err.message : err,
        );
        try {
          controller.enqueue(enc.encode(encodeSSE({ ...apiErr.body })));
        } catch {
          // controller may be closed if client already aborted
        }
      } finally {
        try {
          controller.enqueue(enc.encode(encodeDone()));
        } catch {
          // ignore
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
        cleanup();
      }
    },
    cancel() {
      upstreamAbort.abort();
      cleanup();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      ...SSE_HEADERS_BASE,
      'X-RateLimit-Remaining': String(limit.remaining),
      'X-RateLimit-Limit': String(limit.limit),
      'X-RateLimit-Reset': String(limit.resetAt),
    },
  });
}

function mapErrorToApi(err: unknown): { status: number; body: ApiError } {
  if (err instanceof ClaudeError) {
    if (err.statusCode === 429) {
      return {
        status: 502,
        body: { error: 'upstream_error', message: '上游服务繁忙，请稍后再试' },
      };
    }
    if (err.statusCode >= 500 || err.upstream) {
      return {
        status: 502,
        body: { error: 'upstream_error', message: '上游服务暂时不可用' },
      };
    }
    if (err.statusCode === 499) {
      return { status: 499, body: { error: 'timeout', message: '请求已取消' } };
    }
    return {
      status: err.statusCode,
      body: { error: 'upstream_error', message: '请求失败' },
    };
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return { status: 499, body: { error: 'timeout', message: '请求已取消' } };
  }
  return { status: 500, body: { error: 'internal_error', message: '服务内部错误' } };
}
