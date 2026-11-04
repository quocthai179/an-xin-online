import { describe, expect, it } from 'vitest';
import {
  ANONYMOUS_NAME, candidateSharePath, fortuneSharePath, ogSignFontSize, resolvePublicCandidate, resolvePublicFortune,
  sanitizeShareDay, sanitizeShareName,
} from '@/lib/shareData';
import { facebookShareUrl, xShareUrl, zaloShareUrl } from '@/lib/shareLinks';
import { encodeShare } from '@/lib/shareCodec';
import { FORTUNES } from '@/lib/fortune';

const NOW = Date.parse('2026-11-04T05:00:00Z');

describe('resolvePublicCandidate', () => {
  it('resolves seed slugs without a payload', () => {
    const c = resolvePublicCandidate('mau-backend-1', null, NOW);
    expect(c?.sample).toBe(true);
    expect(c?.zone).toBe('backend');
    expect(c?.sign.length).toBeGreaterThan(4);
  });
  it('rejects bad slugs and unknown slugs without payload', () => {
    expect(resolvePublicCandidate('../etc/passwd', null, NOW)).toBeNull();
    expect(resolvePublicCandidate('A B', null, NOW)).toBeNull();
    expect(resolvePublicCandidate('abcdef0123', null, NOW)).toBeNull();
  });
  it('accepts a valid demo payload and ignores it for seeds', () => {
    const d = encodeShare({ n: 'Nguyễn Đức Ưng', s: 'Java 5 năm, xin việc remote', t: 'Backend', z: 'backend', x: 3 })!;
    const c = resolvePublicCandidate('abcdef0123', d, NOW);
    expect(c).toMatchObject({ name: 'Nguyễn Đức Ưng', demo: true, sample: false, xu: 3 });
    const seed = resolvePublicCandidate('mau-backend-1', d, NOW);
    expect(seed?.demo).toBe(false);
  });
  it('rejects tampered, blocked and PII payloads', () => {
    expect(resolvePublicCandidate('abcdef0123', 'not-base64!!', NOW)).toBeNull();
    const evil = encodeShare({ n: 'A', s: 'xin việc vcl', t: 'T', z: 'qa', x: 0 })!;
    expect(resolvePublicCandidate('abcdef0123', evil, NOW)).toBeNull();
    const pii = encodeShare({ n: 'A', s: 'gọi 0912345678 nhé', t: 'T', z: 'qa', x: 0 })!;
    expect(resolvePublicCandidate('abcdef0123', pii, NOW)).toBeNull();
  });
});

describe('share query sanitising', () => {
  it('falls back for blocked, long or empty names', () => {
    expect(sanitizeShareName('Lan Anh')).toBe('Lan Anh');
    expect(sanitizeShareName('đ.m')).toBe(ANONYMOUS_NAME);
    expect(sanitizeShareName('a'.repeat(40))).toBe(ANONYMOUS_NAME);
    expect(sanitizeShareName('mail me@evil.com')).toBe(ANONYMOUS_NAME);
    expect(sanitizeShareName('')).toBe(ANONYMOUS_NAME);
    expect(sanitizeShareName(null)).toBe(ANONYMOUS_NAME);
    expect(sanitizeShareName('<b>x</b>')).toBe('<b>x</b>'); // kept as plain text: React and satori never interpret markup
  });
  it('validates days', () => {
    expect(sanitizeShareDay('2026-11-04')).toBe('2026-11-04');
    expect(sanitizeShareDay('2026-02-31')).toBeNull();
    expect(sanitizeShareDay('04/11/2026')).toBeNull();
    expect(sanitizeShareDay(null)).toBeNull();
  });
  it('resolves fortunes by id with safe defaults', () => {
    const id = FORTUNES[0].id;
    const q = resolvePublicFortune(id, 'đ.m', 'garbage', NOW);
    expect(q?.name).toBe(ANONYMOUS_NAME);
    expect(q?.day).toBe('2026-11-04');
    expect(resolvePublicFortune('nope-1', 'A', null, NOW)).toBeNull();
  });
});

describe('share paths and links', () => {
  const card = { slug: 'abc', isSample: false, displayName: 'Em Dev', signText: 'Xin việc remote nhé', title: 'Dev', zone: 'qa' as const, totals: { xu: 2, love: 0, invites: 0, incense: 0 } };
  it('adds ?d= only for non-sample candidates and it decodes on the server side', () => {
    expect(candidateSharePath({ ...card, isSample: true })).toBe('/c/abc');
    const p = candidateSharePath(card);
    expect(p.startsWith('/c/abc?d=')).toBe(true);
    const c = resolvePublicCandidate('abc', p.split('?d=')[1], NOW);
    expect(c?.name).toBe('Em Dev');
  });
  it('builds fortune paths', () => {
    expect(fortuneSharePath('trung-1', 'Lan Anh', '2026-11-04')).toBe('/q/trung-1?n=Lan%20Anh&d=2026-11-04');
  });
  it('encodes share URLs', () => {
    const u = 'https://x.vn/c/a?d=b&c=1';
    expect(facebookShareUrl(u)).toContain(encodeURIComponent(u));
    expect(xShareUrl(u, 'xin việc & cười')).toContain('text=xin%20vi%E1%BB%87c%20%26%20c%C6%B0%E1%BB%9Di');
    expect(zaloShareUrl(u)).toContain(encodeURIComponent(u));
  });
  it('shrinks the sign font for long text', () => {
    expect(ogSignFontSize('ngắn')).toBeGreaterThan(ogSignFontSize('x'.repeat(70)));
  });
});
