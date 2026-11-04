import type { PeerMeta, Pose, PresenceApi, PresenceListener, ReactionEmoji, ZoneOrPlaza } from '../types';
import type { Bus, BusMessage } from './bus';
import { EV, HELLO_MS, PEER_EXPIRY_MS, POSE_HZ_MOVING, POSE_IDLE_MS, REACTION_COOLDOWN_MS, TOPIC_STREET, topicPos } from '../topics';
import { clampToBounds } from '@/lib/layout';
import { MAX_PEERS, MIN_POSE_GAP_MS, MIN_REACT_GAP_MS, UidGate, parsePose, parseReaction } from '@/lib/peerInput';

interface Peer {
  meta: PeerMeta | null;
  lastSeen: number;
  /** the peer's tab is hidden: its timers are throttled (down to 1/min), so it gets a longer expiry */
  hidden?: boolean;
}

/** expiry for a peer that announced its tab is hidden (browsers throttle background timers to ~1/min) */
const HIDDEN_EXPIRY_MS = 150_000;
const isTabHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

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
  private poseGate = new UidGate(MIN_POSE_GAP_MS);
  private reactGate = new UidGate(MIN_REACT_GAP_MS);
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
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
    }
    this.emitCount();
  }

  private onHide = () => {
    this.bus.post({ topic: TOPIC_STREET, event: EV.bye, payload: { uid: this.uid } });
  };

  /** announce hidden/visible right away so peers adapt the expiry before our throttled heartbeat slows down */
  private onVisibility = () => this.hello();

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
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
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
      if (now - p.lastSeen > (p.hidden ? HIDDEN_EXPIRY_MS : PEER_EXPIRY_MS)) {
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
      const p = m.payload as { uid: string; meta: PeerMeta; hidden?: boolean };
      if (!p || typeof p.uid !== 'string' || !p.uid || p.uid === this.uid) return;
      const isNew = !this.peers.has(p.uid);
      if (isNew && this.peers.size >= MAX_PEERS) return;
      this.peers.set(p.uid, { meta: p.meta, lastSeen: now, hidden: p.hidden === true });
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
      const parsed = parsePose(m.payload, this.uid);
      if (!parsed) return;
      const known = this.peers.get(parsed.u);
      if (!known && this.peers.size >= MAX_PEERS) return;
      if (!this.poseGate.accept(parsed.u, now)) return;
      const peer = known ?? { meta: null, lastSeen: now };
      if (parsed.meta) peer.meta = { ...parsed.meta, isBot: peer.meta?.isBot };
      peer.lastSeen = now;
      peer.hidden = false; // it is publishing poses, so it is visible
      this.peers.set(parsed.u, peer);
      for (const l of this.listeners) l.onPose(parsed.u, parsed.pose, peer.meta, now);
      if (!known) this.emitCount();
    } else if (m.event === EV.react) {
      const r = parseReaction(m.payload, this.uid);
      if (!r || !this.reactGate.accept(r.u, now)) return; // receivers drop > 1/s per uid
      for (const l of this.listeners) l.onReaction(r.u, r.e, r.x, r.z);
    }
  }

  private hello() {
    if (!this.meta) return;
    this.bus.post({ topic: TOPIC_STREET, event: EV.hello, payload: { uid: this.uid, meta: this.meta, zone: this.current, hidden: isTabHidden() } });
  }

  private emitCount() {
    for (const l of this.listeners) l.onCount(this.count);
  }
}
