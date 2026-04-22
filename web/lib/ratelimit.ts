/**
 * Rate limiter.
 * OWNER: Agent D (security).
 *
 * Contract: implements RateLimiter from ./types.
 * Default export is a singleton consumed by /api/chat.
 *
 * Requirements:
 *  - Per-fingerprint daily quota (FREE_MESSAGES_PER_DAY env, default 3)
 *  - Per-IP burst limit (e.g. 10 req / min) to stop scripted abuse
 *  - Upstash Redis if env vars present; in-memory fallback otherwise
 *  - Stable across serverless cold starts when Redis is configured
 */
import type { RateLimiter, RateLimitResult } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// Placeholder in-memory implementation. Agent D MUST replace with
// a production-grade limiter (Upstash + sliding window).
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function limitFromEnv(): number {
  const raw = process.env.FREE_MESSAGES_PER_DAY;
  const n = raw ? Number.parseInt(raw, 10) : 3;
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export const rateLimiter: RateLimiter = {
  async check(fingerprint, _ip): Promise<RateLimitResult> {
    const limit = limitFromEnv();
    const now = Date.now();
    const entry = memoryStore.get(fingerprint);

    if (!entry || entry.resetAt < now) {
      memoryStore.set(fingerprint, { count: 1, resetAt: now + DAY_MS });
      return { allowed: true, remaining: limit - 1, limit, resetAt: now + DAY_MS };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, limit, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: limit - entry.count,
      limit,
      resetAt: entry.resetAt,
    };
  },

  async reset(fingerprint) {
    memoryStore.delete(fingerprint);
  },
};
