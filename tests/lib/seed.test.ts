import { describe, expect, it } from 'vitest';
import { buildSeed, SEED_COUNT } from '@/lib/seed';
import { ZONE_IDS } from '@/lib/rules';
import { validateCandidateInput } from '@/lib/validation/candidate';

const NOW = Date.parse('2026-11-04T05:00:00Z');

describe('seed', () => {
  const seed = buildSeed(NOW);
  it('has >= 40 candidates, 4 per zone, unique slugs', () => {
    expect(SEED_COUNT).toBeGreaterThanOrEqual(40);
    for (const z of ZONE_IDS) expect(seed.filter((s) => s.zone === z)).toHaveLength(4);
    expect(new Set(seed.map((s) => s.slug)).size).toBe(seed.length);
  });
  it('all signs pass candidate validation (moderation + PII)', () => {
    for (const s of seed) {
      const r = validateCandidateInput({
        signText: s.signText, title: s.title, yearsExp: s.yearsExp, skills: s.skills, salaryMin: s.salaryMin,
        salaryMax: s.salaryMax, salaryNegotiable: s.salaryNegotiable, city: s.city, workModes: s.workModes,
        bio: s.bio, zone: s.zone, hideFromTicker: false, showSalaryOnCard: false, contact: { kind: 'email', value: 'a@b.co' },
      });
      expect(r.ok, `${s.slug}: ${JSON.stringify(r)}`).toBe(true);
    }
  });
  it('is deterministic for the same time', () => {
    expect(buildSeed(NOW)).toEqual(seed);
  });
});
