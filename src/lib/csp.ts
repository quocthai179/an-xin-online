// Content-Security-Policy builder shared by `src/proxy.ts` (per-request nonce) and the tests.

export interface CspOptions {
  /** per-request nonce; without it scripts fall back to 'self' + 'unsafe-inline' (no strict-dynamic) */
  nonce?: string;
  isDev?: boolean;
  supabaseUrl?: string;
  /** NEXT_PUBLIC_FORCE_DEMO */
  forceDemo?: string;
  /** NEXT_PUBLIC_TURNSTILE_SITE_KEY: only when set do we open challenges.cloudflare.com */
  turnstileSiteKey?: string;
}

export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

/** connect-src entries for Supabase (REST + realtime websocket), only when the project is configured and not forced to demo. */
export function supabaseConnectSources(url: string | undefined, forceDemo: string | undefined): string[] {
  if (!url || forceDemo === '1') return [];
  try {
    const u = new URL(url);
    const ws = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return [u.origin, `${ws}//${u.host}`];
  } catch {
    return [];
  }
}

export function buildCsp(o: CspOptions): string {
  const supabase = supabaseConnectSources(o.supabaseUrl, o.forceDemo);
  const captcha = o.turnstileSiteKey && o.forceDemo !== '1' && o.supabaseUrl ? TURNSTILE_ORIGIN : null;
  const script = ["'self'"];
  if (o.nonce) script.push(`'nonce-${o.nonce}'`, "'strict-dynamic'");
  else script.push("'unsafe-inline'");
  if (captcha) script.push(captcha); // ignored by browsers that honour strict-dynamic, kept for the others
  if (o.isDev) script.push("'unsafe-eval'");
  const directives = [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    // inline style attributes (React style props, three.js canvas) cannot carry a nonce
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${["'self'", ...supabase].join(' ')}${o.isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (captcha) directives.push(`frame-src ${captcha}`);
  return directives.join('; ');
}
