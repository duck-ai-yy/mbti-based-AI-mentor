/**
 * Rate limiter.
 * OWNER: Agent D (security).
 *
 * Contract: implements RateLimiter from ./types.
 * Default export is a singleton consumed by /api/chat.
 *
 * Two-layer sliding window:
 *   - per fingerprint, daily quota (FREE_MESSAGES_PER_DAY, default 3)
 *   - per IP, 10 requests / minute (anti-burst)
 * Both layers must allow → allowed=true. The stricter resetAt is returned
 * so users can retry as soon as either window frees up.
 *
 * If UPSTASH_REDIS_REST_URL + _TOKEN are present we use @upstash/ratelimit
 * sliding-window (stable across cold starts). Otherwise we fall back to an
 * in-memory Map — ONLY safe for `next dev`; emits a startup warning.
 *
 * Fail-open: if Upstash itself errors we log and allow the request. Locking
 * out every user when Redis is down is worse than letting some abuse slip.
 */
import type { RateLimiter, RateLimitResult } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const IP_LIMIT_PER_MINUTE = 10;

function dailyLimitFromEnv(): number {
  const raw = process.env.FREE_MESSAGES_PER_DAY;
  const n = raw ? Number.parseInt(raw, 10) : 3;
  return Number.isFinite(n) && n > 0 ? n : 3;
}

interface Bucket {
  count: number;
  resetAt: number;
}

interface Backend {
  checkFingerprint(fingerprint: string, limit: number): Promise<RateLimitResult>;
  checkIp(ip: string): Promise<RateLimitResult>;
  resetFingerprint(fingerprint: string): Promise<void>;
}

// ---------- in-memory backend (dev only) ----------

const memFingerprints = new Map<string, Bucket>();
const memIps = new Map<string, Bucket>();

function memCheck(
  store: Map<string, Bucket>,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, limit, resetAt: now + windowMs };
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
}

const memoryBackend: Backend = {
  async checkFingerprint(fp, limit) {
    return memCheck(memFingerprints, fp, limit, DAY_MS);
  },
  async checkIp(ip) {
    return memCheck(memIps, ip, IP_LIMIT_PER_MINUTE, MINUTE_MS);
  },
  async resetFingerprint(fp) {
    memFingerprints.delete(fp);
  },
};

// ---------- upstash backend ----------

interface UpstashLimiter {
  limit: (key: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
}

interface UpstashRedis {
  del: (key: string) => Promise<number>;
}

interface UpstashBackend extends Backend {
  redis: UpstashRedis;
}

async function loadUpstashBackend(): Promise<UpstashBackend | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ]);

    const redis = new Redis({ url, token });

    const fingerprintLimiter: UpstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(dailyLimitFromEnv(), '1 d'),
      prefix: 'mbti:fp',
      analytics: false,
    });

    const ipLimiter: UpstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(IP_LIMIT_PER_MINUTE, '1 m'),
      prefix: 'mbti:ip',
      analytics: false,
    });

    return {
      redis,
      async checkFingerprint(fp, limit) {
        try {
          const r = await fingerprintLimiter.limit(fp);
          return {
            allowed: r.success,
            remaining: r.remaining,
            limit: r.limit ?? limit,
            resetAt: r.reset,
          };
        } catch (err) {
          console.error('[ratelimit] upstash fingerprint check failed, failing open', err);
          return { allowed: true, remaining: limit, limit, resetAt: Date.now() + DAY_MS };
        }
      },
      async checkIp(ip) {
        try {
          const r = await ipLimiter.limit(ip);
          return {
            allowed: r.success,
            remaining: r.remaining,
            limit: r.limit ?? IP_LIMIT_PER_MINUTE,
            resetAt: r.reset,
          };
        } catch (err) {
          console.error('[ratelimit] upstash ip check failed, failing open', err);
          return {
            allowed: true,
            remaining: IP_LIMIT_PER_MINUTE,
            limit: IP_LIMIT_PER_MINUTE,
            resetAt: Date.now() + MINUTE_MS,
          };
        }
      },
      async resetFingerprint(fp) {
        try {
          await redis.del(`mbti:fp:${fp}`);
        } catch (err) {
          console.error('[ratelimit] upstash reset failed', err);
        }
      },
    };
  } catch (err) {
    console.error('[ratelimit] failed to initialise Upstash backend, using in-memory', err);
    return null;
  }
}

// Resolve backend lazily once. Top-level await isn't available in this module
// target, so we cache the promise.
let backendPromise: Promise<Backend> | null = null;

function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = loadUpstashBackend().then((upstash) => {
      if (upstash) return upstash;
      console.warn(
        '[ratelimit] running in-memory mode — NOT SAFE for production. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
      );
      return memoryBackend;
    });
  }
  return backendPromise;
}

function pickStricter(a: RateLimitResult, b: RateLimitResult): RateLimitResult {
  if (!a.allowed || !b.allowed) {
    const blocked = !a.allowed ? a : b;
    const other = blocked === a ? b : a;
    return {
      allowed: false,
      remaining: 0,
      limit: blocked.limit,
      // closer reset wins so the user can retry as soon as possible
      resetAt: Math.min(blocked.resetAt, other.resetAt),
    };
  }
  return {
    allowed: true,
    remaining: Math.min(a.remaining, b.remaining),
    limit: Math.min(a.limit, b.limit),
    resetAt: Math.min(a.resetAt, b.resetAt),
  };
}

export const rateLimiter: RateLimiter = {
  async check(fingerprint, ip): Promise<RateLimitResult> {
    const backend = await getBackend();
    const dailyLimit = dailyLimitFromEnv();
    const safeIp = ip && ip.length > 0 ? ip : 'unknown';

    const [fpResult, ipResult] = await Promise.all([
      backend.checkFingerprint(fingerprint, dailyLimit),
      backend.checkIp(safeIp),
    ]);

    return pickStricter(fpResult, ipResult);
  },

  async reset(fingerprint) {
    const backend = await getBackend();
    await backend.resetFingerprint(fingerprint);
  },
};
