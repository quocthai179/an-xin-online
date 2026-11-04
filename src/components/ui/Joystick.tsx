'use client';

import { useRef, useState } from 'react';
import { joystickAxis, knobOffset } from '@/lib/joystick';
import { input } from '@/state/input';

const RADIUS = 52;

/** Virtual joystick (bottom-left) for touch devices. Writes `input.joy`, never triggers scene renders. */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (e: React.PointerEvent) => {
    const r = base.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const a = joystickAxis(dx, dy, RADIUS);
    input.joy.x = a.x;
    input.joy.y = a.y;
    setKnob(knobOffset(dx, dy, RADIUS));
  };
  const end = () => {
    active.current = null;
    input.joy.x = input.joy.y = 0;
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div
      ref={base}
      className="joystick"
      role="application"
      aria-label="Cần điều khiển, kéo để đi"
      onPointerDown={(e) => {
        if (active.current !== null) return;
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        input.target = null;
        update(e);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e);
      }}
      onPointerUp={(e) => {
        if (active.current === e.pointerId) end();
      }}
      onPointerCancel={end}
    >
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
