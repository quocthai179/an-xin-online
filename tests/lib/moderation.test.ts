import { describe, expect, it } from 'vitest';
import { isBlocked } from '@/lib/moderation/blocklist';
import { clean, looseForm } from '@/lib/moderation/normalize';
import { hasPii } from '@/lib/moderation/pii';
import { parseBlocklist } from '@/config/blocklist.vi';

describe('moderation', () => {
  it.each(['đ.m', 'd m', 'Đ M', 'vcl', 'd1t', 'Đ.M mày', 'ĐỊT', 'lồn', 'V.C.L', 'đ  m', 'ditconme', 'dit.con.me', 'chuyển khoản vào đây'])(
    'blocks %s',
    (t) => expect(isBlocked(t)).toBe(true),
  );

  it.each(['đeo kính', 'lớn', 'admin', 'Java 5 năm', 'Backend Developer', 'dịch vụ', 'Địa danh đẹp', 'điểm', 'Phở', 'Thông minh', 'dimension'])(
    'allows %s',
    (t) => expect(isBlocked(t)).toBe(false),
  );

  it('handles NFKC fullwidth and zero-width bypass', () => {
    expect(isBlocked('ｖｃｌ')).toBe(true);
    expect(isBlocked('v​c​l')).toBe(true);
    expect(isBlocked('d‮m')).toBe(true);
  });

  it('allowlist rescues phrases before matching', () => {
    const cfg = { terms: [{ term: 'ditconme', mode: 'compact' as const }], allow: ['dit con me'] };
    expect(isBlocked('dit con me', { ...cfg, allow: [] })).toBe(true);
    expect(isBlocked('dit con me', cfg)).toBe(false);
  });

  it('clean strips invisible chars and collapses whitespace', () => {
    expect(clean('  a​  b\t\tc  ')).toBe('a b c');
    expect(clean('   ')).toBeNull();
    expect(clean(null)).toBeNull();
    expect(clean('ａｂ')).toBe('ab');
  });

  it('looseForm joins single letters and maps leet', () => {
    expect(looseForm('Đ. M')).toBe(' dm ');
    expect(looseForm('d1t')).toBe(' dit ');
  });

  it('detects PII', () => {
    expect(hasPii('xem https://x.io')).toBe(true);
    expect(hasPii('www.foo')).toBe(true);
    expect(hasPii('mail me a@b.co')).toBe(true);
    expect(hasPii('gọi 0912 345 678')).toBe(true);
    expect(hasPii('+84 912.345.678')).toBe(true);
    expect(hasPii('site.com')).toBe(true);
    expect(hasPii('Java 5 năm, xin job remote')).toBe(false);
    expect(hasPii('lương 20 đến 30 triệu')).toBe(false);
  });

  it('parses the blocklist file', () => {
    expect(parseBlocklist('a|loose\n# c\n\nbb|compact\n')).toEqual([
      { term: 'a', mode: 'loose' },
      { term: 'bb', mode: 'compact' },
    ]);
    expect(() => parseBlocklist('a|nope')).toThrow();
  });
});
