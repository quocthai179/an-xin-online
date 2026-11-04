'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, type PerspectiveCamera, type Group, type InstancedMesh, MeshLambertMaterial, Object3D, Sprite, SpriteMaterial } from 'three';
import type { AvatarSpec } from '@/backend/types';
import { groundY, SPAWN, zonesAtZ } from '@/lib/layout';
import { constrain, inputToWorld, stepMover, toTarget, type Mover } from '@/lib/movement';
import { input } from '@/state/input';
import { peers } from '@/state/peers';
import { useSession } from '@/state/session';
import { walkerHead, walkerLegs, walkerTorso } from '@/scene-lib/geometry/avatar';
import { drawNameTag } from '@/scene-lib/labelTexture';
import { PANTS, pick, SHIRT, SKIN } from '@/scene-lib/palette';
import { sceneData } from '@/scene-lib/sceneData';
import { TextureCache } from '@/scene-lib/textureCache';
import { prefersReducedMotion } from '@/scene-lib/capability';

const RENDER_DELAY_MS = 120;
const dummy = new Object3D();
const tint = new Color();

function useWalkerParts() {
  return useMemo(
    () => ({ torso: walkerTorso(), legs: walkerLegs(), head: walkerHead(), mat: new MeshLambertMaterial({ vertexColors: true }) }),
    [],
  );
}

/** The local walker: kinematic controller (keys, joystick, tap target), pose publishing and zone tracking. */
export function Player() {
  const parts = useWalkerParts();
  const avatar = useSession((s) => s.me?.profile.avatar);
  const group = useRef<Group>(null);
  const mover = useRef<Mover>({ x: SPAWN.x, z: SPAWN.z, vx: 0, vz: 0, ry: SPAWN.ry });
  const lastPub = useRef(0);
  const zoneKey = useRef('');
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const mats = useMemo(() => {
    const a: AvatarSpec = avatar ?? { skin: 0, shirt: 1, pants: 0, hat: 'none', bowl: 'bowl' };
    return {
      shirt: new MeshLambertMaterial({ color: pick(SHIRT, a.shirt), vertexColors: true }),
      pants: new MeshLambertMaterial({ color: pick(PANTS, a.pants), vertexColors: true }),
      skin: new MeshLambertMaterial({ color: pick(SKIN, a.skin), vertexColors: true }),
    };
  }, [avatar]);
  useEffect(
    () => () => {
      parts.torso.dispose();
      parts.legs.dispose();
      parts.head.dispose();
      parts.mat.dispose();
    },
    [parts],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const m = mover.current;
    if (input.teleport) {
      m.x = input.teleport.x;
      m.z = input.teleport.z;
      m.ry = input.teleport.ry;
      m.vx = m.vz = 0;
      constrain(m);
      input.teleport = null;
    }
    const ax = input.key.x + input.joy.x;
    const ay = input.key.y + input.joy.y;
    let wx = 0;
    let wz = 0;
    if (ax !== 0 || ay !== 0) {
      input.target = null;
      input.faceTo = null;
      const w = inputToWorld(Math.max(-1, Math.min(1, ax)), Math.max(-1, Math.min(1, ay)), input.yaw);
      wx = w.x;
      wz = w.z;
    } else if (input.target) {
      const t = toTarget(m, input.target);
      if (t.arrived) input.target = null;
      wx = t.x;
      wz = t.z;
    }
    stepMover(m, wx, wz, input.run, dt);
    const speed = Math.hypot(m.vx, m.vz);
    const moving = speed > 0.5;
    if (!moving && input.faceTo) {
      const a = Math.atan2(input.faceTo.x - m.x, input.faceTo.z - m.z);
      let d = a - m.ry;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      m.ry += d * Math.min(1, dt * 8);
    }
    input.player.x = m.x;
    input.player.z = m.z;
    input.player.ry = m.ry;
    input.player.moving = moving;

    const g = group.current;
    if (g) {
      const t = clock.elapsedTime;
      const bob = moving && !reduced ? Math.abs(Math.sin(t * (input.run ? 14 : 10))) * 0.07 : 0;
      g.position.set(m.x, groundY(m.x) + bob, m.z);
      g.rotation.set(moving && !reduced ? 0.12 : 0, m.ry, moving && !reduced ? Math.sin(t * 10) * 0.05 : 0, 'YXZ');
    }

    // zone tracking for presence sharding + pose publishing (the backend throttles to its own rate)
    const backend = useSession.getState().backend;
    if (backend) {
      const z = zonesAtZ(m.z);
      const key = `${z.current}|${z.neighbor}`;
      if (key !== zoneKey.current) {
        zoneKey.current = key;
        backend.presence.setZones(z.current, z.neighbor);
      }
      const now = performance.now();
      if (now - lastPub.current > 100) {
        lastPub.current = now;
        backend.presence.publishPose({ x: m.x, z: m.z, ry: m.ry, moving });
      }
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={parts.torso} material={mats.shirt} />
      <mesh geometry={parts.legs} material={mats.pants} />
      <mesh geometry={parts.head} material={mats.skin} />
      {/* hat on the local walker so you can find yourself in a crowd */}
      <mesh position={[0, 1.88, 0]}>
        <coneGeometry args={[0.34, 0.2, 10]} />
        <meshLambertMaterial color="#e8d5a0" />
      </mesh>
    </group>
  );
}

/** Remote walkers: three instanced meshes (torso, legs, head), interpolated 120 ms in the past. */
export function Walkers({ mobile }: { mobile: boolean }) {
  const CAP = mobile ? 25 : 50;
  const parts = useWalkerParts();
  const torso = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const head = useRef<InstancedMesh>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  useEffect(
    () => () => {
      parts.torso.dispose();
      parts.legs.dispose();
      parts.head.dispose();
      parts.mat.dispose();
    },
    [parts],
  );

  useFrame(({ clock }) => {
    const ts = torso.current;
    const ls = legs.current;
    const hs = head.current;
    if (!ts || !ls || !hs) return;
    const now = performance.now();
    const t = clock.elapsedTime;
    let n = 0;
    for (const p of peers.values()) {
      if (n >= CAP) break;
      if (!p.buf.sample(now - RENDER_DELAY_MS, p.cur)) continue;
      const walking = p.cur.moving && !reduced;
      dummy.position.set(p.cur.x, groundY(p.cur.x) + (walking ? Math.abs(Math.sin(t * 10 + n)) * 0.07 : 0), p.cur.z);
      dummy.rotation.set(walking ? 0.12 : 0, p.cur.ry, 0, 'YXZ');
      dummy.updateMatrix();
      const a = p.meta?.avatar;
      ts.setMatrixAt(n, dummy.matrix);
      ls.setMatrixAt(n, dummy.matrix);
      hs.setMatrixAt(n, dummy.matrix);
      ts.setColorAt(n, tint.set(pick(SHIRT, a?.shirt ?? n)));
      ls.setColorAt(n, tint.set(pick(PANTS, a?.pants ?? n)));
      hs.setColorAt(n, tint.set(pick(SKIN, a?.skin ?? n)));
      n++;
    }
    for (const m of [ts, ls, hs]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={torso} args={[parts.torso, parts.mat, CAP]} frustumCulled={false} />
      <instancedMesh ref={legs} args={[parts.legs, parts.mat, CAP]} frustumCulled={false} />
      <instancedMesh ref={head} args={[parts.head, parts.mat, CAP]} frustumCulled={false} />
    </>
  );
}

/** Third-person follow camera. Drag (handled by PointerController) changes `input.yaw`. */
export function FollowCamera({ mobile }: { mobile: boolean }) {
  const { camera } = useThree();
  const pos = useRef({ x: SPAWN.x, y: 4, z: SPAWN.z + 7 });
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const dist = mobile ? 8 : 7;
  const height = mobile ? 5.2 : 4;

  useFrame(({ size }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = input.player;
    // portrait screens need a wider vertical field of view to see both sidewalks
    const fov = size.width / size.height < 0.8 ? 78 : 55;
    const cam = camera as PerspectiveCamera;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // while walking, the orbit eases back behind the walker
    if (!input.dragging && (p.moving || input.key.x !== 0 || input.key.y !== 0)) input.yaw -= input.yaw * (1 - Math.exp(-0.6 * dt));
    const yaw = input.yaw;
    let tx = p.x + Math.sin(yaw) * dist;
    const ty = height + groundY(p.x);
    const tz = p.z + Math.cos(yaw) * dist;
    tx = Math.max(-7.2, Math.min(7.2, tx));
    const k = 1 - Math.exp(-(reduced ? 20 : 9) * dt);
    pos.current.x += (tx - pos.current.x) * k;
    pos.current.y += (ty - pos.current.y) * k;
    pos.current.z += (tz - pos.current.z) * k;
    camera.position.set(pos.current.x, pos.current.y, pos.current.z);
    camera.lookAt(p.x, 1.2, p.z);
  });
  return null;
}

interface Slot {
  key: string;
  uid: string | null;
  x: number;
  z: number;
  y: number;
}

/** Name tags: nearest remote walkers (8) and nearest candidates (4) via a fixed pool of sprites and a texture LRU. */
export function Labels() {
  const SLOTS = 12;
  const cache = useMemo(() => new TextureCache(40), []);
  const sprites = useMemo(
    () =>
      Array.from({ length: SLOTS }, () => {
        const s = new Sprite(new SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
        s.scale.set(1.9, 0.475, 1);
        s.visible = false;
        s.renderOrder = 10;
        return s;
      }),
    [],
  );
  const slots = useRef<(Slot | null)[]>(Array(SLOTS).fill(null));
  const acc = useRef(1);
  useEffect(
    () => () => {
      cache.clear();
      sprites.forEach((s) => s.material.dispose());
    },
    [cache, sprites],
  );

  useFrame((_, dt) => {
    acc.current += dt;
    const px = input.player.x;
    const pz = input.player.z;
    if (acc.current >= 0.25) {
      acc.current = 0;
      const list: { slot: Slot; text: string; accent: string; d: number }[] = [];
      for (const p of peers.values()) {
        if (!p.meta) continue;
        const d = Math.hypot(p.cur.x - px, p.cur.z - pz);
        if (d > 22) continue;
        const hr = p.meta.role === 'hr';
        list.push({ slot: { key: `p:${p.uid}`, uid: p.uid, x: 0, z: 0, y: 2.35 }, text: `${hr ? '💼 ' : ''}${p.meta.name}`, accent: hr ? '#d99a1f' : '#6bb5ff', d });
      }
      list.sort((a, b) => a.d - b.d);
      const chosen = list.slice(0, 8);
      const near = sceneData.seats
        .map((s) => ({ s, d: Math.hypot(s.x - px, s.z - pz) }))
        .filter((x) => x.d < 9)
        .sort((a, b) => a.d - b.d)
        .slice(0, 4);
      for (const { s, d } of near) {
        chosen.push({ slot: { key: `c:${s.id}`, uid: null, x: s.x, z: s.z, y: 1.75 }, text: s.card.displayName, accent: '#ff9d57', d });
      }
      for (let i = 0; i < SLOTS; i++) {
        const c = chosen[i];
        const sp = sprites[i];
        if (!c) {
          slots.current[i] = null;
          sp.visible = false;
          continue;
        }
        slots.current[i] = c.slot;
        const tex = cache.get(`${c.text}|${c.accent}`, () => drawNameTag(c.text, c.accent));
        const mat = sp.material;
        if (mat.map !== tex) {
          mat.map = tex;
          mat.needsUpdate = true;
        }
        sp.visible = true;
      }
    }
    for (let i = 0; i < SLOTS; i++) {
      const sl = slots.current[i];
      if (!sl) continue;
      if (sl.uid) {
        const p = peers.get(sl.uid);
        if (!p) {
          sprites[i].visible = false;
          continue;
        }
        sprites[i].position.set(p.cur.x, sl.y, p.cur.z);
      } else {
        sprites[i].position.set(sl.x, sl.y, sl.z);
      }
    }
  });

  return (
    <>
      {sprites.map((s, i) => (
        <primitive key={i} object={s} />
      ))}
    </>
  );
}

