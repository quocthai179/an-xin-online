import { BOUNDS } from './layout';

export interface BotWalker {
  id: string;
  x: number;
  z: number;
  ry: number;
  tx: number;
  tz: number;
  /** seconds left to idle at the current target */
  wait: number;
  speed: number;
}

const BOT_Z_MIN = -80;

export function newBotWalker(id: string, rand: () => number): BotWalker {
  const b: BotWalker = { id, x: 0, z: 0, ry: 0, tx: 0, tz: 0, wait: 0, speed: 1.6 + rand() * 1.4 };
  b.x = BOUNDS.minX + rand() * (BOUNDS.maxX - BOUNDS.minX);
  b.z = 4 + rand() * 12;
  pickTarget(b, rand);
  return b;
}

function pickTarget(b: BotWalker, rand: () => number): void {
  b.tx = BOUNDS.minX + rand() * (BOUNDS.maxX - BOUNDS.minX);
  b.tz = BOT_Z_MIN + rand() * (BOUNDS.maxZ - BOT_Z_MIN);
}

/** Advances a wandering bot by dt seconds. Returns true while it is moving. Mutates `b`. */
export function stepBotWalker(b: BotWalker, dt: number, rand: () => number): boolean {
  if (b.wait > 0) {
    b.wait -= dt;
    if (b.wait <= 0) pickTarget(b, rand);
    return false;
  }
  const dx = b.tx - b.x;
  const dz = b.tz - b.z;
  const d = Math.hypot(dx, dz);
  const step = b.speed * dt;
  if (d <= step) {
    b.x = b.tx;
    b.z = b.tz;
    b.wait = 2 + rand() * 6;
    return false;
  }
  b.x += (dx / d) * step;
  b.z += (dz / d) * step;
  b.ry = Math.atan2(dx, dz);
  return true;
}
