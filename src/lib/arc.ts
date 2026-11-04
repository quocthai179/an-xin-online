export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** Ballistic-looking arc p(t) = lerp(from, to, t) + up * 4h t (1 - t). t is clamped to 0..1. */
export function arcPoint(from: V3, to: V3, t: number, height: number, out: V3 = { x: 0, y: 0, z: 0 }): V3 {
  const k = Math.min(1, Math.max(0, t));
  out.x = from.x + (to.x - from.x) * k;
  out.y = from.y + (to.y - from.y) * k + 4 * height * k * (1 - k);
  out.z = from.z + (to.z - from.z) * k;
  return out;
}

/** Small decaying bounce after landing; u = seconds since landing. */
export function bounce(u: number, amp = 0.12): number {
  if (u <= 0) return 0;
  return Math.abs(Math.sin(u * 14)) * amp * Math.exp(-u * 7);
}

/** Banknote flutter: roll/pitch wobble while flying, t in 0..1. */
export function flutter(t: number): { roll: number; pitch: number } {
  return { roll: Math.sin(t * 18) * 0.7, pitch: Math.sin(t * 11 + 1) * 0.5 };
}
