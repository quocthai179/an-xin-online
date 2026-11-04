import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp } from '@/lib/csp';

/** Per-request nonce CSP (Next 16 `proxy`, formerly middleware). Pages are rendered dynamically so Next can stamp the nonce on its scripts. */
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === 'development',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    forceDemo: process.env.NEXT_PUBLIC_FORCE_DEMO,
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  // pages only: API routes (OG images, admin, street snapshot), Next internals and static files do not need a nonce
  matcher: [
    {
      source: '/((?!api/|_next/static|_next/image|fonts/|favicon.ico|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
