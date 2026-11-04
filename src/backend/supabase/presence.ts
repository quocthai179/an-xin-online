import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { PeerMeta, Pose, PresenceApi, PresenceListener, ReactionEmoji, ZoneOrPlaza } from '../types';
import { EV, PEER_EXPIRY_MS, POSE_HZ_MOVING, POSE_IDLE_MS, REACTION_COOLDOWN_MS, topicPos } from '../topics';
import { clampToBounds } from '@/lib/layout';

interface Peer {
  meta: PeerMeta | null;
  lastSeen: number;
}

interface PosePayload {
  u: string;
  x: number;
  z: number;
  r: number;
  m: 0 | 1;
  n?: string;
  ro?: PeerMeta['role'];
  co?: string | null;
  av?: PeerMeta['avatar'];
}

export interface SupabasePresenceOptions {
  now?: () => number;
  /** false in tests: no expiry sweep interval */
  timers?: boolean;
  isVisible?: () => boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const SWEEP_MS = 3_000;

/**
 * Presence on Supabase Realtime (ADR-0002): online count = presence on the private `street` channel (owned by the backend),
 * poses and reactions = client broadcast on private `pos:<zone>` channels (current zone + nearest neighbour).
 */
export class SupabasePresence implements PresenceApi {
  private meta: PeerMeta | null = null;
  private current: ZoneOrPlaza = 'plaza';
  private neighbor: ZoneOrPlaza | null = null;
  private street: RealtimeChannel | null = null;
  private streetJoined = false;
  private tracked = false;
  private pos = new Map<string, RealtimeChannel>();
  private peers = new Map<string, Peer>();
  private listeners = new Set<PresenceListener>();
  private reactSeen = new Map<string, number>();
  private lastPose = 0;
  private lastReact = -Infinity;
  private poseN = 0;
  private count = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private now: () => number;
  private joined = false;

  constructor(
    private client: SupabaseClient,
    private getUid: () => string | null,
    private opts: SupabasePresenceOptions = {},
  ) {
    this.now = opts.now ?? Date.now;
  }

  // ----- wiring from SupabaseBackend (it owns the street channel) -----
  attachStreet(ch: RealtimeChannel): void {
    this.street = ch;
    this.streetJoined = false;
    this.tracked = false;
  }

  onStreetStatus(joined: boolean): void {
    this.streetJoined = joined;
    if (!joined) this.tracked = false;
    else void this.track();
  }

  onStreetSync(): void {
    if (!this.street) return;
    const n = Object.keys(this.street.presenceState()).length;
    this.count = Math.max(1, n);
    for (const l of this.listeners) l.onCount(this.count);
  }

  private async track(): Promise<void> {
    if (!this.street || !this.streetJoined || !this.meta || this.tracked) return;
    this.tracked = true;
    try {
      await this.street.track({ uid: this.meta.uid, name: this.meta.name, role: this.meta.role, zone: this.current });
    } catch {
      this.tracked = false;
    }
  }

  // ----- PresenceApi -----
  async join(meta: PeerMeta, zone: ZoneOrPlaza): Promise<void> {
    this.meta = meta;
    this.joined = true;
    this.current = zone;
    this.syncChannels();
    await this.track();
    if (this.opts.timers !== false && !this.timer) this.timer = setInterval(() => this.sweep(this.now()), SWEEP_MS);
    for (const l of this.listeners) l.onCount(this.count);
  }

  setZones(current: ZoneOrPlaza, neighbor: ZoneOrPlaza | null): void {
    const changed = current !== this.current;
    this.current = current;
    this.neighbor = neighbor;
    if (changed) {
      this.poseN = 0; // late joiners of the new zone get our name/avatar with the next pose
      if (this.tracked && this.street && this.meta) {
        void this.street.track({ uid: this.meta.uid, name: this.meta.name, role: this.meta.role, zone: current }).catch(() => undefined);
      }
    }
    if (this.joined) this.syncChannels();
  }

  publishPose(p: Pose): void {
    const uid = this.getUid();
    if (!this.meta || !uid || (this.opts.isVisible && !this.opts.isVisible())) return;
    const ch = this.pos.get(topicPos(this.current));
    if (!ch || ch.state !== 'joined') return;
    const t = this.now();
    if (t - this.lastPose < this.poseGap(p.moving)) return;
    this.lastPose = t;
    const c = clampToBounds(p.x, p.z);
    const payload: PosePayload = { u: uid, x: r2(c.x), z: r2(c.z), r: r2(p.ry), m: p.moving ? 1 : 0 };
    if (this.poseN++ % 10 === 0) {
      payload.n = this.meta.name;
      payload.ro = this.meta.role;
      payload.co = this.meta.company;
      payload.av = this.meta.avatar;
    }
    void ch.send({ type: 'broadcast', event: EV.pose, payload }).catch(() => undefined);
  }

  sendReaction(e: ReactionEmoji, x: number, z: number): boolean {
    const uid = this.getUid();
    const t = this.now();
    if (!uid || t - this.lastReact < REACTION_COOLDOWN_MS) return false;
    const ch = this.pos.get(topicPos(this.current));
    if (!ch || ch.state !== 'joined') return false;
    this.lastReact = t;
    void ch.send({ type: 'broadcast', event: EV.react, payload: { u: uid, e, x, z } }).catch(() => undefined);
    return true;
  }

  subscribe(l: PresenceListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  async leave(): Promise<void> {
    this.joined = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const ch of this.pos.values()) void this.client.removeChannel(ch);
    this.pos.clear();
    this.peers.clear();
    if (this.street && this.tracked) {
      this.tracked = false;
      try {
        await this.street.untrack();
      } catch {
        /* the channel may already be closed */
      }
    }
  }

  /** Adaptive rate (ADR-0002): fewer poses when the zone is crowded. */
  private poseGap(moving: boolean): number {
    if (!moving) return POSE_IDLE_MS;
    const hz = this.peers.size > 40 ? 2 : this.peers.size > 20 ? 3 : POSE_HZ_MOVING;
    return 1000 / hz;
  }

  private syncChannels(): void {
    const want = new Set<string>([topicPos(this.current)]);
    if (this.neighbor) want.add(topicPos(this.neighbor));
    for (const [topic, ch] of this.pos) {
      if (!want.has(topic)) {
        void this.client.removeChannel(ch);
        this.pos.delete(topic);
      }
    }
    for (const topic of want) {
      if (this.pos.has(topic)) continue;
      const ch = this.client.channel(topic, { config: { private: true, broadcast: { self: false } } });
      ch.on('broadcast', { event: EV.pose }, (m) => this.onPose(m.payload as PosePayload));
      ch.on('broadcast', { event: EV.react }, (m) => this.onReact(m.payload as { u: string; e: ReactionEmoji; x: number; z: number }));
      ch.subscribe();
      this.pos.set(topic, ch);
    }
  }

  sweep(now: number): void {
    for (const [uid, p] of this.peers) {
      if (now - p.lastSeen > PEER_EXPIRY_MS) {
        this.peers.delete(uid);
        for (const l of this.listeners) l.onLeave(uid);
      }
    }
  }

  /** Receiver side: validate, clamp, remember meta, notify. Exposed for tests. */
  onPose(p: PosePayload): void {
    if (!p || typeof p.u !== 'string' || p.u === this.getUid()) return;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return;
    const now = this.now();
    const peer = this.peers.get(p.u) ?? { meta: null, lastSeen: now };
    if (p.n && p.ro && p.av) {
      peer.meta = { uid: p.u, name: String(p.n).slice(0, 24), role: p.ro, company: p.co ?? null, avatar: p.av };
    }
    peer.lastSeen = now;
    this.peers.set(p.u, peer);
    const c = clampToBounds(p.x, p.z);
    for (const l of this.listeners) l.onPose(p.u, { x: c.x, z: c.z, ry: Number(p.r) || 0, moving: p.m === 1 }, peer.meta, now);
  }

  onReact(p: { u: string; e: ReactionEmoji; x: number; z: number }): void {
    if (!p || typeof p.u !== 'string' || p.u === this.getUid()) return;
    const now = this.now();
    if (now - (this.reactSeen.get(p.u) ?? -Infinity) < 1000) return; // receivers drop > 1/s per uid
    this.reactSeen.set(p.u, now);
    for (const l of this.listeners) l.onReaction(p.u, p.e, p.x, p.z);
  }

  dispose(): void {
    void this.leave();
    this.listeners.clear();
    this.street = null;
  }
}
