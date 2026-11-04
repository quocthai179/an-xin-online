import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from '@/lib/shareCodec';

const p = { n: 'Nguyễn Đức Ưng', s: 'Java 5 năm, xin job remote ỷ ỵ', t: 'Backend', z: 'backend' as const, x: 12 };

describe('shareCodec', () => {
  it('round-trips unicode', () => {
    const enc = encodeShare(p)!;
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShare(enc)).toEqual(p);
  });
  it('rejects garbage, oversize and moderated payloads', () => {
    expect(decodeShare('!!!')).toBeNull();
    expect(decodeShare(null)).toBeNull();
    expect(decodeShare('a'.repeat(601))).toBeNull();
    expect(decodeShare(encodeShare({ ...p, s: 'xin việc vcl' })!)).toBeNull();
    expect(decodeShare(encodeShare({ ...p, s: 'vào evil.com đi' })!)).toBeNull();
    expect(decodeShare(encodeShare({ ...p, z: 'moon' as never })!)).toBeNull();
    const evil = btoa(JSON.stringify({ n: 'a', s: 'x'.repeat(200), t: 't', z: 'qa', x: 1 }));
    expect(decodeShare(evil)).toBeNull();
  });
  it('returns null when too long to encode', () => {
    expect(encodeShare({ ...p, s: 'ư'.repeat(400) })).toBeNull();
  });
  it('clamps xu', () => {
    const raw = encodeShare({ n: 'Lan', s: 'Xin viec ne', t: 'Dev', z: 'qa', x: -5 });
    expect(decodeShare(raw)?.x).toBe(0);
  });
});
