import type {
  AppNotification, AvatarSpec, Backend, CandidateCard, CandidateDetail, CandidateInput, Contact, FortuneDraw, GiftKind,
  Invitation, Me, Offer, PresenceApi, ReportReason, Result, Role, StreetEvent, ZoneOrPlaza,
} from '../types';
import { vnDay } from '@/lib/time';
import { DB_LOCK, loadRaw, saveDb, type DemoDb, type KeyValueStore, type Locks } from './db';
import type { Bus, BusMessage } from './bus';
import * as engine from './engine';
import { DemoPresence } from './presence';
import { seedDb } from './seed';
import { EV, topicInbox, topicPos, TOPIC_STREET } from '../topics';

export interface DemoDeps {
  store: KeyValueStore;
  bus: Bus;
  locks: Locks;
  now: () => number;
  /** demo user id of this tab */
  identity: string;
  newId?: () => string;
  presenceTimers?: boolean;
}

const STREET_EVENTS = new Set(['gift', 'invite', 'offer', 'placed', 'incense', 'candidate_upsert', 'candidate_remove']);

let idCounter = 0;
function defaultNewId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Backend running entirely in the browser: localStorage "database", Web Locks for atomic writes, BroadcastChannel for events. */
export class DemoBackend implements Backend {
  readonly mode = 'demo' as const;
  readonly presence: PresenceApi;
  readonly uid: string;
  private streetListeners = new Set<(e: StreetEvent) => void>();
  private notifListeners = new Set<(n: AppNotification) => void>();
  private unsub: () => void;
  private pres: DemoPresence;
  private newId: () => string;

  constructor(private deps: DemoDeps) {
    this.uid = deps.identity;
    this.newId = deps.newId ?? defaultNewId;
    this.pres = new DemoPresence(deps.bus, deps.identity, deps.now, { timers: deps.presenceTimers });
    this.presence = this.pres;
    this.unsub = deps.bus.subscribe((m) => this.dispatch(m));
  }

  // ----- infrastructure -----
  private load(): DemoDb {
    const existing = loadRaw(this.deps.store);
    if (existing) return existing;
    const db = seedDb(this.deps.now());
    saveDb(this.deps.store, db);
    return db;
  }

  private ctx(uid: string | null = this.uid): engine.Ctx {
    return { now: this.deps.now(), uid, newId: this.newId };
  }

  private dispatch(m: BusMessage): void {
    if (m.topic === TOPIC_STREET && STREET_EVENTS.has(m.event)) {
      for (const l of this.streetListeners) l(m.payload as StreetEvent);
    } else if (m.topic === topicInbox(this.uid) && m.event === 'notification') {
      for (const l of this.notifListeners) l(m.payload as AppNotification);
    }
  }

  private emit(e: engine.Emit): void {
    const msg: BusMessage = { topic: e.topic, event: e.event, payload: e.payload };
    this.deps.bus.post(msg);
    this.dispatch(msg); // BroadcastChannel does not echo to the sender
  }

  private tx<T>(fn: (db: DemoDb, ctx: engine.Ctx) => engine.Out<T>, asUid: string | null = this.uid): Promise<Result<T>> {
    return this.deps.locks.request(DB_LOCK, () => {
      const db = this.load();
      const out = fn(db, this.ctx(asUid));
      saveDb(this.deps.store, db);
      for (const e of out.emits) this.emit(e);
      return out.res;
    });
  }

  private read<T>(fn: (db: DemoDb, now: number) => T): T {
    return fn(this.load(), this.deps.now());
  }

  /** Used by demo bots: perform a gift as a bot HR. */
  botGift(botId: string, candidateId: string, kind: GiftKind) {
    return this.tx((db, ctx) => engine.dropGift(db, ctx, candidateId, kind), botId);
  }

  /** Used by walking demo bots: broadcast a pose for a bot walker (also delivered locally, the bus does not echo). */
  botPose(zone: ZoneOrPlaza, payload: Record<string, unknown>): void {
    const msg: BusMessage = { topic: topicPos(zone), event: EV.pose, payload };
    this.deps.bus.post(msg);
    this.pres.handle(msg);
  }

  // ----- identity -----
  async restore(): Promise<Me | null> {
    return this.getMe();
  }

  async register(input: { displayName: string; role: Role; company?: string; avatar: AvatarSpec }): Promise<Result<Me>> {
    const r = await this.tx((db, ctx) => engine.upsertProfile(db, ctx, input));
    if (!r.ok) return r;
    const me = await this.getMe();
    return me ? { ok: true, data: me } : { ok: false, error: 'NO_PROFILE' };
  }

  async getMe(): Promise<Me | null> {
    return this.read((db, now) => engine.getMe(db, this.uid, now));
  }

  // ----- candidates -----
  async listCandidates(): Promise<CandidateCard[]> {
    return this.read((db, now) => engine.listCandidates(db, now));
  }
  async getCandidate(idOrSlug: string): Promise<CandidateDetail | null> {
    return this.read((db, now) => engine.getCandidate(db, this.uid, idOrSlug, now));
  }
  saveMyCandidate(input: CandidateInput) {
    return this.tx((db, ctx) => engine.upsertMyCandidate(db, ctx, input));
  }
  setMyCandidateStatus(s: 'sitting' | 'hidden') {
    return this.tx((db, ctx) => engine.setMyCandidateStatus(db, ctx, s));
  }
  deleteMyCandidate() {
    return this.tx((db, ctx) => engine.deleteMyCandidate(db, ctx));
  }
  async getCandidateContact(candidateId: string): Promise<Result<Contact>> {
    return this.read((db) => engine.getCandidateContact(db, this.uid, candidateId));
  }

  // ----- actions -----
  dropGift(candidateId: string, kind: GiftKind) {
    return this.tx((db, ctx) => engine.dropGift(db, ctx, candidateId, kind));
  }
  sendInvitation(candidateId: string, message: string, hrContact: string): Promise<Result<Invitation>> {
    return this.tx((db, ctx) => engine.sendInvitation(db, ctx, candidateId, message, hrContact));
  }
  respondInvitation(id: string, accept: boolean, reason?: string): Promise<Result<Invitation>> {
    return this.tx((db, ctx) => engine.respondInvitation(db, ctx, id, accept, reason));
  }
  sendOffer(
    candidateId: string,
    o: { position: string; package: string; message?: string; showCompany: boolean },
  ): Promise<Result<Offer>> {
    return this.tx((db, ctx) => engine.sendOffer(db, ctx, candidateId, o));
  }
  respondOffer(id: string, accept: boolean, opts?: { showCompany?: boolean; reason?: string }): Promise<Result<Offer>> {
    return this.tx((db, ctx) => engine.respondOffer(db, ctx, id, accept, opts));
  }
  async listMyInvitations(): Promise<Invitation[]> {
    return this.read((db) => engine.listMyInvitations(db, this.uid));
  }
  async listMyOffers(): Promise<Offer[]> {
    return this.read((db) => engine.listMyOffers(db, this.uid));
  }
  lightIncense(targetCandidateId?: string) {
    return this.tx((db, ctx) => engine.lightIncense(db, ctx, targetCandidateId));
  }
  async getFortune(): Promise<Result<FortuneDraw>> {
    return this.read((db, now) => engine.getFortuneDraw(db, this.uid, now));
  }
  async getTempleStats() {
    return this.read((db, now) => engine.templeStats(db, now));
  }
  report(candidateId: string, reason: ReportReason, note?: string) {
    return this.tx((db, ctx) => engine.reportCandidate(db, ctx, candidateId, reason, note));
  }
  async listNotifications(limit = 50): Promise<AppNotification[]> {
    return this.read((db) => engine.listNotifications(db, this.uid, limit));
  }
  async markNotificationsRead(ids?: string[]): Promise<void> {
    await this.tx((db, ctx) => {
      engine.markNotificationsRead(db, ctx, ids);
      return { res: { ok: true, data: undefined }, emits: [] };
    });
  }

  // ----- realtime -----
  onStreetEvent(cb: (e: StreetEvent) => void): () => void {
    this.streetListeners.add(cb);
    return () => this.streetListeners.delete(cb);
  }
  onNotification(cb: (n: AppNotification) => void): () => void {
    this.notifListeners.add(cb);
    return () => this.notifListeners.delete(cb);
  }

  today(): string {
    return vnDay(this.deps.now());
  }

  dispose(): void {
    this.unsub();
    void this.pres.leave();
    this.deps.bus.close();
    this.streetListeners.clear();
    this.notifListeners.clear();
  }
}
