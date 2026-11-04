import { describe, expect, it } from 'vitest';
import { fillTemplate, SIGN_TEMPLATES } from '@/lib/signTemplates';
import { isBlocked } from '@/lib/moderation/blocklist';
import { hasPii } from '@/lib/moderation/pii';

describe('sign templates', () => {
  it('has >= 20 templates', () => expect(SIGN_TEMPLATES.length).toBeGreaterThanOrEqual(20));
  it('none is blocked, has PII or exceeds 80 chars when filled', () => {
    for (const t of SIGN_TEMPLATES) {
      for (const vars of [{ skill: 'Java', years: 5 }, {}, { skill: 'TypeScript', years: 12 }]) {
        const s = fillTemplate(t, vars);
        expect(isBlocked(s), s).toBe(false);
        expect(hasPii(s), s).toBe(false);
        expect([...s].length).toBeLessThanOrEqual(80);
        expect([...s].length).toBeGreaterThanOrEqual(5);
      }
    }
  });
  it('fills placeholders with fallbacks', () => {
    expect(fillTemplate('{skill} {nam} năm', { skill: 'Go', years: 3 })).toBe('Go 3 năm');
    expect(fillTemplate('{skill} {nam} năm', {})).toBe('code vài năm');
  });
  it('clamps to 80 chars', () => {
    expect([...fillTemplate('{skill}', { skill: 'x'.repeat(200) })]).toHaveLength(80);
  });
});
