export interface PoseSample {
  x: number;
  z: number;
  ry: number;
  moving: boolean;
}

interface Snap extends PoseSample {
  t: number;
}

const MAX_SNAPS = 8;
/** A jump bigger than this between two snapshots is a teleport: do not interpolate. */
const SNAP_DISTANCE = 15;

function lerpAngle(a: number, b: number, k: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

/** Remote pose buffer: render a little in the past (typically now - 120 ms) and interpolate between two snapshots. */
export class SnapshotBuffer {
  private snaps: Snap[] = [];

  push(t: number, p: PoseSample): void {
    const last = this.snaps[this.snaps.length - 1];
    if (last && t < last.t) return;
    this.snaps.push({ t, x: p.x, z: p.z, ry: p.ry, moving: p.moving });
    if (this.snaps.length > MAX_SNAPS) this.snaps.shift();
  }

  get size(): number {
    return this.snaps.length;
  }

  /** Fills `out` with the pose at time `t`. Returns false while the buffer is empty. */
  sample(t: number, out: PoseSample): boolean {
    const s = this.snaps;
    if (s.length === 0) return false;
    if (t <= s[0].t || s.length === 1) return copy(s[0], out);
    const last = s[s.length - 1];
    if (t >= last.t) return copy(last, out);
    for (let i = s.length - 1; i > 0; i--) {
      const a = s[i - 1];
      const b = s[i];
      if (t >= a.t) {
        if (Math.hypot(b.x - a.x, b.z - a.z) > SNAP_DISTANCE) return copy(t - a.t < b.t - t ? a : b, out);
        const k = (t - a.t) / Math.max(1, b.t - a.t);
        out.x = a.x + (b.x - a.x) * k;
        out.z = a.z + (b.z - a.z) * k;
        out.ry = lerpAngle(a.ry, b.ry, k);
        out.moving = b.moving || a.moving;
        return true;
      }
    }
    return copy(s[0], out);
  }
}

function copy(a: PoseSample, out: PoseSample): boolean {
  out.x = a.x;
  out.z = a.z;
  out.ry = a.ry;
  out.moving = a.moving;
  return true;
}
