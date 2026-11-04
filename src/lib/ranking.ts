import { DAY_MS, HOUR_MS, LIMITS, RANK, type ZoneId } from './rules';
import { dayDiff } from './time';

export interface DailyBucket {
  day: string;
  xu: number;
  love: number;
  invites: number;
  invitesAccepted: number;
}
export interface Decayed {
  hr: number;
  love: number;
  invites: number;
  accepted: number;
}

/** 0.5 ^ (ageDays / halfLife) */
export function decay(ageDays: number, halfLifeDays: number = RANK.halfLifeDays): number {
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/** Demo-only mirror of the decayed sums computed in SQL list_candidates(). */
export function decayedSums(buckets: DailyBucket[], today: string): Decayed {
  const out: Decayed = { hr: 0, love: 0, invites: 0, accepted: 0 };
  for (const b of buckets) {
    const age = dayDiff(b.day, today);
    if (age < 0 || age >= RANK.windowDays) continue;
    const d = decay(age);
    out.hr += b.xu * d;
    out.love += Math.min(b.love, RANK.loveDailyCap) * d;
    out.invites += b.invites * d;
    out.accepted += b.invitesAccepted * d;
  }
  return out;
}

/** 0..5 — mirrors private.completeness */
export function profileCompleteness(c: {
  salaryMin: number | null | undefined;
  salaryMax: number | null | undefined;
  salaryNegotiable: boolean;
  bio: string | null | undefined;
  city: string | null | undefined;
  workModes: readonly string[];
  skills: readonly string[];
}): number {
  return (
    Number(c.salaryMin != null || c.salaryMax != null || c.salaryNegotiable) +
    Number(c.bio != null && c.bio !== '') +
    Number(c.city != null && c.city !== '') +
    Number(c.workModes.length > 0) +
    Number(c.skills.length >= 3)
  );
}

export interface RankInput {
  id: string;
  zone: ZoneId;
  decayed: Decayed;
  sittingSince: number;
  createdAt: number;
  completeness: number;
}

export function rankingScore(c: RankInput, nowMs: number): number {
  const sitDays = Math.max(0, (nowMs - c.sittingSince) / DAY_MS);
  const ageHours = Math.max(0, (nowMs - c.createdAt) / HOUR_MS);
  const newcomer = RANK.newcomerBoost * Math.max(0, 1 - ageHours / RANK.newcomerHours);
  return (
    RANK.hrCoin * c.decayed.hr +
    RANK.love * c.decayed.love +
    RANK.invite * c.decayed.invites +
    RANK.inviteAccepted * c.decayed.accepted +
    RANK.sitPerDay * Math.min(sitDays, RANK.sitCapDays) +
    RANK.completeness * c.completeness +
    newcomer
  );
}

export interface Ranked {
  id: string;
  zone: ZoneId;
  score: number;
  sittingSince: number;
  createdAt: number;
  status?: 'sitting' | 'placed' | 'hidden';
}

/** score desc, then sitting longer (earlier sittingSince), then earlier createdAt, then id. */
export function compareRanked(a: Ranked, b: Ranked): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.sittingSince !== b.sittingSince) return a.sittingSince - b.sittingSince;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export const MAX_SEATS_PER_ZONE = LIMITS.seatsPerZone;
