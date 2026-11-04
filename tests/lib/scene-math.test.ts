import { describe, expect, it } from 'vitest';
import { arcPoint, bounce } from '@/lib/arc';
import { joystickAxis, knobOffset } from '@/lib/joystick';
import { BOUNDS, bowlPosition, groundY, PLAZA_COLLIDERS, seatTransform, visitSpot, zoneIndexAtZ, zonesAtZ } from '@/lib/layout';
import { constrain, inputToWorld, stepMover, toTarget, type Mover, WALK_SPEED } from '@/lib/movement';
import { pickTarget, rayGround } from '@/lib/picking';
import { SnapshotBuffer } from '@/lib/snapshot';
import { newBotWalker, stepBotWalker } from '@/lib/botWalk';

const norm = (x: number, y: number, z: number) => {
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
};

describe('movement', () => {
  it('clamps to the walkable strip', () => {
    const p = { x: 99, z: -9999 };
    constrain(p);
    expect(p.x).toBe(BOUNDS.maxX);
    expect(p.z).toBe(BOUNDS.minZ);
  });
  it('pushes out of plaza colliders', () => {
    const c = PLAZA_COLLIDERS[0];
    const p = { x: c.x + 0.5, z: c.z };
    constrain(p);
    expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeGreaterThanOrEqual(c.r - 1e-9);
  });
  it('maps camera-relative input to world (yaw 0: forward is -Z)', () => {
    const f = inputToWorld(0, 1, 0);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(-1);
    const r = inputToWorld(1, 0, 0);
    expect(r.x).toBeCloseTo(1);
    const diag = inputToWorld(1, 1, 0);
    expect(Math.hypot(diag.x, diag.z)).toBeCloseTo(1);
  });
  it('accelerates toward walking speed and faces its heading', () => {
    const m: Mover = { x: 0, z: 8, vx: 0, vz: 0, ry: 0 };
    for (let i = 0; i < 120; i++) stepMover(m, 0, -1, false, 1 / 60);
    expect(Math.abs(m.vz)).toBeGreaterThan(WALK_SPEED * 0.9);
    expect(m.z).toBeLessThan(8 - 4);
    expect(Math.abs(Math.abs(m.ry) - Math.PI)).toBeLessThan(0.3);
  });
  it('tap target direction and arrival', () => {
    expect(toTarget({ x: 0, z: 0 }, { x: 0, z: -10 }).z).toBeCloseTo(-1);
    expect(toTarget({ x: 0, z: 0 }, { x: 0.1, z: 0.1 }).arrived).toBe(true);
  });
});

describe('layout helpers', () => {
  it('zone lookup and neighbours', () => {
    expect(zoneIndexAtZ(5)).toBe(-1);
    expect(zoneIndexAtZ(-1)).toBe(0);
    expect(zoneIndexAtZ(-37)).toBe(1);
    expect(zoneIndexAtZ(-9999)).toBe(9);
    expect(zonesAtZ(10)).toEqual({ current: 'plaza', neighbor: 'backend' });
    expect(zonesAtZ(-5).neighbor).toBe('plaza');
    expect(zonesAtZ(-30)).toEqual({ current: 'backend', neighbor: 'frontend' });
    expect(zonesAtZ(-359).neighbor).toBeNull();
  });
  it('sidewalk is higher than the road', () => {
    expect(groundY(0)).toBe(0);
    expect(groundY(6)).toBeGreaterThan(0);
  });
  it('visit spot is on the walkable street side and the bowl is toward the street', () => {
    for (const seat of [1, 2, 29, 30]) {
      const v = visitSpot(3, seat);
      const s = seatTransform(3, seat);
      expect(Math.abs(v.x)).toBeLessThanOrEqual(BOUNDS.maxX);
      expect(Math.sign(v.x)).toBe(Math.sign(s.x));
      expect(Math.abs(bowlPosition(3, seat).x)).toBeLessThan(Math.abs(s.x));
    }
  });
});

describe('picking', () => {
  const targets = [
    { id: 'a', x: 6.2, z: -5 },
    { id: 'b', x: 6.2, z: -9 },
    { id: 'c', x: -6.2, z: -5 },
  ];
  it('hits the seat under a ray from the camera', () => {
    const o = { x: 0, y: 4, z: 2 };
    const d = norm(6.2 - 0, 1 - 4, -5 - 2);
    expect(pickTarget(o, d, targets)?.id).toBe('a');
  });
  it('misses when aiming at the road', () => {
    const o = { x: 0, y: 4, z: 2 };
    expect(pickTarget(o, norm(0, -4, -10), targets)).toBeNull();
  });
  it('picks the nearest of two along the ray', () => {
    const o = { x: 6.2, y: 1, z: 5 };
    expect(pickTarget(o, norm(0, 0, -1), targets)?.id).toBe('a');
  });
  it('ignores targets beyond max distance', () => {
    const o = { x: 6.2, y: 1, z: 60 };
    expect(pickTarget(o, norm(0, 0, -1), targets, 40)).toBeNull();
  });
  it('intersects the ground', () => {
    const g = rayGround({ x: 0, y: 4, z: 0 }, norm(0, -1, -1));
    expect(g!.z).toBeCloseTo(-4);
    expect(rayGround({ x: 0, y: 4, z: 0 }, norm(0, 1, -1))).toBeNull();
  });
});

describe('joystick', () => {
  it('has a dead zone and caps at 1', () => {
    expect(joystickAxis(2, 2, 50)).toEqual({ x: 0, y: 0 });
    const a = joystickAxis(500, 0, 50);
    expect(a.x).toBeCloseTo(1);
    expect(a.y).toBeCloseTo(0);
  });
  it('up on screen is forward (+y)', () => {
    expect(joystickAxis(0, -40, 50).y).toBeGreaterThan(0.5);
    expect(joystickAxis(0, 40, 50).y).toBeLessThan(-0.5);
  });
  it('clamps the knob to the base', () => {
    const k = knobOffset(300, 400, 50);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(50);
  });
});

describe('arc', () => {
  const from = { x: 0, y: 1, z: 0 };
  const to = { x: 4, y: 0, z: -2 };
  it('starts and ends at the endpoints and peaks in between', () => {
    expect(arcPoint(from, to, 0, 2)).toEqual(from);
    expect(arcPoint(from, to, 1, 2)).toEqual(to);
    const mid = arcPoint(from, to, 0.5, 2);
    expect(mid.y).toBeCloseTo(0.5 + 2);
    expect(mid.x).toBeCloseTo(2);
  });
  it('clamps t and bounce decays', () => {
    expect(arcPoint(from, to, 5, 2).x).toBe(4);
    expect(bounce(-1)).toBe(0);
    expect(bounce(2)).toBeLessThan(0.001);
  });
});

describe('SnapshotBuffer', () => {
  it('interpolates between snapshots and holds at the ends', () => {
    const b = new SnapshotBuffer();
    const out = { x: 0, z: 0, ry: 0, moving: false };
    expect(b.sample(0, out)).toBe(false);
    b.push(1000, { x: 0, z: 0, ry: 0, moving: true });
    b.push(1200, { x: 2, z: -4, ry: 1, moving: true });
    b.sample(1100, out);
    expect(out.x).toBeCloseTo(1);
    expect(out.z).toBeCloseTo(-2);
    b.sample(5000, out);
    expect(out.x).toBe(2);
    b.sample(0, out);
    expect(out.x).toBe(0);
  });
  it('snaps on teleports and takes the short way around angles', () => {
    const b = new SnapshotBuffer();
    const out = { x: 0, z: 0, ry: 0, moving: false };
    b.push(0, { x: 0, z: 0, ry: 3, moving: false });
    b.push(100, { x: 50, z: 0, ry: -3, moving: false });
    b.sample(40, out);
    expect(out.x).toBe(0);
    const c = new SnapshotBuffer();
    c.push(0, { x: 0, z: 0, ry: 3, moving: false });
    c.push(100, { x: 1, z: 0, ry: -3, moving: false });
    c.sample(50, out);
    expect(Math.abs(Math.cos(out.ry) + 1)).toBeLessThan(0.01);
  });
  it('ignores out-of-order snapshots', () => {
    const b = new SnapshotBuffer();
    b.push(100, { x: 1, z: 0, ry: 0, moving: false });
    b.push(50, { x: 9, z: 0, ry: 0, moving: false });
    expect(b.size).toBe(1);
  });
});

describe('botWalk', () => {
  it('wanders inside bounds', () => {
    let s = 12345;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const b = newBotWalker('w1', rand);
    for (let i = 0; i < 5000; i++) {
      stepBotWalker(b, 0.2, rand);
      expect(b.x).toBeGreaterThanOrEqual(BOUNDS.minX - 1e-6);
      expect(b.x).toBeLessThanOrEqual(BOUNDS.maxX + 1e-6);
      expect(b.z).toBeLessThanOrEqual(BOUNDS.maxZ + 1e-6);
      expect(b.z).toBeGreaterThanOrEqual(BOUNDS.minZ);
    }
  });
});
