'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, type InstancedMesh, Object3D, Sprite, SpriteMaterial, type CanvasTexture } from 'three';
import type { ReactionEmoji, StreetEvent } from '@/backend/types';
import { playCoin, playNote, playOffer } from '@/audio/sfx';
import { arcPoint, bounce, flutter, type V3 } from '@/lib/arc';
import { bowlPosition, groundY } from '@/lib/layout';
import { zoneIndex } from '@/lib/zones';
import { input } from '@/state/input';
import { peers, reactionQueue } from '@/state/peers';
import { useSession } from '@/state/session';
import { useWorld } from '@/state/world';
import { prefersReducedMotion } from '@/scene-lib/capability';
import { drawEmoji } from '@/scene-lib/labelTexture';
import { TextureCache } from '@/scene-lib/textureCache';

export const EMOJI: Record<ReactionEmoji, string> = { heart: '❤️', laugh: '😂', pray: '🙏', fire: '🔥', cry: '😢', clap: '👏' };

const dummy = new Object3D();
const tmpV: V3 = { x: 0, y: 0, z: 0 };
const COINS = 30;
const NOTES = 12;
const CONFETTI = 150;
const HEAR_RANGE = 30;

interface Fx {
  t0: number;
  dur: number;
  from: V3;
  to: V3;
  idx: number[];
  seed: number;
}

/** Position of a giver: our own walker, a known remote walker, or 3 m above the candidate as a fallback. */
function giverPosition(uid: string, candId: string, out: V3): V3 {
  const me = useSession.getState().me?.profile.id;
  if (uid === me) {
    out.x = input.player.x;
    out.z = input.player.z;
    out.y = 1.4;
    return out;
  }
  const p = peers.get(uid);
  if (p) {
    out.x = p.cur.x;
    out.z = p.cur.z;
    out.y = 1.4;
    return out;
  }
  const seat = useWorld.getState().plan.seats.get(candId);
  if (seat) {
    const b = bowlPosition(zoneIndex(seat.zone), seat.seat);
    out.x = b.x * 0.5;
    out.z = b.z;
    out.y = 3;
    return out;
  }
  out.x = 0;
  out.z = 0;
  out.y = 3;
  return out;
}

/** Coins, 500k notes and confetti for live street events, pooled in three instanced meshes. */
export function GiftEffects() {
  const coins = useRef<InstancedMesh>(null);
  const notes = useRef<InstancedMesh>(null);
  const confetti = useRef<InstancedMesh>(null);
  const fxCoins = useRef<Fx[]>([]);
  const fxNotes = useRef<Fx[]>([]);
  const fxConfetti = useRef<Fx[]>([]);
  const ring = useRef({ coin: 0, note: 0, conf: 0 });
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const backend = useSession((s) => s.backend);

  useEffect(() => {
    if (!backend) return;
    const clock = () => performance.now() / 1000;
    const off = backend.onStreetEvent((e: StreetEvent) => {
      if (e.type === 'incense' || e.type === 'candidate_upsert' || e.type === 'candidate_remove') return;
      const candId = e.candidate.id;
      const seat = useWorld.getState().plan.seats.get(candId);
      if (!seat) return;
      const bowl = bowlPosition(zoneIndex(seat.zone), seat.seat);
      const dist = Math.hypot(bowl.x - input.player.x, bowl.z - input.player.z);
      if (dist > HEAR_RANGE) return;
      const gainDb = -20 * Math.log10(1 + dist / 6);
      const now = clock();
      const mine = candId === useSession.getState().me?.candidate?.id;
      if (e.type === 'gift' && e.kind === 'xu') {
        const from = giverPosition(e.giver.id, candId, { x: 0, y: 0, z: 0 });
        const i = ring.current.coin++ % COINS;
        const ownThrow = e.giver.id === useSession.getState().me?.profile.id;
        // our own throw gets a longer, higher arc and the "leng keng" lands with the coin
        const dur = reduced ? 0.15 : ownThrow ? 0.95 : 0.75;
        fxCoins.current.push({ t0: now, dur, from, to: bowl, idx: [i], seed: i });
        if (ownThrow) setTimeout(() => playCoin(-2), dur * 1000);
        else if (!mine) playCoin(gainDb);
      } else if (e.type === 'gift') {
        // love: a heart floats up from the bowl
        onHeart(bowl.x, bowl.z);
      } else if (e.type === 'invite') {
        const from = giverPosition(e.giver.id, candId, { x: 0, y: 0, z: 0 });
        const i = ring.current.note++ % NOTES;
        fxNotes.current.push({ t0: now, dur: reduced ? 0.2 : 1.3, from, to: bowl, idx: [i], seed: i });
        if (!mine) playNote(gainDb);
      } else if (e.type === 'offer' || e.type === 'placed') {
        const idx: number[] = [];
        for (let k = 0; k < 40; k++) idx.push(ring.current.conf++ % CONFETTI);
        fxConfetti.current.push({ t0: now, dur: reduced ? 0.3 : 2.4, from: { x: bowl.x, y: 0.5, z: bowl.z }, to: bowl, idx, seed: now * 1000 });
        if (e.type === 'placed' && !mine) playOffer(gainDb);
      }
    });
    return off;
  }, [backend, reduced]);

  const colors = useMemo(() => ['#e04848', '#e0a82e', '#3b82c4', '#3aa66b', '#ee6fa6', '#8b5fd0'].map((c) => new Color(c)), []);
  useEffect(() => {
    const m = confetti.current;
    if (!m) return;
    for (let i = 0; i < CONFETTI; i++) m.setColorAt(i, colors[i % colors.length]);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [colors]);

  useFrame(() => {
    const now = performance.now() / 1000;
    const c = coins.current;
    const n = notes.current;
    const f = confetti.current;
    if (!c || !n || !f) return;

    c.count = COINS;
    for (let i = 0; i < COINS; i++) hide(c, i);
    fxCoins.current = fxCoins.current.filter((fx) => {
      const u = (now - fx.t0) / fx.dur;
      if (u > 1.6) return false;
      const i = fx.idx[0];
      if (u <= 1) arcPoint(fx.from, fx.to, u, 2.2, tmpV);
      else {
        tmpV.x = fx.to.x;
        tmpV.y = fx.to.y + bounce((u - 1) * fx.dur);
        tmpV.z = fx.to.z;
      }
      dummy.position.set(tmpV.x, tmpV.y, tmpV.z);
      dummy.rotation.set(now * 9 + fx.seed, 0, now * 7);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);
      return true;
    });
    c.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NOTES; i++) hide(n, i);
    fxNotes.current = fxNotes.current.filter((fx) => {
      const u = (now - fx.t0) / fx.dur;
      if (u > 1.4) return false;
      const k = Math.min(1, u);
      arcPoint(fx.from, fx.to, k, 1.2, tmpV);
      const w = flutter(k);
      dummy.position.set(tmpV.x, tmpV.y, tmpV.z);
      dummy.rotation.set(w.pitch + 1.2, now * 2, w.roll);
      dummy.scale.setScalar(u > 1 ? Math.max(0, 1 - (u - 1) * 2.5) : 1);
      dummy.updateMatrix();
      n.setMatrixAt(fx.idx[0], dummy.matrix);
      return true;
    });
    n.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < CONFETTI; i++) hide(f, i);
    fxConfetti.current = fxConfetti.current.filter((fx) => {
      const u = (now - fx.t0) / fx.dur;
      if (u > 1) return false;
      const t = u * fx.dur;
      fx.idx.forEach((i, k) => {
        const a = (k / fx.idx.length) * Math.PI * 2 + fx.seed;
        const sp = 1.2 + ((k * 37) % 10) * 0.25;
        dummy.position.set(fx.from.x + Math.cos(a) * sp * t * 0.9, fx.from.y + 3.2 * t - 3.6 * t * t + 0.4, fx.from.z + Math.sin(a) * sp * t * 0.9);
        dummy.rotation.set(t * 8 + k, t * 5, t * 3);
        dummy.scale.setScalar(Math.max(0, 1 - u * u));
        dummy.updateMatrix();
        f.setMatrixAt(i, dummy.matrix);
      });
      return true;
    });
    f.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={coins} args={[undefined, undefined, COINS]} frustumCulled={false}>
        <cylinderGeometry args={[0.1, 0.1, 0.025, 10]} />
        <meshBasicMaterial color="#ffc93c" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={notes} args={[undefined, undefined, NOTES]} frustumCulled={false}>
        <planeGeometry args={[0.42, 0.2]} />
        <meshBasicMaterial color="#35c28a" side={2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={confetti} args={[undefined, undefined, CONFETTI]} frustumCulled={false}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshBasicMaterial side={2} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function hide(m: InstancedMesh, i: number): void {
  dummy.position.set(0, -50, 0);
  dummy.scale.setScalar(0.0001);
  dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
}

function onHeart(x: number, z: number): void {
  reactionQueue.push({ uid: '', emoji: 'heart', x, z });
}

interface Float {
  sprite: Sprite;
  t0: number;
  x: number;
  z: number;
  active: boolean;
}

const MAX_FLOATS = 20;
const FLOAT_S = 2;

/** Floating emoji above avatars; remote ones come from presence, local ones from the ReactionBar. */
export function Reactions3D() {
  const cache = useMemo(() => new TextureCache(8), []);
  const floats = useMemo<Float[]>(
    () =>
      Array.from({ length: MAX_FLOATS }, () => {
        const sprite = new Sprite(new SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
        sprite.visible = false;
        sprite.renderOrder = 11;
        return { sprite, t0: 0, x: 0, z: 0, active: false };
      }),
    [],
  );
  const reduced = useMemo(() => prefersReducedMotion(), []);
  useEffect(
    () => () => {
      cache.clear();
      floats.forEach((f) => f.sprite.material.dispose());
    },
    [cache, floats],
  );

  useFrame(() => {
    const now = performance.now() / 1000;
    while (reactionQueue.length) {
      const r = reactionQueue.shift()!;
      const f = floats.find((x) => !x.active) ?? floats.reduce((a, b) => (a.t0 < b.t0 ? a : b));
      const tex: CanvasTexture = cache.get(r.emoji, () => drawEmoji(EMOJI[r.emoji] ?? '❤️'));
      f.sprite.material.map = tex;
      f.sprite.material.needsUpdate = true;
      f.t0 = now;
      f.x = r.x;
      f.z = r.z;
      f.active = true;
      f.sprite.visible = true;
    }
    for (const f of floats) {
      if (!f.active) continue;
      const u = (now - f.t0) / FLOAT_S;
      if (u >= 1) {
        f.active = false;
        f.sprite.visible = false;
        continue;
      }
      const rise = reduced ? 0 : u * 1.6;
      const pop = reduced ? 1 : u < 0.15 ? u / 0.15 : 1;
      f.sprite.position.set(f.x + Math.sin(u * 6 + f.x) * 0.12, 2.6 + rise + groundY(f.x), f.z);
      f.sprite.scale.setScalar(0.9 * pop);
      f.sprite.material.opacity = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1;
    }
  });

  return (
    <>
      {floats.map((f, i) => (
        <primitive key={i} object={f.sprite} />
      ))}
    </>
  );
}

