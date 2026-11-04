export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PickTarget {
  id: string;
  x: number;
  z: number;
  /** capsule radius around the vertical axis (m) */
  r?: number;
  /** height of the vertical axis (m) */
  h?: number;
}

export const SEAT_PICK_RADIUS = 0.8;
export const SEAT_PICK_HEIGHT = 1.6;
export const PICK_MAX_DIST = 40;
/** Extra tolerance per metre of distance so far targets stay tappable (about 44 px at normal zoom). */
const TOLERANCE_PER_M = 0.03;

/** Ray (origin o, unit direction d) vs ground plane y = 0. */
export function rayGround(o: Vec3, d: Vec3, y = 0): { x: number; z: number } | null {
  if (Math.abs(d.y) < 1e-6) return null;
  const t = (y - o.y) / d.y;
  if (t < 0) return null;
  return { x: o.x + d.x * t, z: o.z + d.z * t };
}

/**
 * Nearest target hit by the ray, tested mathematically against vertical segments (no mesh raycasting).
 * Returns the distance along the ray `t`.
 */
export function pickTarget(o: Vec3, d: Vec3, targets: readonly PickTarget[], maxDist = PICK_MAX_DIST): { id: string; t: number } | null {
  let best: { id: string; t: number } | null = null;
  for (const c of targets) {
    const h = c.h ?? SEAT_PICK_HEIGHT;
    // segment: (c.x, s, c.z), s in [0, h]
    const wx = o.x - c.x;
    const wy = o.y;
    const wz = o.z - c.z;
    const b = d.y;
    const dd = d.x * wx + d.y * wy + d.z * wz;
    const e = wy;
    const denom = 1 - b * b;
    let s = denom < 1e-6 ? h / 2 : (e - b * dd) / denom;
    s = Math.min(h, Math.max(0, s));
    // refine t for the clamped s
    const px = c.x - o.x;
    const py = s - o.y;
    const pz = c.z - o.z;
    const t = Math.max(0, d.x * px + d.y * py + d.z * pz);
    // re-project s for that t
    s = Math.min(h, Math.max(0, o.y + d.y * t));
    const dx = o.x + d.x * t - c.x;
    const dy = o.y + d.y * t - s;
    const dz = o.z + d.z * t - c.z;
    const dist = Math.hypot(dx, dy, dz);
    if (t > maxDist) continue;
    if (dist <= (c.r ?? SEAT_PICK_RADIUS) + TOLERANCE_PER_M * t && (!best || t < best.t)) best = { id: c.id, t };
  }
  return best;
}
