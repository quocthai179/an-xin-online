'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, type Mesh, MeshBasicMaterial, MeshLambertMaterial, type InstancedMesh, Object3D, SRGBColorSpace } from 'three';
import { useFontsReady } from '@/hooks/useFontsReady';
import { toRanked, useWorld } from '@/state/world';
import { input } from '@/state/input';
import { prefersReducedMotion } from '@/scene-lib/capability';
import { PLAZA, ZONE_LENGTH, zoneStartZ } from '@/lib/layout';
import { ZONE_IDS } from '@/lib/rules';
import { ZONES } from '@/lib/zones';
import { buildPlaza, buildZoneChunk, GATE_LABEL, incenseSmokeOrigin, type Bulb, type ZoneChunk } from '@/scene-lib/geometry/street';
import { drawBoard, drawEntranceLabel, drawGateLabel, type BoardRow } from '@/scene-lib/labelTexture';
import type { Daylight } from '@/scene-lib/daylight';

function texOf(canvas: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Canvas texture rebuilt whenever `key` changes; the old one is disposed. */
function useCanvasTexture(make: () => HTMLCanvasElement, key: string): CanvasTexture {
  const fonts = useFontsReady();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tex = useMemo(() => texOf(make()), [key, fonts]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** One merged, vertex-coloured mesh per zone; hidden when far from the walker (chunk culling on top of frustum culling). */
function ZoneChunks({ chunks, plaza }: { chunks: ZoneChunk[]; plaza: ZoneChunk }) {
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), []);
  const refs = useRef<(Mesh | null)[]>([]);
  const acc = useRef(0);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.3) return;
    acc.current = 0;
    const pz = input.player.z;
    chunks.forEach((_c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const top = zoneStartZ(i) + 4;
      const bottom = zoneStartZ(i) - ZONE_LENGTH - 4;
      const dist = pz > top ? pz - top : pz < bottom ? bottom - pz : 0;
      m.visible = dist < 100;
    });
  });

  return (
    <>
      {chunks.map((c, i) => (
        <mesh key={ZONE_IDS[i]} ref={(m) => { refs.current[i] = m; }} geometry={c.geometry} material={material} />
      ))}
      <mesh geometry={plaza.geometry} material={material} />
    </>
  );
}

function GateLabels() {
  const candidates = useWorld((s) => s.candidates);
  const counts = useMemo(() => {
    const m = new Array(ZONE_IDS.length).fill(0) as number[];
    for (const c of Object.values(candidates)) if (c.status === 'sitting') m[ZONE_IDS.indexOf(c.zone)]++;
    return m;
  }, [candidates]);
  return (
    <>
      {ZONE_IDS.map((id, i) => (
        <GateLabel key={id} zoneIdx={i} count={Math.min(30, counts[i])} />
      ))}
    </>
  );
}

function GateLabel({ zoneIdx, count }: { zoneIdx: number; count: number }) {
  const meta = ZONES[ZONE_IDS[zoneIdx]];
  const tex = useCanvasTexture(() => drawGateLabel(meta.name, meta.color, count), `${meta.id}|${count}`);
  return (
    <mesh position={[0, GATE_LABEL.y, zoneStartZ(zoneIdx) + 0.28]}>
      <planeGeometry args={[GATE_LABEL.w, GATE_LABEL.h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Entrance() {
  const tex = useCanvasTexture(drawEntranceLabel, 'entrance');
  return (
    <mesh position={[0, 9.6, 0.42]}>
      <planeGeometry args={[16.8, 2.1]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/** "Đầu phố" Top 10 billboard hanging above the entrance and the Wall of Fame next to the temple. */
function Boards() {
  const candidates = useWorld((s) => s.candidates);
  const plan = useWorld((s) => s.plan);
  const top = useMemo(() => {
    const now = plan.computedAt;
    return Object.values(candidates)
      .filter((c) => c.status === 'sitting' && plan.seats.has(c.id))
      .map((c) => ({ c, score: toRanked(c, now).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map<BoardRow>(({ c }, i) => ({ rank: i + 1, name: c.displayName, detail: `${ZONES[c.zone].short} · ${c.totals.xu} xu` }));
  }, [candidates, plan]);
  const fame = useMemo(
    () =>
      Object.values(candidates)
        .filter((c) => c.status === 'placed')
        .sort((a, b) => (b.placedAt ?? '').localeCompare(a.placedAt ?? ''))
        .slice(0, 10)
        .map<BoardRow>((c, i) => ({ rank: i + 1, name: c.displayName, detail: c.placedCompany ? `bởi ${c.placedCompany}` : 'đã được bao' })),
    [candidates],
  );
  const topTex = useCanvasTexture(() => drawBoard('ĐẦU PHỐ', 'Top 10 ghế nóng nhất hôm nay', top, 'Phố vắng, chưa ai lên hạng'), JSON.stringify(top));
  const fameTex = useCanvasTexture(
    () => drawBoard('TƯỜNG DANH VỌNG', 'Những người đã được bao trọn', fame, 'Chưa ai được bao. Người đầu tiên sẽ lên đây!', '#3b0d0d', '#ffe2c0'),
    JSON.stringify(fame),
  );
  return (
    <>
      <mesh position={[0, 6.2, 0.45]}>
        <planeGeometry args={[7.2, 4.5]} />
        <meshBasicMaterial map={topTex} toneMapped={false} side={DoubleSide} />
      </mesh>
      <group position={[PLAZA.wall.x, 1.9, PLAZA.wall.z]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[4.9, 2.8]} />
          <meshBasicMaterial map={fameTex} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

const dummy = new Object3D();

/** Street lamp bulbs (one instanced mesh) plus soft additive glows in the evening. */
function Bulbs({ bulbs, light }: { bulbs: Bulb[]; light: Daylight }) {
  const bulbRef = useRef<InstancedMesh>(null);
  const glowRef = useRef<InstancedMesh>(null);
  useEffect(() => {
    for (const mesh of [bulbRef.current, glowRef.current]) {
      if (!mesh) continue;
      bulbs.forEach((b, i) => {
        dummy.position.set(b.x, b.y, b.z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.count = bulbs.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [bulbs]);
  const bulbMat = useMemo(() => new MeshBasicMaterial({ color: light.bulb, toneMapped: false }), [light.bulb]);
  const glowMat = useMemo(() => new MeshBasicMaterial({ color: '#ffcf70', transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }), []);
  return (
    <>
      <instancedMesh ref={bulbRef} args={[undefined, undefined, 128]} material={bulbMat} frustumCulled={false}>
        <sphereGeometry args={[0.17, 8, 6]} />
      </instancedMesh>
      {light.evening && (
        <instancedMesh ref={glowRef} args={[undefined, undefined, 128]} material={glowMat} frustumCulled={false}>
          <icosahedronGeometry args={[0.85, 1]} />
        </instancedMesh>
      )}
    </>
  );
}

/** Incense smoke above the burner: recycled soft puffs, only simulated when the walker is near the plaza. */
function IncenseSmoke() {
  const ref = useRef<InstancedMesh>(null);
  const N = 18;
  const origin = incenseSmokeOrigin();
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const frozen = useRef(false);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m || input.player.z < -30) return;
    if (reduced && frozen.current) return; // reduced motion: draw the puffs once, then leave them still
    frozen.current = true;
    const t = reduced ? 0 : clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const phase = ((t * 0.32 + i / N) % 1 + 1) % 1;
      const s = Math.sin(phase * Math.PI) * (0.18 + phase * 0.5);
      dummy.position.set(origin.x + Math.sin(t * 0.9 + i * 1.7) * 0.18 * phase + phase * 0.6, origin.y + phase * 3.6, origin.z + Math.cos(t * 0.7 + i) * 0.15 * phase);
      dummy.scale.setScalar(Math.max(0.001, s));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    dummy.scale.setScalar(1);
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial color="#efe9df" transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}

export function StreetStatic({ light }: { light: Daylight }) {
  const chunks = useMemo(() => ZONE_IDS.map((_, i) => buildZoneChunk(i)), []);
  const plaza = useMemo(() => buildPlaza(), []);
  const bulbs = useMemo<Bulb[]>(() => [...chunks.flatMap((c) => c.bulbs), ...plaza.bulbs], [chunks, plaza]);
  useEffect(
    () => () => {
      chunks.forEach((c) => c.geometry.dispose());
      plaza.geometry.dispose();
    },
    [chunks, plaza],
  );
  return (
    <group>
      <ZoneChunks chunks={chunks} plaza={plaza} />
      <GateLabels />
      <Entrance />
      <Boards />
      <Bulbs bulbs={bulbs} light={light} />
      <IncenseSmoke />
    </group>
  );
}
