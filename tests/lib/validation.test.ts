import { describe, expect, it } from 'vitest';
import { validateCandidateInput } from '@/lib/validation/candidate';
import { validateProfileInput } from '@/lib/validation/profile';
import { contactHref, toSafeHref, validateContact } from '@/lib/validation/contact';

const good = {
  signText: 'Java 5 năm, nhà còn mẹ già, xin job remote',
  title: 'Backend Dev',
  yearsExp: 5,
  skills: ['Java', 'Spring'],
  salaryMin: 20,
  salaryMax: 30,
  salaryNegotiable: false,
  city: 'Hà Nội',
  workModes: ['remote'],
  bio: 'Hello',
  zone: 'backend',
  hideFromTicker: false,
  showSalaryOnCard: false,
  contact: { kind: 'email', value: 'a@b.vn' },
};

const bad = (patch: Record<string, unknown>) => validateCandidateInput({ ...good, ...patch });

describe('validateCandidateInput', () => {
  it('accepts a good input and normalizes', () => {
    const r = bad({ signText: '  Java   5 năm, xin job  ', skills: ['Java', ' ', 'Java  '] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.signText).toBe('Java 5 năm, xin job');
      expect(r.value.skills).toEqual(['Java', 'Java']);
    }
  });

  it.each([
    [{ signText: 'abcd' }, 'sign_text'],
    [{ signText: 'a'.repeat(81) }, 'sign_text'],
    [{ signText: 'dòng 1\ndòng 2\ndòng 3' }, 'sign_text'],
    [{ zone: 'moon' }, 'zone'],
    [{ title: '' }, 'title'],
    [{ title: 'x'.repeat(61) }, 'title'],
    [{ yearsExp: -1 }, 'years_exp'],
    [{ yearsExp: 51 }, 'years_exp'],
    [{ yearsExp: 1.5 }, 'years_exp'],
    [{ skills: [] }, 'skills'],
    [{ skills: Array.from({ length: 11 }, (_, i) => `s${i}`) }, 'skills'],
    [{ skills: ['x'.repeat(21)] }, 'skills'],
    [{ salaryMin: 50, salaryMax: 10 }, 'salary'],
    [{ salaryMax: 1001 }, 'salary'],
    [{ workModes: ['moon'] }, 'work_modes'],
    [{ bio: 'x'.repeat(281) }, 'bio'],
    [{ city: 'x'.repeat(41) }, 'city'],
    [{ contact: { kind: 'email', value: 'nope' } }, 'contact'],
    [{ contact: { kind: 'url', value: 'javascript:alert(1)' } }, 'contact'],
  ])('rejects %j', (patch, field) => {
    const r = bad(patch);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.field).toBe(field);
      expect(r.error).toBe('VALIDATION');
    }
  });

  it('reports blocked content and PII per field', () => {
    const b = bad({ signText: 'xin việc vcl' });
    expect(!b.ok && b.error).toBe('BLOCKED_CONTENT');
    const p = bad({ bio: 'gọi 0912345678 nhé' });
    expect(!p.ok && p.error).toBe('PII_NOT_ALLOWED');
    expect(!p.ok && p.field).toBe('bio');
    const u = bad({ signText: 'vào https://evil.com xin việc' });
    expect(!u.ok && u.error).toBe('PII_NOT_ALLOWED');
  });

  it('treats script payloads as plain text (rendering escapes them)', () => {
    const r = bad({ signText: '<script>alert(1)</script> xin việc' });
    expect(r.ok).toBe(true);
  });
});

describe('validateProfileInput', () => {
  it('requires company for HR', () => {
    expect(validateProfileInput({ displayName: 'Lan', role: 'hr' })).toMatchObject({ ok: false, field: 'company' });
    expect(validateProfileInput({ displayName: 'Lan', role: 'hr', company: 'ACME' })).toMatchObject({ ok: true });
    expect(validateProfileInput({ displayName: 'Lan', role: 'viewer', company: 'ACME' })).toMatchObject({
      ok: true,
      value: { company: null },
    });
  });
  it('rejects bad names', () => {
    expect(validateProfileInput({ displayName: 'a', role: 'viewer' })).toMatchObject({ ok: false, field: 'display_name' });
    expect(validateProfileInput({ displayName: 'x'.repeat(25), role: 'viewer' })).toMatchObject({ ok: false });
    expect(validateProfileInput({ displayName: 'đ.m', role: 'viewer' })).toMatchObject({ ok: false, error: 'BLOCKED_CONTENT' });
    expect(validateProfileInput({ displayName: 'Lan', role: 'admin' })).toMatchObject({ ok: false, field: 'role' });
  });
});

describe('contact', () => {
  it('validates kinds', () => {
    expect(validateContact('email', 'a@b.co')).toBe(true);
    expect(validateContact('phone', '0912 345 678')).toBe(true);
    expect(validateContact('url', 'https://github.com/x')).toBe(true);
    expect(validateContact('url', 'ftp://x')).toBe(false);
  });
  it('toSafeHref only allows http(s), mailto, tel', () => {
    expect(toSafeHref('https://a.com/x')).toBe('https://a.com/x');
    expect(toSafeHref('javascript:alert(1)')).toBeNull();
    expect(toSafeHref('data:text/html,x')).toBeNull();
    expect(toSafeHref('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(toSafeHref('tel:+84912345678')).toBe('tel:+84912345678');
    expect(contactHref({ kind: 'phone', value: '0912 345 678' })).toBe('tel:0912345678');
    expect(contactHref({ kind: 'url', value: 'javascript:alert(1)' })).toBeNull();
  });
});
