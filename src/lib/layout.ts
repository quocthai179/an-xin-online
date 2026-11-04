import { LIMITS, ZONE_IDS, type ZoneId } from './rules';

export const ZONE_LENGTH = 36;
export const ZONE_GATE_DEPTH = 4;
export const PLAZA_LENGTH = 24;
export const SEAT_X = 6.2;
export const SEAT_ROW_SPACING = 2;
export const WALK_HALF_WIDTH = 5.2;

export function zoneStartZ(zoneIndex: number): number {
  return -ZONE_LENGTH * zoneIndex;
}

export interface SeatTransform {
  x: number;
  z: number;
  rotY: number;
}

/** seat 1..30; odd = left (x<0), even = right; seat 1 nearest the street head. */
export function seatTransform(zoneIndex: number, seat: number): SeatTransform {
  const row = Math.ceil(seat / 2) - 1;
  const side = seat % 2 === 1 ? -1 : 1;
  return {
    x: side * SEAT_X,
    z: zoneStartZ(zoneIndex) - ZONE_GATE_DEPTH - row * SEAT_ROW_SPACING - 1,
    rotY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
  };
}

export const BOUNDS = {
  minX: -WALK_HALF_WIDTH,
  maxX: WALK_HALF_WIDTH,
  minZ: zoneStartZ(ZONE_IDS.length - 1) - ZONE_LENGTH + 1,
  maxZ: PLAZA_LENGTH - 1,
};

export const SPAWN = { x: 0, z: 8, ry: 0 };

export const PLAZA = {
  temple: { x: -6, z: 14 },
  wall: { x: 6, z: 14 },
};

export function clampToBounds(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, x)),
    z: Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, z)),
  };
}

export const MAX_SEATS = LIMITS.seatsPerZone;

// ---- 3D helpers (pure numbers) ----

export const SIDEWALK_X = 3;
export const SIDEWALK_TOP = 0.1;

/** Circle colliders the walker is pushed out of (temple and wall of fame in the plaza). */
export const PLAZA_COLLIDERS: { x: number; z: number; r: number }[] = [
  { x: PLAZA.temple.x, z: PLAZA.temple.z, r: 3.4 },
  { x: PLAZA.wall.x, z: PLAZA.wall.z, r: 2.4 },
];

/** Walking height: the sidewalk is a few centimetres above the road. */
export function groundY(x: number): number {
  const t = Math.min(1, Math.max(0, (Math.abs(x) - (SIDEWALK_X - 0.2)) / 0.4));
  return SIDEWALK_TOP * t;
}

/** Zone index (0-based) for a z coordinate, or -1 inside the plaza (z > 0). */
export function zoneIndexAtZ(z: number): number {
  if (z > 0) return -1;
  return Math.min(ZONE_IDS.length - 1, Math.floor(-z / ZONE_LENGTH));
}

/** Zone the walker is in plus the closest neighbour (presence listens to both). */
export function zonesAtZ(z: number): { current: ZoneId | 'plaza'; neighbor: ZoneId | 'plaza' | null } {
  const i = zoneIndexAtZ(z);
  if (i < 0) return { current: 'plaza', neighbor: ZONE_IDS[0] };
  const frac = (-z - i * ZONE_LENGTH) / ZONE_LENGTH;
  const neighborIdx = frac < 0.5 ? i - 1 : i + 1;
  const neighbor = neighborIdx < 0 ? 'plaza' : neighborIdx >= ZONE_IDS.length ? null : ZONE_IDS[neighborIdx];
  return { current: ZONE_IDS[i], neighbor };
}

/** Point where a visitor stands to face the candidate on a seat (street side of the seat). */
export function visitSpot(zoneIdx: number, seat: number): { x: number; z: number; ry: number } {
  const s = seatTransform(zoneIdx, seat);
  const side = s.x < 0 ? -1 : 1;
  return { x: side * (SEAT_X - 2.4), z: s.z, ry: side < 0 ? -Math.PI / 2 : Math.PI / 2 };
}

/** World position of the bowl of a seated candidate (seat origin + 1.0 m toward the street). */
export function bowlPosition(zoneIdx: number, seat: number): { x: number; y: number; z: number } {
  const s = seatTransform(zoneIdx, seat);
  return { x: s.x + Math.sin(s.rotY) * 1.0, y: SIDEWALK_TOP + 0.15, z: s.z + Math.cos(s.rotY) * 1.0 };
}
