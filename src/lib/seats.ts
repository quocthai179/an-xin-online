import { compareRanked, type Ranked } from './ranking';
import { LIMITS, ZONE_IDS, type ZoneId } from './rules';

export interface SeatPlan {
  seats: Map<string, { zone: ZoneId; seat: number }>;
  queue: Record<ZoneId, string[]>;
  order: Record<ZoneId, string[]>;
  computedAt: number;
}

function emptyRecord(): Record<ZoneId, string[]> {
  return Object.fromEntries(ZONE_IDS.map((z) => [z, [] as string[]])) as Record<ZoneId, string[]>;
}

export function assignSeats(cands: Ranked[], seatsPerZone: number = LIMITS.seatsPerZone, computedAt = 0): SeatPlan {
  const plan: SeatPlan = { seats: new Map(), queue: emptyRecord(), order: emptyRecord(), computedAt };
  const byZone = new Map<ZoneId, Ranked[]>();
  for (const c of cands) {
    if (c.status !== undefined && c.status !== 'sitting') continue;
    const list = byZone.get(c.zone) ?? [];
    list.push(c);
    byZone.set(c.zone, list);
  }
  for (const [zone, list] of byZone) {
    list.sort(compareRanked);
    list.forEach((c, i) => {
      plan.order[zone].push(c.id);
      if (i < seatsPerZone) plan.seats.set(c.id, { zone, seat: i + 1 });
      else plan.queue[zone].push(c.id);
    });
  }
  return plan;
}

function clonePlan(plan: SeatPlan): SeatPlan {
  const copy = (r: Record<ZoneId, string[]>) =>
    Object.fromEntries(ZONE_IDS.map((z) => [z, [...r[z]]])) as Record<ZoneId, string[]>;
  return { seats: new Map(plan.seats), queue: copy(plan.queue), order: copy(plan.order), computedAt: plan.computedAt };
}

/** New candidate takes the last seat now (no reshuffle until the next tick). */
export function appendNewcomer(plan: SeatPlan, c: Ranked, seatsPerZone: number = LIMITS.seatsPerZone): SeatPlan {
  const next = clonePlan(plan);
  if (next.seats.has(c.id) || next.queue[c.zone].includes(c.id)) return next;
  next.order[c.zone].push(c.id);
  const taken = new Set<number>();
  for (const s of next.seats.values()) if (s.zone === c.zone) taken.add(s.seat);
  let seat = 0;
  const max = taken.size ? Math.max(...taken) : 0;
  if (max < seatsPerZone) seat = max + 1;
  else for (let i = 1; i <= seatsPerZone; i++) if (!taken.has(i)) { seat = i; break; }
  if (seat > 0) next.seats.set(c.id, { zone: c.zone, seat });
  else next.queue[c.zone].push(c.id);
  return next;
}

/** Leaves a gap until the next full tick. */
export function removeCandidate(plan: SeatPlan, id: string): SeatPlan {
  const next = clonePlan(plan);
  next.seats.delete(id);
  for (const z of ZONE_IDS) {
    next.order[z] = next.order[z].filter((x) => x !== id);
    next.queue[z] = next.queue[z].filter((x) => x !== id);
  }
  return next;
}

/** 1-based rank inside the zone (also for the waiting queue), or null. */
export function rankInZone(plan: SeatPlan, id: string): number | null {
  for (const z of ZONE_IDS) {
    const i = plan.order[z].indexOf(id);
    if (i >= 0) return i + 1;
  }
  return null;
}

export function emptySeatPlan(): SeatPlan {
  return { seats: new Map(), queue: emptyRecord(), order: emptyRecord(), computedAt: 0 };
}
