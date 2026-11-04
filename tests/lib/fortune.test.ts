import { describe, expect, it } from 'vitest';
import { drawFortuneDemo, FORTUNES, selectFortune, TIER_WEIGHTS, tierForRoll, type Tier } from '@/lib/fortune';

describe('fortune', () => {
  it('has >= 40 fortunes, >= 4 per tier, ids unique', () => {
    expect(FORTUNES.length).toBeGreaterThanOrEqual(40);
    for (const t of Object.keys(TIER_WEIGHTS) as Tier[]) {
      expect(FORTUNES.filter((f) => f.tier === t).length).toBeGreaterThanOrEqual(4);
    }
    expect(new Set(FORTUNES.map((f) => f.id)).size).toBe(FORTUNES.length);
    for (const f of FORTUNES) expect(f.advice.length).toBeGreaterThan(5);
  });

  it('same user + day gives the same fortune', () => {
    const a = selectFortune(drawFortuneDemo('u1', '2026-11-04'));
    const b = selectFortune(drawFortuneDemo('u1', '2026-11-04'));
    expect(a).toEqual(b);
  });

  it('different days can differ', () => {
    const ids = new Set<string>();
    for (let d = 1; d <= 20; d++) ids.add(selectFortune(drawFortuneDemo('u1', `2026-11-${String(d).padStart(2, '0')}`)).id);
    expect(ids.size).toBeGreaterThan(3);
  });

  it('tierForRoll follows cumulative weights', () => {
    expect(tierForRoll(0)).toBe('thuong_thuong');
    expect(tierForRoll(4)).toBe('thuong_thuong');
    expect(tierForRoll(5)).toBe('thuong');
    expect(tierForRoll(24)).toBe('thuong');
    expect(tierForRoll(25)).toBe('trung');
    expect(tierForRoll(64)).toBe('trung');
    expect(tierForRoll(65)).toBe('ha');
    expect(tierForRoll(89)).toBe('ha');
    expect(tierForRoll(90)).toBe('ha_ha');
    expect(tierForRoll(99)).toBe('ha_ha');
  });

  it('distribution over 10000 users is within +-3pp', () => {
    const counts: Record<Tier, number> = { thuong_thuong: 0, thuong: 0, trung: 0, ha: 0, ha_ha: 0 };
    for (let i = 0; i < 10000; i++) counts[selectFortune(drawFortuneDemo(`user-${i}-${(i * 7919) % 10007}`, '2026-11-04')).tier]++;
    for (const t of Object.keys(counts) as Tier[]) {
      expect(Math.abs(counts[t] / 100 - TIER_WEIGHTS[t])).toBeLessThanOrEqual(3);
    }
  });
});
