import { LIMITS, ZONE_IDS } from './rules';

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
