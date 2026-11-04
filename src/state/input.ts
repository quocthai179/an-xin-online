import { SPAWN } from '@/lib/layout';

/**
 * Non-reactive mutable state shared between DOM controls and the render loop.
 * Everything here is read inside useFrame, so it must never trigger React renders.
 */
export const input = {
  /** keyboard axis (x right, y forward) */
  key: { x: 0, y: 0 },
  /** virtual joystick axis */
  joy: { x: 0, y: 0 },
  run: false,
  /** tap-to-move target on the ground */
  target: null as { x: number; z: number } | null,
  /** pending teleport, consumed by the Player */
  teleport: null as { x: number; z: number; ry: number } | null,
  /** camera yaw (0 = behind the walker looking toward -Z), written by the camera rig */
  yaw: 0,
  /** true while the user drags to orbit (the camera does not auto-recentre then) */
  dragging: false,
  /** local walker pose, written by the Player and read by effects/labels */
  player: { x: SPAWN.x, z: SPAWN.z, ry: SPAWN.ry, moving: false },
  /** heading the player should turn to face (candidate click) */
  faceTo: null as { x: number; z: number } | null,
};

export function requestTeleport(x: number, z: number, ry = 0): void {
  input.teleport = { x, z, ry };
  input.target = null;
  input.yaw = 0;
}

export function resetInput(): void {
  input.key.x = input.key.y = 0;
  input.joy.x = input.joy.y = 0;
  input.run = false;
  input.target = null;
}
