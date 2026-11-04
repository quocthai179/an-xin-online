'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, type Group, type InstancedMesh, type Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, PlaneGeometry } from 'three';
import type { AvatarSpec } from '@/backend/types';
import { fnv1a32 } from '@/lib/hash';
import { SIDEWALK_TOP } from '@/lib/layout';
import { ZONE_IDS } from '@/lib/rules';
import { input } from '@/state/input';
import { useWorld } from '@/state/world';
import { boardGeometry, bowlGeometry, headGeometry, hatGeometry, seatedLegs, seatedTorso, SIGN, type HatKind } from '@/scene-lib/geometry/avatar';
import { BOWL_COLOR, PANTS, pick, SHIRT, SKIN } from '@/scene-lib/palette';
import { loadSceneFonts } from '@/scene-lib/capability';
import { buildSeatList, sceneData, type SeatInfo } from '@/scene-lib/sceneData';
import { drawSign } from '@/scene-lib/signTexture';
import { TextureCache } from '@/scene-lib/textureCache';

const CAP = 30;
const HATS: HatKind[] = ['non_la', 'cap', 'beanie'];
const dummy = new Object3D();
const tmp = new Color();

interface Shared {
  torso: ReturnType<typeof seatedTorso>;
  legs: ReturnType<typeof seatedLegs>;
  head: ReturnType<typeof headGeometry>;
  board: ReturnType<typeof boardGeometry>;
  bowl: ReturnType<typeof bowlGeometry>;
  hats: Record<HatKind, ReturnType<typeof hatGeometry>>;
  tinted: MeshLambertMaterial;
  bowlMat: MeshLambertMaterial;
}

function fill(mesh: InstancedMesh | null, items: SeatInfo[], color?: (a: AvatarSpec) => string): void {
  if (!mesh) return;
  items.forEach((s, i) => {
    dummy.position.set(s.x, SIDEWALK_TOP, s.z);
    dummy.rotation.set(0, s.rotY, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (color) mesh.setColorAt(i, tmp.set(color(s.card.avatar)));
  });
  mesh.count = items.length;
  mesh.visible = items.length > 0;
  mesh.instanceMatrix.needsUpdate = true;
  if (color && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (items.length) mesh.computeBoundingSphere();
}

/** All seated candidates of one zone: one instanced mesh per body part so far zones are culled by their bounding spheres. */
function ZoneCrowd({ items, shared }: { items: SeatInfo[]; shared: Shared }) {
  const torso = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const head = useRef<InstancedMesh>(null);
  const board = useRef<InstancedMesh>(null);
  const bowl = useRef<InstancedMesh>(null);
  const hats = useRef<Record<HatKind, InstancedMesh | null>>({ non_la: null, cap: null, beanie: null });
  const group = useRef<Group>(null);
  const acc = useRef(0);

  useLayoutEffect(() => {
    fill(torso.current, items, (a) => pick(SHIRT, a.shirt));
    fill(legs.current, items, (a) => pick(PANTS, a.pants));
    fill(head.current, items, (a) => pick(SKIN, a.skin));
    fill(board.current, items);
    fill(bowl.current, items, (a) => BOWL_COLOR[a.bowl] ?? BOWL_COLOR.bowl);
    for (const h of HATS) fill(hats.current[h], items.filter((s) => s.card.avatar.hat === h));
  }, [items]);

  // hide the whole chunk when it is far from the walker
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.3 || !group.current || items.length === 0) return;
    acc.current = 0;
    const z = items[0].z;
    group.current.visible = Math.abs(input.player.z - z) < 110;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={torso} args={[shared.torso, shared.tinted, CAP]} />
      <instancedMesh ref={legs} args={[shared.legs, shared.tinted, CAP]} />
      <instancedMesh ref={head} args={[shared.head, shared.tinted, CAP]} />
      <instancedMesh ref={board} args={[shared.board, shared.tinted, CAP]} />
      <instancedMesh ref={bowl} args={[shared.bowl, shared.bowlMat, CAP]} />
      {HATS.map((h) => (
        <instancedMesh key={h} ref={(m) => { hats.current[h] = m; }} args={[shared.hats[h], shared.tinted, CAP]} />
      ))}
    </group>
  );
}

function useSeatList(): SeatInfo[] {
  const plan = useWorld((s) => s.plan);
  const candidates = useWorld((s) => s.candidates);
  const seats = useMemo(() => buildSeatList(plan, candidates), [plan, candidates]);
  useEffect(() => {
    sceneData.set(seats);
  }, [seats]);
  return seats;
}

export function Candidates() {
  const seats = useSeatList();
  const shared = useMemo<Shared>(
    () => ({
      torso: seatedTorso(),
      legs: seatedLegs(),
      head: headGeometry(),
      board: boardGeometry(),
      bowl: bowlGeometry(),
      hats: { non_la: hatGeometry('non_la'), cap: hatGeometry('cap'), beanie: hatGeometry('beanie') },
      tinted: new MeshLambertMaterial({ vertexColors: true }),
      bowlMat: new MeshLambertMaterial(),
    }),
    [],
  );
  useEffect(
    () => () => {
      shared.torso.dispose();
      shared.legs.dispose();
      shared.head.dispose();
      shared.board.dispose();
      shared.bowl.dispose();
      Object.values(shared.hats).forEach((g) => g.dispose());
      shared.tinted.dispose();
      shared.bowlMat.dispose();
    },
    [shared],
  );
  const byZone = useMemo(() => {
    const m: SeatInfo[][] = ZONE_IDS.map(() => []);
    for (const s of seats) m[s.zoneIdx].push(s);
    return m;
  }, [seats]);
  return (
    <>
      {byZone.map((items, i) => (
        <ZoneCrowd key={ZONE_IDS[i]} items={items} shared={shared} />
      ))}
    </>
  );
}

const SIGN_RANGE = 16;

/** Textured sign planes for the nearest few candidates (re-chosen every 250 ms); the rest keep the blank cardboard. */
export function NearbySigns({ mobile }: { mobile: boolean }) {
  const K = mobile ? 6 : 12;
  const res = mobile ? { width: 256, height: 128 } : { width: 512, height: 256 };
  const cache = useMemo(() => new TextureCache(32), []);
  const geo = useMemo(() => new PlaneGeometry(SIGN.w - 0.1, SIGN.h - 0.08), []);
  const mats = useMemo(() => Array.from({ length: K }, () => new MeshBasicMaterial({ transparent: true, toneMapped: false })), [K]);
  const meshes = useRef<(Mesh | null)[]>([]);
  const acc = useRef(1);
  const epoch = useRef(0);

  useEffect(() => {
    let alive = true;
    void loadSceneFonts().then(() => {
      if (alive) epoch.current++;
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(
    () => () => {
      cache.clear();
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
    [cache, geo, mats],
  );

  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.25) return;
    acc.current = 0;
    const px = input.player.x;
    const pz = input.player.z;
    const near: { s: SeatInfo; d: number }[] = [];
    for (const s of sceneData.seats) {
      if (s.card.signState === 'removed') continue;
      const d = Math.hypot(s.x - px, s.z - pz);
      if (d < SIGN_RANGE) near.push({ s, d });
    }
    near.sort((a, b) => a.d - b.d);
    for (let i = 0; i < K; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const hit = near[i];
      if (!hit) {
        mesh.visible = false;
        continue;
      }
      const { s } = hit;
      const text = s.card.signState === 'pending_review' ? 'Biển đang chờ duyệt' : (s.card.signText ?? '');
      const key = `${s.id}|${fnv1a32(text)}|${res.width}|${epoch.current}`;
      const tex = cache.get(key, () => {
        const c = document.createElement('canvas');
        drawSign(c, text, res);
        return c;
      });
      const mat = mats[i];
      if (mat.map !== tex) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
      const sin = Math.sin(s.rotY);
      const cos = Math.cos(s.rotY);
      const lz = SIGN.z + 0.045;
      mesh.position.set(s.x + sin * lz, SIDEWALK_TOP + SIGN.y, s.z + cos * lz);
      mesh.rotation.set(-0.12, s.rotY, 0, 'YXZ');
      mesh.visible = true;
    }
  });

  return (
    <>
      {mats.map((m, i) => (
        <mesh key={i} ref={(el) => { meshes.current[i] = el; }} geometry={geo} material={m} visible={false} />
      ))}
    </>
  );
}
