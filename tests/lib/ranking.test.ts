import { describe, expect, it } from 'vitest';
import { compareRanked, decay, decayedSums, profileCompleteness, rankingScore, type RankInput } from '@/lib/ranking';
import { DAY_MS, HOUR_MS } from '@/lib/rules';

const NOW = Date.parse('2026-11-04T05:00:00Z');
const base: RankInput = {
  id: 'a',
  zone: 'backend',
  decayed: { hr: 0, love: 0, invites: 0, accepted: 0 },
  sittingSince: NOW,
  createdAt: NOW - 10 * DAY_MS,
  completeness: 0,
};

describe('ranking', () => {
  it('decay halves every 7 days', () => {
    expect(decay(0)).toBe(1);
    expect(decay(7)).toBeCloseTo(0.5);
    expect(decay(14)).toBeCloseTo(0.25);
  });

  it('caps love at 20/day before decay and ignores buckets outside the window', () => {
    const d = decayedSums(
      [
        { day: '2026-11-11', xu: 2, love: 50, invites: 1, invitesAccepted: 1 },
        { day: '2026-11-04', xu: 2, love: 50, invites: 0, invitesAccepted: 0 },
        { day: '2026-08-01', xu: 100, love: 100, invites: 9, invitesAccepted: 9 },
      ],
      '2026-11-11',
    );
    expect(d.hr).toBeCloseTo(2 + 2 * 0.5);
    expect(d.love).toBeCloseTo(20 + 20 * 0.5);
    expect(d.invites).toBeCloseTo(1);
    expect(d.accepted).toBeCloseTo(1);
  });

  it('applies exact weights', () => {
    const s = rankingScore(
      { ...base, decayed: { hr: 2, love: 10, invites: 1, accepted: 1 }, completeness: 3, sittingSince: NOW - 5 * DAY_MS },
      NOW,
    );
    expect(s).toBeCloseTo(3 * 2 + 0.3 * 10 + 20 + 10 + 2 * 5 + 3);
  });

  it('caps sit days at 30', () => {
    const a = rankingScore({ ...base, sittingSince: NOW - 30 * DAY_MS }, NOW);
    const b = rankingScore({ ...base, sittingSince: NOW - 90 * DAY_MS }, NOW);
    expect(a).toBeCloseTo(60);
    expect(b).toBeCloseTo(60);
  });

  it('newcomer boost goes 5 -> 0 linearly over 24h', () => {
    const at = (h: number) => rankingScore({ ...base, createdAt: NOW - h * HOUR_MS }, NOW);
    expect(at(0)).toBeCloseTo(5);
    expect(at(12)).toBeCloseTo(2.5);
    expect(at(24)).toBeCloseTo(0);
    expect(at(48)).toBeCloseTo(0);
  });

  it('orders a fixed fixture deterministically with tie-breaks', () => {
    const mk = (id: string, score: number, sit: number, created: number) => ({
      id, zone: 'backend' as const, score, sittingSince: sit, createdAt: created,
    });
    const list = [mk('d', 10, 5, 5), mk('c', 10, 5, 4), mk('b', 10, 3, 9), mk('a', 12, 9, 9), mk('e', 10, 5, 5)];
    expect(list.sort(compareRanked).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('profile completeness counts optional fields', () => {
    const empty = { salaryMin: null, salaryMax: null, salaryNegotiable: false, bio: null, city: null, workModes: [], skills: ['a'] };
    expect(profileCompleteness(empty)).toBe(0);
    expect(
      profileCompleteness({ salaryMin: 1, salaryMax: null, salaryNegotiable: false, bio: 'x', city: 'y', workModes: ['remote'], skills: ['a', 'b', 'c'] }),
    ).toBe(5);
    expect(profileCompleteness({ ...empty, salaryNegotiable: true })).toBe(1);
  });
});
