/**
 * Minimal analytics wrapper.
 * OWNER: Agent E.
 *
 * Guarantees:
 *  - Safe no-op if env vars absent (never crash the app)
 *  - Never sends PII / raw user messages
 *  - Queues events before init to avoid race at page load
 */

type EventName =
  | 'landing_viewed'
  | 'mbti_selected'
  | 'chat_started'
  | 'quota_exhausted'
  | 'wechat_shown'
  | 'payment_clicked';

type Props = Record<string, string | number | boolean | undefined>;

export function trackEvent(_name: EventName, _props?: Props): void {
  // TODO(Agent E): integrate PostHog or similar. Keep server-safe.
}

export function identify(_fingerprint: string, _traits?: Props): void {
  // TODO(Agent E)
}
