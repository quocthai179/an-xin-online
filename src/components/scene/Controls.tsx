'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Vector2, type Mesh } from 'three';
import { PLAZA, BOUNDS } from '@/lib/layout';
import { pickTarget, rayGround, type PickTarget } from '@/lib/picking';
import { input, resetInput } from '@/state/input';
import { useUi } from '@/state/ui';
import { sceneData } from '@/scene-lib/sceneData';
import { prefersReducedMotion } from '@/scene-lib/capability';

const TAP_PX = 8;
const TAP_MS = 350;
const TEMPLE_TARGET: PickTarget = { id: 'temple', x: PLAZA.temple.x, z: PLAZA.temple.z, r: 3.4, h: 6 };

function isTyping(el: EventTarget | null): boolean {
  const e = el as HTMLElement | null;
  if (!e || !e.tagName) return false;
  return e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable;
}

/** WASD / arrows + Shift. Ignored while typing or while a panel is open. */
export function useKeyboard(): void {
  useEffect(() => {
    const down = new Set<string>();
    const sync = () => {
      const blocked = useUi.getState().panel.kind !== 'none';
      const k = (names: string[]) => names.some((n) => down.has(n));
      input.key.x = blocked ? 0 : (k(['d', 'arrowright']) ? 1 : 0) - (k(['a', 'arrowleft']) ? 1 : 0);
      input.key.y = blocked ? 0 : (k(['w', 'arrowup']) ? 1 : 0) - (k(['s', 'arrowdown']) ? 1 : 0);
      input.run = k(['shift']);
    };
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
        if (key.startsWith('arrow')) e.preventDefault();
        down.add(key);
        sync();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      down.delete(e.key.toLowerCase());
      sync();
    };
    const reset = () => {
      down.clear();
      resetInput();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', reset);
    const unsub = useUi.subscribe(sync);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', reset);
      unsub();
      reset();
    };
  }, []);
}

/** Tap/click: candidate (or temple) first, otherwise a ground move target. Drag orbits the camera. */
export function PointerController() {
  const { gl, camera } = useThree();
  const marker = useRef<Mesh>(null);

  useEffect(() => {
    const el = gl.domElement;
    const ray = new Raycaster();
    const ndc = new Vector2();
    let down: { x: number; y: number; t: number; id: number } | null = null;
    let dragging = false;
    let lastX = 0;

    const onDown = (e: PointerEvent) => {
      if (down) return; // ignore the second finger
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      dragging = false;
      lastX = e.clientX;
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_PX) dragging = true;
      input.dragging = dragging;
      if (dragging) {
        input.yaw -= (e.clientX - lastX) * 0.006;
        input.yaw = Math.max(-2.4, Math.min(2.4, input.yaw));
      }
      lastX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const wasTap = !dragging && performance.now() - down.t < TAP_MS;
      down = null;
      dragging = false;
      input.dragging = false;
      if (!wasTap) return;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const o = ray.ray.origin;
      const d = ray.ray.direction;
      const targets: PickTarget[] = sceneData.seats.map((s) => ({ id: s.id, x: s.x, z: s.z }));
      targets.push(TEMPLE_TARGET);
      const hit = pickTarget(o, d, targets);
      if (hit) {
        if (hit.id === TEMPLE_TARGET.id) {
          useUi.getState().setPanel({ kind: 'temple' });
        } else {
          const s = sceneData.byId.get(hit.id);
          if (s) input.faceTo = { x: s.x, z: s.z };
          useUi.getState().setPanel({ kind: 'candidate', id: hit.id });
        }
        return;
      }
      const g = rayGround(o, d);
      if (g) {
        input.faceTo = null;
        input.target = {
          x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, g.x)),
          z: Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, g.z)),
        };
      }
    };
    const cancel = () => {
      down = null;
      dragging = false;
      input.dragging = false;
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [gl, camera]);

  const reduced = useMemo(() => prefersReducedMotion(), []);
  useFrame(({ clock }) => {
    const m = marker.current;
    if (!m) return;
    const t = input.target;
    m.visible = !!t;
    if (t) {
      m.position.set(t.x, 0.12, t.z);
      m.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 6) * 0.12);
    }
  });

  return (
    <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.3, 0.42, 20]} />
      <meshBasicMaterial color="#ffd36b" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

const ENTER = 4.6;
const LEAVE = 7;

/** Walking up to the temple opens the temple panel once; step away to re-arm. */
export function TempleTrigger() {
  const armed = useRef(true);
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.2) return;
    acc.current = 0;
    const d = Math.hypot(input.player.x - PLAZA.temple.x, input.player.z - PLAZA.temple.z);
    if (d > LEAVE) armed.current = true;
    else if (d < ENTER && armed.current) {
      armed.current = false;
      if (useUi.getState().panel.kind === 'none') useUi.getState().setPanel({ kind: 'temple' });
    }
  });
  return null;
}
