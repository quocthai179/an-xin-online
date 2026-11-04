import type { ZoneOrPlaza } from './types';

export const TOPIC_STREET = 'street';
export const topicPos = (z: ZoneOrPlaza) => `pos:${z}`;
export const topicInbox = (uid: string) => `inbox:${uid}`;

export const EV = {
  notification: 'notification',
  pose: 'pose',
  react: 'react',
  hello: 'hello',
  bye: 'bye',
} as const;

export const POSE_HZ_MOVING = 5;
export const POSE_IDLE_MS = 2000;
export const PEER_EXPIRY_MS = 15_000;
export const HELLO_MS = 3_000;
export const REACTION_COOLDOWN_MS = 3_000;
