import { describe, expect, it } from 'vitest';
import { buildCsp } from '@/lib/csp';
import { clientIp, TokenBuckets } from '@/server/rateLimit';
import { signShareName, verifiedShareName } from '@/server/shareSign';
import { ADMIN_KEY_MIN_LENGTH } from '@/server/admin';
import { provideCaptchaToken, takeCaptchaToken, onCaptchaReset } from '@/lib/captcha';

describe('L2: CSP', () => {
  it('uses a nonce with strict-dynamic and the hardening directives', () => {
    const csp = buildCsp({ nonce: 'abc' });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    for (const d of ["base-uri 'none'", "form-action 'self'", "object-src 'none'", "frame-ancestors 'none'"]) expect(csp).toContain(d);
    expect(csp).not.toContain('cloudflare');
    expect(csp).not.toContain('supabase');
  });
  it('opens challenges.cloudflare.com only when Turnstile and Supabase are configured', () => {
    const on = buildCsp({ nonce: 'n', turnstileSiteKey: 'k', supabaseUrl: 'https://x.supabase.co' });
    expect(on).toContain('frame-src https://challenges.cloudflare.com');
    expect(on).toContain('wss://x.supabase.co');
    expect(buildCsp({ nonce: 'n', turnstileSiteKey: 'k', forceDemo: '1', supabaseUrl: 'https://x.supabase.co' })).not.toContain('cloudflare');
    expect(buildCsp({ nonce: 'n', turnstileSiteKey: 'k' })).not.toContain('cloudflare');
  });
  it('allows eval only in dev', () => {
    expect(buildCsp({ nonce: 'n', isDev: true })).toContain("'unsafe-eval'");
    expect(buildCsp({ nonce: 'n' })).not.toContain("'unsafe-eval'");
  });
});

describe('M5: token bucket', () => {
  it('limits bursts, refills over time and bounds memory', () => {
    const b = new TokenBuckets({ capacity: 3, refillPerSec: 1, maxKeys: 2 });
    expect([1, 2, 3, 4].map(() => b.take('ip', 0))).toEqual([true, true, true, false]);
    expect(b.take('ip', 1500)).toBe(true);
    b.take('b', 0);
    b.take('c', 0); // evicts the least recently used key
    expect(b.take('ip', 1500)).toBe(true); // forgotten key starts fresh
  });
  it('reads the client IP from trusted headers first', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '9.9.9.9, 2.2.2.2' }))).toBe('1.1.1.1');
    expect(clientIp(new Headers({ 'x-forwarded-for': '9.9.9.9, 2.2.2.2' }))).toBe('2.2.2.2');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});

describe('L6: signed share names', () => {
  const secret = 'a-test-secret-of-sufficient-length';
  it('honours a name only with a valid signature', () => {
    const sig = signShareName('trung-1', 'Lan Anh', '2026-11-04', secret)!;
    expect(sig).toHaveLength(22);
    expect(verifiedShareName('trung-1', 'Lan Anh', '2026-11-04', sig, secret)).toBe('Lan Anh');
    expect(verifiedShareName('trung-1', 'Evil text', '2026-11-04', sig, secret)).toBeNull();
    expect(verifiedShareName('trung-2', 'Lan Anh', '2026-11-04', sig, secret)).toBeNull();
    expect(verifiedShareName('trung-1', 'Lan Anh', '2026-11-04', null, secret)).toBeNull();
  });
  it('drops the name when no secret is configured and refuses to sign unmoderated names', () => {
    expect(signShareName('trung-1', 'Lan Anh', '2026-11-04', undefined)).toBeNull();
    expect(verifiedShareName('trung-1', 'Lan Anh', '2026-11-04', 'x'.repeat(22), undefined)).toBeNull();
    expect(signShareName('trung-1', 'đ.m', '2026-11-04', secret)).toBeNull();
  });
});

describe('L3 and H1 helpers', () => {
  it('requires a 32+ char admin key', () => {
    expect(ADMIN_KEY_MIN_LENGTH).toBe(32);
  });
  it('captcha tokens are single use and trigger a widget reset', async () => {
    let resets = 0;
    const off = onCaptchaReset(() => resets++);
    const waiting = takeCaptchaToken(1000);
    provideCaptchaToken('t1');
    expect(await waiting).toBe('t1');
    provideCaptchaToken('t2'); // arrives before anyone asks
    expect(await takeCaptchaToken(1000)).toBe('t2');
    expect(resets).toBe(2);
    await expect(takeCaptchaToken(10)).rejects.toThrow();
    off();
  });
});
