/**
 * Analytics wrapper around posthog-js.
 * OWNER: Agent E.
 *
 * Guarantees:
 *  - Safe no-op when NEXT_PUBLIC_POSTHOG_KEY is missing or on the server
 *  - Lazy-loaded on the client (no SSR crash, no extra bundle on landing)
 *  - Whitelisted event names only (compile-time checked)
 *  - Never sends raw user messages, AI responses, IPs, UAs, or raw fingerprints
 */

export type EventName =
  | 'landing_viewed'
  | 'mbti_selected'
  | 'chat_started'
  | 'quota_exhausted'
  | 'wechat_shown'
  | 'payment_clicked'
  | 'paywall_dismissed';

type Props = Record<string, string | number | boolean | undefined>;

type PostHogLike = {
  init: (key: string, config: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, traits?: Record<string, unknown>) => void;
};

let posthogPromise: Promise<PostHogLike | null> | null = null;
let warnedMissingKey = false;

const PII_KEYS = new Set([
  'message',
  'content',
  'response',
  'email',
  'phone',
  'ip',
  'ua',
  'user_agent',
  'fingerprint',
]);

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readMbtiFromUrl(): string | undefined {
  if (!isBrowser()) return undefined;
  try {
    const v = new URL(window.location.href).searchParams.get('mbti');
    return v && /^[A-Z]{4}$/.test(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readFingerprintRaw(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem('fp') ?? null;
  } catch {
    return null;
  }
}

async function fpHash(): Promise<string | undefined> {
  const raw = readFingerprintRaw();
  if (!raw) return undefined;
  try {
    return (await sha256Hex(raw)).slice(0, 8);
  } catch {
    return undefined;
  }
}

function stripPII(props: Props | undefined): Record<string, unknown> {
  if (!props) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEYS.has(k.toLowerCase())) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function getKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return k && k.length > 0 ? k : undefined;
}

function getHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
}

function ensurePosthog(): Promise<PostHogLike | null> {
  if (!isBrowser()) return Promise.resolve(null);
  const key = getKey();
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn('[analytics] NEXT_PUBLIC_POSTHOG_KEY missing — events are no-op');
    }
    return Promise.resolve(null);
  }
  if (posthogPromise) return posthogPromise;
  posthogPromise = import('posthog-js')
    .then((mod) => {
      const ph = (mod.default ?? mod) as unknown as PostHogLike;
      ph.init(key, {
        api_host: getHost(),
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        disable_session_recording: true,
        persistence: 'localStorage+cookie',
      });
      return ph;
    })
    .catch((err: unknown) => {
      console.error('[analytics] failed to load posthog-js', err);
      return null;
    });
  return posthogPromise;
}

export function trackEvent(name: EventName, props?: Props): void {
  if (!isBrowser()) return;
  void (async () => {
    const ph = await ensurePosthog();
    if (!ph) return;
    const safe = stripPII(props);
    const mbti = readMbtiFromUrl();
    if (mbti) safe.mbti = mbti;
    const fp = await fpHash();
    if (fp) safe.fp_hash = fp;
    try {
      ph.capture(name, safe);
    } catch (err) {
      console.error('[analytics] capture failed', err);
    }
  })();
}

export function identify(fingerprint: string, traits?: Props): void {
  if (!isBrowser()) return;
  void (async () => {
    const ph = await ensurePosthog();
    if (!ph) return;
    try {
      const id = (await sha256Hex(fingerprint)).slice(0, 16);
      ph.identify(id, stripPII(traits));
    } catch (err) {
      console.error('[analytics] identify failed', err);
    }
  })();
}
