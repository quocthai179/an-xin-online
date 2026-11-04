import { describe, expect, it } from 'vitest';
import { adminKeyMatches, parseModerateBody } from '@/server/admin';
import { publicFromRow } from '@/server/publicData';

describe('admin helpers', () => {
  it('compares the admin key without accepting empty or wrong values', () => {
    expect(adminKeyMatches('secret', 'secret')).toBe(true);
    expect(adminKeyMatches('secret', 'secreT')).toBe(false);
    expect(adminKeyMatches('', 'secret')).toBe(false);
    expect(adminKeyMatches(null, 'secret')).toBe(false);
    expect(adminKeyMatches('anything', undefined)).toBe(false);
    expect(adminKeyMatches('', '')).toBe(false);
    expect(adminKeyMatches('a', 'a-much-longer-key')).toBe(false);
  });

  it('validates the moderation body', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    expect(parseModerateBody({ candidateId: id, action: 'hide' })).toEqual({ candidateId: id, action: 'hide' });
    expect(parseModerateBody({ candidateId: id, action: 'drop table' })).toBeNull();
    expect(parseModerateBody({ candidateId: 'x', action: 'hide' })).toBeNull();
    expect(parseModerateBody(null)).toBeNull();
    expect(parseModerateBody('hide')).toBeNull();
  });
});

describe('publicFromRow', () => {
  const row = { display_name: 'Dev A', sign_text: 'Biển xin việc', sign_state: 'ok', title: 'BE', zone: 'backend', xu_total: 4, is_sample: false, status: 'sitting' };
  it('maps get_candidate JSON', () => {
    expect(publicFromRow('abc', row)).toEqual({ slug: 'abc', name: 'Dev A', sign: 'Biển xin việc', title: 'BE', zone: 'backend', xu: 4, sample: false, demo: false, placed: false });
    expect(publicFromRow('abc', { ...row, status: 'placed' })?.placed).toBe(true);
  });
  it('never exposes a sign under review and rejects malformed rows', () => {
    expect(publicFromRow('abc', { ...row, sign_state: 'pending_review', sign_text: null })?.sign).not.toContain('Biển xin việc');
    expect(publicFromRow('abc', { ...row, sign_state: 'removed', sign_text: 'bad' })?.sign).not.toBe('bad');
    expect(publicFromRow('abc', { display_name: 1 })).toBeNull();
  });
});
