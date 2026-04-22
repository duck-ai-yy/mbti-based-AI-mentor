/**
 * Streaming helpers.
 * OWNER: Agent B (chat UI), with server-side helpers usable by Agent C.
 *
 * Contract:
 *  - Server writes SSE frames: `data: {"delta":"..."}` lines, final `data: [DONE]`
 *  - Error frames: `data: {"error":"..."}` then [DONE]
 *  - Client uses streamResponse() to parse a fetch() ReadableStream
 */

export interface StreamEvent {
  type: 'delta' | 'done' | 'error' | 'meta';
  data?: unknown;
}

export function encodeSSE(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function encodeDone(): string {
  return 'data: [DONE]\n\n';
}

export async function* streamResponse(
  response: Response,
): AsyncIterable<StreamEvent> {
  if (!response.body) {
    yield { type: 'error', data: 'no_body' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          yield { type: 'done' };
          return;
        }
        try {
          const parsed = JSON.parse(payload) as Record<string, unknown>;
          if ('error' in parsed) yield { type: 'error', data: parsed.error };
          else if ('delta' in parsed) yield { type: 'delta', data: parsed.delta };
          else yield { type: 'meta', data: parsed };
        } catch {
          // swallow malformed frame
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
