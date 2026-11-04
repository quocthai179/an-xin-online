'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useIsMobile } from '@/hooks/useIsMobile';
import { input } from '@/state/input';
import { peers } from '@/state/peers';
import { daylight } from '@/scene-lib/daylight';
import { Joystick } from '../ui/Joystick';
import { ReactionBar } from '../ui/ReactionBar';
import { ZoneNav } from '../ui/ZoneNav';
import { Candidates, NearbySigns } from './Candidates';
import { PointerController, TempleTrigger, useKeyboard } from './Controls';
import { GiftEffects, Reactions3D } from './Effects';
import { FollowCamera, Labels, Player, Walkers } from './People';
import { StreetStatic } from './StreetStatic';

function Lights({ light }: { light: ReturnType<typeof daylight> }) {
  return (
    <>
      <color attach="background" args={[light.sky]} />
      <fog attach="fog" args={[light.fog, 22, 78]} />
      <hemisphereLight args={[light.hemiSky, light.hemiGround, light.hemi]} />
      <directionalLight color={light.sun} intensity={light.sunIntensity} position={[-12, 24, 10]} />
    </>
  );
}

/** Draw calls / triangles / fps readout, enabled with `?debug=1`. */
function DebugStats() {
  const { gl } = useThree();
  const acc = useRef({ t: 0, frames: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.t += dt;
    a.frames++;
    if (a.t < 0.5) return;
    const el = document.getElementById('pxv-debug');
    if (el) {
      const i = gl.info;
      el.textContent = `${Math.round(a.frames / a.t)} fps · ${i.render.calls} calls · ${(i.render.triangles / 1000).toFixed(1)}k tris · ${i.memory.textures} tex · ${i.memory.geometries} geo · ${peers.size} peers · @${input.player.x.toFixed(1)},${input.player.z.toFixed(1)}`;
    }
    a.t = 0;
    a.frames = 0;
  });
  return null;
}

export default function Scene() {
  const mobile = useIsMobile();
  const [degraded, setDegraded] = useState(false);
  const [debug] = useState(() => new URLSearchParams(window.location.search).get('debug') === '1');
  const [light] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    return daylight(new Date().getHours() + new Date().getMinutes() / 60, q.get('t'));
  });
  const dpr = useMemo<[number, number] | number>(() => (degraded ? 1 : mobile ? [1, 1.25] : [1, 1.75]), [degraded, mobile]);
  const [hintGone, setHintGone] = useState(false);
  useKeyboard();
  useEffect(() => {
    const t = setTimeout(() => setHintGone(true), 9000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="scene-wrap" data-degraded={degraded ? 1 : 0}>
      <Canvas
        dpr={dpr}
        flat
        gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
        camera={{ fov: 55, near: 0.1, far: 90, position: [0, 4, 15] }}
        aria-label="Phố Xin Việc 3D"
      >
        <PerformanceMonitor onDecline={() => setDegraded(true)} onFallback={() => setDegraded(true)} />
        <Lights light={light} />
        <StreetStatic light={light} />
        <Candidates />
        <NearbySigns mobile={mobile} />
        <Walkers mobile={mobile} />
        <Player />
        <FollowCamera mobile={mobile} />
        <Labels />
        <GiftEffects />
        <Reactions3D />
        <PointerController />
        <TempleTrigger />
        {debug && <DebugStats />}
      </Canvas>
      {debug && <div id="pxv-debug" className="debug-stats" />}
      <ZoneNav />
      <ReactionBar />
      {mobile && <Joystick />}
      <p className={`scene-hint${hintGone ? ' gone' : ''}`}>{mobile ? 'Kéo cần trái để đi, chạm biển để xem hồ sơ' : 'WASD / phím mũi tên để đi, Shift để chạy, kéo chuột để xoay, bấm vào biển để xem hồ sơ'}</p>
    </div>
  );
}
