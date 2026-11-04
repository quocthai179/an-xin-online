import type { PeerMeta, Pose, PresenceApi, PresenceListener, ReactionEmoji, ZoneOrPlaza } from '../types';
import type { Bus, BusMessage } from './bus';
import { EV, HELLO_MS, PEER_EXPIRY_MS, POSE_HZ_MOVING, POSE_IDLE_MS, REACTION_COOLDOWN_MS, TOPIC_STREET, topicPos } from '../topics';
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

export interface DemoPresenceOptions {
  timers?: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Presence over the demo bus: hello heartbeat on `street`, poses on `pos:<zone>`, 15 s expiry. */
export class DemoPresence implements PresenceApi {
  private meta: PeerMeta | null = null;
  private current: ZoneOrPlaza = 'plaza';
  private neighbor: ZoneOrPlaza | null = null;
  private peers = new Map<string, Peer>();
  private listeners = new Set<PresenceListener>();
  private lastPose = 0;
  private lastReact = -Infinity;
  private reactSeen = new Map<string, number>();
  private poseN = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private unsub: (() => void) | null = null;
  private hidden = false;

  constructor(
    private bus: Bus,
    private uid: string,
    private now: () => number,
    private opts: DemoPresenceOptions = {},
  ) {}

  async join(meta: PeerMeta, zone: ZoneOrPlaza): Promise<void> {
    this.meta = meta;
    this.current = zone;
    this.unsub?.();
    this.unsub = this.bus.subscribe((m) => this.handle(m));
    this.hello();
    if (this.opts.timers !== false && !this.timer) {
      this.timer = setInterval(() => this.tick(), HELLO_MS);
      if (typeof window !== 'undefined') window.addEventListener('pagehide', this.onHide);
    }
    this.emitCount();
  }

  private onHide = () => {
    this.bus.post({ topic: TOPIC_STREET, event: EV.bye, payload: { uid: this.uid } });
  };

  setZones(current: ZoneOrPlaza, neighbor: ZoneOrPlaza | null): void {
    this.current = current;
    this.neighbor = neighbor;
  }

  publishPose(p: Pose): void {
    if (!this.meta || this.hidden) return;
    const t = this.now();
    const minGap = p.moving ? 1000 / POSE_HZ_MOVING : POSE_IDLE_MS;
    if (t - this.lastPose < minGap) return;
    this.lastPose = t;
    const c = clampToBounds(p.x, p.z);
    const payload: PosePayload = { u: this.uid, x: r2(c.x), z: r2(c.z), r: r2(p.ry), m: p.moving ? 1 : 0 };
    if (this.poseN++ % 10 === 0) {
      payload.n = this.meta.name;
      payload.ro = this.meta.role;
      payload.co = this.meta.company;
      payload.av = this.meta.avatar;
    }
    this.bus.post({ topic: topicPos(this.current), event: EV.pose, payload });
  }

  sendReaction(e: ReactionEmoji, x: number, z: number): boolean {
    const t = this.now();
    if (t - this.lastReact < REACTION_COOLDOWN_MS) return false;
    this.lastReact = t;
    this.bus.post({ topic: topicPos(this.current), event: EV.react, payload: { u: this.uid, e, x, z } });
    return true;
  }

  subscribe(l: PresenceListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
  }

  async leave(): Promise<void> {
    this.onHide();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this.onHide);
    this.unsub?.();
    this.unsub = null;
    this.peers.clear();
  }

  get count(): number {
    return this.peers.size + 1;
  }

  /** Visible for tests: heartbeat + expiry sweep. */
  tick(): void {
    this.hello();
    this.sweep(this.now());
  }

  sweep(now: number): void {
    let changed = false;
    for (const [uid, p] of this.peers) {
      if (now - p.lastSeen > PEER_EXPIRY_MS) {
        this.peers.delete(uid);
        for (const l of this.listeners) l.onLeave(uid);
        changed = true;
      }
    }
    if (changed) this.emitCount();
  }

  handle(m: BusMessage): void {
    const now = this.now();
    if (m.topic === TOPIC_STREET && m.event === EV.hello) {
      const p = m.payload as { uid: string; meta: PeerMeta };
      if (!p?.uid || p.uid === this.uid) return;
      const isNew = !this.peers.has(p.uid);
      this.peers.set(p.uid, { meta: p.meta, lastSeen: now });
      if (isNew) {
        this.hello(); // answer so the newcomer sees us immediately
        this.emitCount();
      }
      return;
    }
    if (m.topic === TOPIC_STREET && m.event === EV.bye) {
      const p = m.payload as { uid: string };
      if (this.peers.delete(p.uid)) {
        for (const l of this.listeners) l.onLeave(p.uid);
        this.emitCount();
      }
      return;
    }
    if (!m.topic.startsWith('pos:')) return;
    const zones = new Set([topicPos(this.current), this.neighbor ? topicPos(this.neighbor) : '']);
    if (!zones.has(m.topic)) return;
    if (m.event === EV.pose) {
      const p = m.payload as PosePayload;
      if (!p?.u || p.u === this.uid) return;
      const peer = this.peers.get(p.u) ?? { meta: null, lastSeen: now };
      if (p.n && p.ro && p.av) {
        peer.meta = { uid: p.u, name: p.n, role: p.ro, company: p.co ?? null, avatar: p.av, isBot: peer.meta?.isBot };
      }
      peer.lastSeen = now;
      const isNew = !this.peers.has(p.u);
      this.peers.set(p.u, peer);
      const c = clampToBounds(p.x, p.z);
      for (const l of this.listeners) l.onPose(p.u, { x: c.x, z: c.z, ry: p.r, moving: p.m === 1 }, peer.meta, now);
      if (isNew) this.emitCount();
    } else if (m.event === EV.react) {
      const p = m.payload as { u: string; e: ReactionEmoji; x: number; z: number };
      if (!p?.u || p.u === this.uid) return;
      const last = this.reactSeen.get(p.u) ?? -Infinity;
      if (now - last < 1000) return; // receivers drop > 1/s per uid
      this.reactSeen.set(p.u, now);
      for (const l of this.listeners) l.onReaction(p.u, p.e, p.x, p.z);
    }
  }

  private hello() {
    if (!this.meta) return;
    this.bus.post({ topic: TOPIC_STREET, event: EV.hello, payload: { uid: this.uid, meta: this.meta, zone: this.current } });
  }

  private emitCount() {
    for (const l of this.listeners) l.onCount(this.count);
  }
}
