import type { CandidateCard } from '@/backend/types';
import { SIDEWALK_TOP, seatTransform } from '@/lib/layout';
import { zoneIndex } from '@/lib/zones';
import type { SeatPlan } from '@/lib/seats';

export interface SeatInfo {
  id: string;
  zoneIdx: number;
  seat: number;
  x: number;
  z: number;
  rotY: number;
  card: CandidateCard;
}

/** Seated candidates placed on the street (status sitting with a seat in the plan). */
export function buildSeatList(plan: SeatPlan, candidates: Record<string, CandidateCard>): SeatInfo[] {
  const out: SeatInfo[] = [];
  for (const [id, s] of plan.seats) {
    const card = candidates[id];
    if (!card || card.status !== 'sitting') continue;
    const zoneIdx = zoneIndex(s.zone);
    const t = seatTransform(zoneIdx, s.seat);
    out.push({ id, zoneIdx, seat: s.seat, x: t.x, z: t.z, rotY: t.rotY, card });
  }
  return out;
}

/** Mutable snapshot of what is on the street, shared with picking, labels and effects (read inside useFrame). */
export const sceneData = {
  seats: [] as SeatInfo[],
  byId: new Map<string, SeatInfo>(),
  set(list: SeatInfo[]) {
    this.seats = list;
    this.byId = new Map(list.map((s) => [s.id, s]));
  },
};

export const SEAT_Y = SIDEWALK_TOP;
