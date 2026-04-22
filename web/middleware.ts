/**
 * Edge middleware — security headers + lightweight IP tracking.
 * OWNER: Agent D (can extend). Base implementation kept minimal on purpose.
 */
import { NextResponse, type NextRequest } from 'next/server';

const CSP_DEFAULT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.posthog.com https://api.anthropic.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();
  res.headers.set('Content-Security-Policy', CSP_DEFAULT);
  res.headers.set(
    'X-Client-IP',
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
  );
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
