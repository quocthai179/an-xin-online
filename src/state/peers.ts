import type { PeerMeta, Pose, ReactionEmoji } from '@/backend/types';
import { SnapshotBuffer } from '@/lib/snapshot';

export interface RemotePeer {
  uid: string;
  meta: PeerMeta | null;
  buf: SnapshotBuffer;
  lastSeen: number;
  /** interpolated pose, refreshed every frame by the walkers renderer */
  cur: { x: number; z: number; ry: number; moving: boolean };
}

export interface ReactionFx {
  uid: string;
  emoji: ReactionEmoji;
  x: number;
  z: number;
}

/** Remote walkers by uid. Mutable on purpose: poses arrive at 5 Hz per peer and are read in useFrame. */
export const peers = new Map<string, RemotePeer>();
/** Reactions waiting to be turned into floating emoji by the 3D scene. */
export const reactionQueue: ReactionFx[] = [];

export const MAX_PENDING_REACTIONS = 40;

export function onPeerPose(uid: string, pose: Pose, meta: PeerMeta | null, receivedAt: number): void {
  let p = peers.get(uid);
  if (!p) {
    p = { uid, meta, buf: new SnapshotBuffer(), lastSeen: receivedAt, cur: { x: pose.x, z: pose.z, ry: pose.ry, moving: false } };
    peers.set(uid, p);
  }
  if (meta) p.meta = meta;
  p.lastSeen = receivedAt;
  p.buf.push(receivedAt, pose);
}

export function onPeerLeave(uid: string): void {
  peers.delete(uid);
}

export function onPeerReaction(uid: string, emoji: ReactionEmoji, x: number, z: number): void {
  if (reactionQueue.length >= MAX_PENDING_REACTIONS) reactionQueue.shift();
  reactionQueue.push({ uid, emoji, x, z });
}

export function clearPeers(): void {
  peers.clear();
  reactionQueue.length = 0;
}
