/**
 * Edge middleware — security headers + lightweight IP tracking.
 * OWNER: Agent D.
 *
 * - CSP differs by NODE_ENV: dev needs 'unsafe-eval' for Next's HMR; prod
 *   omits it. 'unsafe-inline' for scripts is left in for Next's runtime
 *   inline bootstrap; revisit when we add nonce support.
 * - Forwards client IP via X-Client-IP for the rate limiter.
 * - Adds X-Request-ID per response for log correlation.
 */
import { NextResponse, type NextRequest } from 'next/server';

const SHARED_CSP_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.posthog.com https://api.anthropic.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

function buildCsp(isDev: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com"
    : "script-src 'self' 'unsafe-inline' https://*.posthog.com";
  return [scriptSrc, ...SHARED_CSP_DIRECTIVES].join('; ');
}

const IS_DEV = process.env.NODE_ENV !== 'production';
const CSP = buildCsp(IS_DEV);

export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();

  res.headers.set('Content-Security-Policy', CSP);
  res.headers.set(
    'X-Client-IP',
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
  );
  res.headers.set('X-Request-ID', crypto.randomUUID());

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
