import { beforeEach, describe, expect, it } from 'vitest';
import { clearPeers, MAX_PENDING_REACTIONS, onPeerLeave, onPeerPose, onPeerReaction, peers, reactionQueue } from '@/state/peers';

describe('peers store', () => {
  beforeEach(() => clearPeers());
  it('tracks poses with an interpolation buffer and forgets leavers', () => {
    onPeerPose('u1', { x: 1, z: 2, ry: 0, moving: true }, null, 1000);
    onPeerPose('u1', { x: 2, z: 2, ry: 0, moving: true }, { uid: 'u1', name: 'A', role: 'hr', company: null, avatar: { skin: 0, shirt: 0, pants: 0, hat: 'none', bowl: 'bowl' } }, 1200);
    expect(peers.get('u1')?.buf.size).toBe(2);
    expect(peers.get('u1')?.meta?.name).toBe('A');
    onPeerLeave('u1');
    expect(peers.size).toBe(0);
  });
  it('caps queued reactions', () => {
    for (let i = 0; i < MAX_PENDING_REACTIONS + 10; i++) onPeerReaction('u', 'heart', 0, i);
    expect(reactionQueue.length).toBe(MAX_PENDING_REACTIONS);
  });
});
