import { describe, expect, it } from 'vitest';
import { MemoryBus } from '@/backend/demo/bus';
import { DemoPresence } from '@/backend/demo/presence';
import { claimIdentity, MemoryIdentityLocks, SESSION_UID_KEY } from '@/backend/demo/identity';
import { MemoryStore } from '@/backend/demo/db';
import type { PeerMeta, Pose } from '@/backend/types';
import { AVATAR } from './helpers';

const meta = (uid: string): PeerMeta => ({ uid, name: uid, role: 'hr', company: 'ACME', avatar: AVATAR });
const pose: Pose = { x: 1, z: -5, ry: 0.5, moving: true };

describe('DemoPresence', () => {
  it('peers see each other, poses carry meta, and peers expire after 15 s', async () => {
    const hub = new MemoryBus();
    let t = 1000;
    const a = new DemoPresence(hub, 'a', () => t, { timers: false });
    const b = new DemoPresence(hub.peer(), 'b', () => t, { timers: false });
    const poses: string[] = [];
    const counts: number[] = [];
    const left: string[] = [];
    b.subscribe({
      onPose: (uid, p, m) => poses.push(`${uid}:${p.x}:${m?.name ?? '-'}`),
      onLeave: (u) => left.push(u),
      onReaction: () => undefined,
      onCount: (n) => counts.push(n),
    });
    await b.join(meta('b'), 'backend');
    await a.join(meta('a'), 'backend');
    expect(b.count).toBe(2);
    expect(a.count).toBe(2);
    expect(counts.at(-1)).toBe(2);

    a.publishPose(pose);
    expect(poses).toEqual(['a:1:a']);
    t += 50;
    a.publishPose(pose); // throttled at 5 Hz
    expect(poses).toHaveLength(1);
    t += 300;
    a.publishPose({ ...pose, x: 2 });
    expect(poses.at(-1)).toBe('a:2:a'); // meta known from hello

    t += 16_000;
    b.sweep(t);
    expect(left).toEqual(['a']);
    expect(b.count).toBe(1);
  });

  it('only listens to the subscribed zones and clamps poses to the street', async () => {
    const hub = new MemoryBus();
    let t = 10_000;
    const a = new DemoPresence(hub, 'a', () => t, { timers: false });
    const b = new DemoPresence(hub.peer(), 'b', () => t, { timers: false });
    const got: number[] = [];
    b.subscribe({ onPose: (_u, p) => got.push(p.x), onLeave: () => undefined, onReaction: () => undefined, onCount: () => undefined });
    await a.join(meta('a'), 'qa');
    await b.join(meta('b'), 'backend');
    a.publishPose({ x: 1, z: -5, ry: 0, moving: true });
    expect(got).toEqual([]);
    b.setZones('backend', 'qa');
    t += 5000;
    a.publishPose({ x: 99, z: -5, ry: 0, moving: false });
    expect(got).toEqual([5.2]);
  });

  it('throttles reactions 1 per 3 s and drops leavers on bye', async () => {
    const hub = new MemoryBus();
    let t = 10_000;
    const a = new DemoPresence(hub, 'a', () => t, { timers: false });
    const b = new DemoPresence(hub.peer(), 'b', () => t, { timers: false });
    const reacts: string[] = [];
    const left: string[] = [];
    b.subscribe({ onPose: () => undefined, onLeave: (u) => left.push(u), onReaction: (u, e) => reacts.push(`${u}:${e}`), onCount: () => undefined });
    await a.join(meta('a'), 'backend');
    await b.join(meta('b'), 'backend');
    expect(a.sendReaction('heart', 0, 0)).toBe(true);
    expect(a.sendReaction('fire', 0, 0)).toBe(false);
    t += 3000;
    expect(a.sendReaction('fire', 0, 0)).toBe(true);
    expect(reacts).toEqual(['a:heart', 'a:fire']);
    await a.leave();
    expect(left).toEqual(['a']);
  });
});

describe('claimIdentity', () => {
  const mk = () => ({ local: new MemoryStore(), locks: new MemoryIdentityLocks() });
  let n = 0;
  const newId = () => `u${++n}`;

  it('each tab becomes a different user, reload keeps the user, a new browser restores the first free user', async () => {
    const { local, locks } = mk();
    const s1 = new MemoryStore();
    const s2 = new MemoryStore();
    const u1 = await claimIdentity({ local, session: s1, locks, newId });
    const u2 = await claimIdentity({ local, session: s2, locks, newId });
    expect(u1).not.toBe(u2);
    expect(s1.get(SESSION_UID_KEY)).toBe(u1);

    // reload of tab 1: lock released, session id survives
    const reloadLocks = new MemoryIdentityLocks();
    expect(await claimIdentity({ local, session: s1, locks: reloadLocks, newId })).toBe(u1);

    // a duplicated tab copies sessionStorage but cannot take the lock -> new user
    const dupSession = new MemoryStore();
    dupSession.set(SESSION_UID_KEY, u1);
    const u3 = await claimIdentity({ local, session: dupSession, locks, newId });
    expect([u1, u2]).not.toContain(u3);

    // browser reopened: no locks held, no session -> first stored user
    expect(await claimIdentity({ local, session: new MemoryStore(), locks: new MemoryIdentityLocks(), newId })).toBe(u1);
  });

  it('?as= forces a deterministic id', async () => {
    const { local, locks } = mk();
    expect(await claimIdentity({ local, session: new MemoryStore(), locks, newId }, 'hr1')).toBe('demo-hr1');
    expect(await claimIdentity({ local, session: new MemoryStore(), locks, newId }, 'a b<c>')).toBe('demo-abc');
  });
});
