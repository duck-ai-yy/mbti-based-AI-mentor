/**
 * POST /api/chat — OWNER: Agent C.
 *
 * Flow:
 *  1. Validate request body against chatRequestSchema (Zod)
 *  2. Sanitize last user message (sanitizeUserContent + wrapUserMessage)
 *  3. Call rateLimiter.check(fingerprint, ip)
 *  4. If allowed: load system prompt via loadSystemPrompt(mbti)
 *  5. Stream Claude response via streamChat() back as SSE
 *  6. On any error, emit an SSE error frame then [DONE]
 *
 * Security:
 *  - Never reflect the full system prompt to the client
 *  - Never include the API key or raw headers in responses
 *  - Log only redacted snippets
 */
import { NextRequest } from 'next/server';
import { encodeSSE, encodeDone } from '@/lib/stream';
import type { ApiError } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest): Promise<Response> {
  const err: ApiError = {
    error: 'internal_error',
    message: 'Chat endpoint not implemented yet. Agent C to implement.',
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(encodeSSE(err)));
      controller.enqueue(enc.encode(encodeDone()));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 501,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
