/** Virtual joystick: pointer offset from the base centre to a stick axis (x right, y forward), with dead zone. */
export function joystickAxis(dx: number, dy: number, radius: number, deadZone = 0.12): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (radius <= 0 || len === 0) return { x: 0, y: 0 };
  const mag = Math.min(1, len / radius);
  if (mag < deadZone) return { x: 0, y: 0 };
  // rescale so the output starts at 0 just outside the dead zone
  const scaled = (mag - deadZone) / (1 - deadZone);
  return { x: (dx / len) * scaled, y: (-dy / len) * scaled };
}

/** Knob offset in px (clamped to the base radius) for rendering. */
export function knobOffset(dx: number, dy: number, radius: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len <= radius || len === 0) return { x: dx, y: dy };
  return { x: (dx / len) * radius, y: (dy / len) * radius };
}
