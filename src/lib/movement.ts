import { BOUNDS, PLAZA_COLLIDERS } from './layout';

export const WALK_SPEED = 4.5;
export const RUN_SPEED = 8;
const ACCEL = 9;
const TURN = 12;

export interface Mover {
  x: number;
  z: number;
  vx: number;
  vz: number;
  ry: number;
}

export const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

/** Shortest-arc angle interpolation. */
export function dampAngle(a: number, b: number, lambda: number, dt: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
}

/** Camera-relative stick (x = right, y = forward) to a world direction. yaw 0 = camera behind the walker looking toward -Z. */
export function inputToWorld(ax: number, ay: number, yaw: number): { x: number; z: number } {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const x = fx * ay + rx * ax;
  const z = fz * ay + rz * ax;
  const len = Math.hypot(x, z);
  return len > 1 ? { x: x / len, z: z / len } : { x, z };
}

/** Direction toward a tap-to-move target; `arrived` once within `eps`. */
export function toTarget(m: Pick<Mover, 'x' | 'z'>, t: { x: number; z: number }, eps = 0.35): { x: number; z: number; arrived: boolean } {
  const dx = t.x - m.x;
  const dz = t.z - m.z;
  const d = Math.hypot(dx, dz);
  if (d <= eps) return { x: 0, z: 0, arrived: true };
  return { x: dx / d, z: dz / d, arrived: false };
}

/** Keeps a point inside the walkable strip and pushes it out of the plaza colliders. */
export function constrain(p: { x: number; z: number }): void {
  p.x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, p.x));
  p.z = Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, p.z));
  for (const c of PLAZA_COLLIDERS) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    if (d < c.r) {
      if (d < 1e-4) p.x = c.x + c.r;
      else {
        p.x = c.x + (dx / d) * c.r;
        p.z = c.z + (dz / d) * c.r;
      }
    }
  }
}

/** One kinematic step. Mutates `m` (no allocations in useFrame). `wish` is a world direction with length <= 1. */
export function stepMover(m: Mover, wishX: number, wishZ: number, run: boolean, dt: number): void {
  const speed = run ? RUN_SPEED : WALK_SPEED;
  m.vx = damp(m.vx, wishX * speed, ACCEL, dt);
  m.vz = damp(m.vz, wishZ * speed, ACCEL, dt);
  m.x += m.vx * dt;
  m.z += m.vz * dt;
  constrain(m);
  if (Math.hypot(m.vx, m.vz) > 0.4) m.ry = dampAngle(m.ry, Math.atan2(m.vx, m.vz), TURN, dt);
}
