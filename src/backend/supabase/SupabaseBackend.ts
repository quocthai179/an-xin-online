import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type {
  AppNotification, AvatarSpec, Backend, BackendStatus, CandidateCard, CandidateDetail, CandidateInput, Contact, FortuneDraw,
  GiftKind, Invitation, Me, Offer, ReportReason, Result, Role, StreetEvent,
} from '../types';
import { EV, TOPIC_STREET, topicInbox } from '../topics';
import {
  candidateInputToRpc, isNetworkFailure, mapCard, mapContact, mapDetail, mapInvitation, mapMe, mapNotification, mapOffer,
  mapStreetEvent, toResult, type RpcResponse,
} from './mappers';
import { SupabasePresence } from './presence';

const STREET_EVENTS = ['gift', 'invite', 'offer', 'placed', 'incense', 'candidate_upsert', 'candidate_remove'] as const;
const RESTORE_TIMEOUT_MS = 8_000;
const RETRY_MS = 10_000;

export interface SupabaseBackendOptions {
  /** retry the anonymous sign-in while offline (disable in tests) */
  autoRetry?: boolean;
  restoreTimeoutMs?: number;
  presenceTimers?: boolean;
  isVisible?: () => boolean;
  now?: () => number;
}

/** Backend on Supabase: anonymous auth, every action is an RPC from 0001_init.sql, events arrive on private broadcast channels. */
export class SupabaseBackend implements Backend {
  readonly mode = 'supabase' as const;
  readonly presence: SupabasePresence;
  private uid: string | null = null;
  private sessionP: Promise<string | null> | null = null;
  private street: RealtimeChannel | null = null;
  private inbox: RealtimeChannel | null = null;
  private streetListeners = new Set<(e: StreetEvent) => void>();
  private notifListeners = new Set<(n: AppNotification) => void>();
  private statusListeners = new Set<(s: BackendStatus) => void>();
  private status: BackendStatus = 'online';
  private wasDown = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private authSub: { unsubscribe: () => void } | null = null;

  constructor(
    private client: SupabaseClient,
    private opts: SupabaseBackendOptions = {},
  ) {
    this.presence = new SupabasePresence(client, () => this.uid, {
      now: opts.now,
      timers: opts.presenceTimers,
      isVisible: opts.isVisible ?? (() => typeof document === 'undefined' || document.visibilityState !== 'hidden'),
    });
  }

  // ----- connection -----
  getStatus(): BackendStatus {
    return this.status;
  }

  onStatus(cb: (s: BackendStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(s: BackendStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }

  /** Anonymous session (persisted by supabase-js) + realtime auth + channels. Resolves null while offline. */
  private ensureSession(): Promise<string | null> {
    if (this.sessionP) return this.sessionP;
    const p = (async () => {
      try {
        const { data } = await this.client.auth.getSession();
        let user = data.session?.user ?? null;
        if (!user) {
          const r = await this.client.auth.signInAnonymously();
          if (r.error || !r.data.user) throw r.error ?? new Error('anonymous sign-in failed');
          user = r.data.user;
        }
        this.uid = user.id;
        await this.client.realtime.setAuth(); // private channels need the user's JWT
        this.connect(user.id);
        this.setStatus('online');
        return user.id;
      } catch {
        this.sessionP = null;
        this.setStatus('offline');
        this.scheduleRetry();
        return null;
      }
    })();
    this.sessionP = p;
    return p;
  }

  private scheduleRetry(): void {
    if (this.opts.autoRetry === false || this.disposed || this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.disposed) void this.ensureSession();
    }, RETRY_MS);
  }

  private connect(uid: string): void {
    if (this.street) return;
    const street = this.client.channel(TOPIC_STREET, { config: { private: true, broadcast: { self: false }, presence: { key: uid } } });
    for (const ev of STREET_EVENTS) {
      street.on('broadcast', { event: ev }, (m) => {
        const e = mapStreetEvent(ev, m.payload);
        if (e) for (const l of this.streetListeners) l(e);
      });
    }
    street.on('presence', { event: 'sync' }, () => this.presence.onStreetSync());
    this.presence.attachStreet(street);
    street.subscribe((s) => this.onChannelStatus(s, true));
    this.street = street;

    const inbox = this.client.channel(topicInbox(uid), { config: { private: true } });
    inbox.on('broadcast', { event: EV.notification }, (m) => {
      const p = m.payload as Record<string, unknown> | null;
      if (!p || typeof p !== 'object') return;
      const n = mapNotification(p);
      for (const l of this.notifListeners) l(n);
    });
    inbox.subscribe((s) => this.onChannelStatus(s, false));
    this.inbox = inbox;

    // token refresh: keep the realtime socket authorised
    const { data } = this.client.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') void this.client.realtime.setAuth();
    });
    this.authSub = data.subscription;
  }

  private onChannelStatus(s: string, isStreet: boolean): void {
    if (s === 'SUBSCRIBED') {
      if (isStreet) this.presence.onStreetStatus(true);
      // missed events are not replayed (ADR-0002): listeners refetch when we come back
      if (this.wasDown) {
        this.wasDown = false;
        this.setStatus('online');
      }
    } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
      if (isStreet) this.presence.onStreetStatus(false);
      this.wasDown = true;
      this.setStatus('offline');
    }
  }

  // ----- rpc plumbing -----
  private async call(fn: string, args?: Record<string, unknown>, opts: { auth?: boolean } = {}): Promise<RpcResponse> {
    const needAuth = opts.auth !== false;
    const uid = await this.ensureSession();
    if (!uid && needAuth) return { data: null, error: { message: 'offline' }, status: 0 };
    try {
      const res = (await this.client.rpc(fn, args)) as RpcResponse;
      if (isNetworkFailure(res)) {
        this.wasDown = true;
        this.setStatus('offline');
      } else if (this.status === 'offline') {
        this.wasDown = false;
        this.setStatus('online');
      }
      return res;
    } catch {
      this.setStatus('offline');
      return { data: null, error: { message: 'network' }, status: 0 };
    }
  }

  private async rpcResult<T>(fn: string, args: Record<string, unknown> | undefined, map: (d: never) => T): Promise<Result<T>> {
    return toResult(await this.call(fn, args), map as (d: unknown) => T);
  }

  // ----- identity -----
  async restore(): Promise<Me | null> {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), this.opts.restoreTimeoutMs ?? RESTORE_TIMEOUT_MS));
    const uid = await Promise.race([this.ensureSession(), timeout]);
    if (!uid) {
      this.setStatus('offline');
      this.scheduleRetry();
      return null;
    }
    return this.getMe();
  }

  async register(input: { displayName: string; role: Role; company?: string; avatar: AvatarSpec }): Promise<Result<Me>> {
    const r = await this.rpcResult(
      'upsert_profile',
      { p_display_name: input.displayName, p_role: input.role, p_company: input.company ?? null, p_avatar: input.avatar },
      () => undefined,
    );
    if (!r.ok) return r;
    const me = await this.getMe();
    return me ? { ok: true, data: me } : { ok: false, error: 'NETWORK' };
  }

  async getMe(): Promise<Me | null> {
    const res = await this.call('get_me');
    return res.error ? null : mapMe(res.data);
  }

  // ----- candidates -----
  async listCandidates(): Promise<CandidateCard[]> {
    const res = await this.call('list_candidates', undefined, { auth: false });
    if (res.error || !Array.isArray(res.data)) return [];
    return res.data.map(mapCard);
  }

  async getCandidate(idOrSlug: string): Promise<CandidateDetail | null> {
    const res = await this.call('get_candidate', { p_key: idOrSlug }, { auth: false });
    if (res.error || !res.data || typeof res.data !== 'object') return null;
    return mapDetail(res.data);
  }

  saveMyCandidate(input: CandidateInput): Promise<Result<{ id: string; slug: string }>> {
    return this.rpcResult('upsert_my_candidate', { p: candidateInputToRpc(input) }, (d: { id: string; slug: string }) => ({ id: d.id, slug: d.slug }));
  }

  setMyCandidateStatus(s: 'sitting' | 'hidden'): Promise<Result<{ status: string }>> {
    return this.rpcResult('set_my_candidate_status', { p_status: s }, (d: { status: string }) => ({ status: d.status }));
  }

  deleteMyCandidate(): Promise<Result<void>> {
    return this.rpcResult('delete_my_candidate', undefined, () => undefined);
  }

  getCandidateContact(candidateId: string): Promise<Result<Contact>> {
    return this.rpcResult('get_candidate_contact', { p_candidate_id: candidateId }, mapContact);
  }

  // ----- actions -----
  dropGift(candidateId: string, kind: GiftKind) {
    return this.rpcResult(
      'drop_gift',
      { p_candidate_id: candidateId, p_kind: kind },
      (d: { giftId: string; remainingToday: number; remainingForCandidate: number }) => ({
        giftId: String(d.giftId),
        remainingToday: d.remainingToday,
        remainingForCandidate: d.remainingForCandidate,
      }),
    );
  }

  sendInvitation(candidateId: string, message: string, hrContact: string): Promise<Result<Invitation>> {
    return this.rpcResult('send_invitation', { p_candidate_id: candidateId, p_message: message, p_hr_contact: hrContact }, (d) => mapInvitation(d));
  }

  respondInvitation(id: string, accept: boolean, reason?: string): Promise<Result<Invitation>> {
    return this.rpcResult('respond_invitation', { p_invitation_id: id, p_accept: accept, p_reason: reason ?? null }, (d) => mapInvitation(d));
  }

  sendOffer(
    candidateId: string,
    o: { position: string; package: string; message?: string; showCompany: boolean },
  ): Promise<Result<Offer>> {
    return this.rpcResult(
      'send_offer',
      { p_candidate_id: candidateId, p_position: o.position, p_package: o.package, p_message: o.message ?? null, p_show_company: o.showCompany },
      (d) => mapOffer(d),
    );
  }

  respondOffer(id: string, accept: boolean, opts?: { showCompany?: boolean; reason?: string }): Promise<Result<Offer>> {
    return this.rpcResult(
      'respond_offer',
      { p_offer_id: id, p_accept: accept, p_show_company: opts?.showCompany ?? false, p_reason: opts?.reason ?? null },
      (d) => mapOffer(d),
    );
  }

  async listMyInvitations(): Promise<Invitation[]> {
    const rows = await this.select('invitations');
    const now = Date.now();
    return rows.map((r) => mapInvitation(r, now));
  }

  async listMyOffers(): Promise<Offer[]> {
    const rows = await this.select('offers');
    const now = Date.now();
    return rows.map((r) => mapOffer(r, now));
  }

  /** RLS-filtered table read (invitations / offers / notifications): the caller only sees rows they are a party to. */
  private async select(table: 'invitations' | 'offers' | 'notifications', limit = 100): Promise<Record<string, unknown>[]> {
    if (!(await this.ensureSession())) return [];
    try {
      const { data, error } = await this.client.from(table).select('*').order('created_at', { ascending: false }).limit(limit);
      return error || !data ? [] : (data as Record<string, unknown>[]);
    } catch {
      return [];
    }
  }

  lightIncense(targetCandidateId?: string): Promise<Result<{ incenseToday: number }>> {
    return this.rpcResult('light_incense', { p_target_candidate_id: targetCandidateId ?? null }, (d: { incense_today: number }) => ({
      incenseToday: Number(d.incense_today),
    }));
  }

  getFortune(): Promise<Result<FortuneDraw>> {
    return this.rpcResult('get_fortune', undefined, (d: { day: string; roll: number; pick: number }) => ({ day: d.day, roll: d.roll, pick: d.pick }));
  }

  async getTempleStats(): Promise<{ incenseToday: number }> {
    const res = await this.call('get_temple_stats', undefined, { auth: false });
    const d = res.data as { incense_today?: number } | null;
    return { incenseToday: res.error || !d ? 0 : Number(d.incense_today ?? 0) };
  }

  report(candidateId: string, reason: ReportReason, note?: string): Promise<Result<void>> {
    return this.rpcResult('report_candidate', { p_candidate_id: candidateId, p_reason: reason, p_note: note ?? null }, () => undefined);
  }

  async listNotifications(limit = 50): Promise<AppNotification[]> {
    return (await this.select('notifications', limit)).map(mapNotification);
  }

  async markNotificationsRead(ids?: string[]): Promise<void> {
    await this.call('mark_notifications_read', { p_ids: ids ? ids.map(Number).filter(Number.isFinite) : null });
  }

  // ----- realtime -----
  onStreetEvent(cb: (e: StreetEvent) => void): () => void {
    this.streetListeners.add(cb);
    void this.ensureSession(); // make sure the channels exist even before the first RPC
    return () => this.streetListeners.delete(cb);
  }

  onNotification(cb: (n: AppNotification) => void): () => void {
    this.notifListeners.add(cb);
    void this.ensureSession();
    return () => this.notifListeners.delete(cb);
  }

  dispose(): void {
    this.disposed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.authSub?.unsubscribe();
    this.presence.dispose();
    if (this.street) void this.client.removeChannel(this.street);
    if (this.inbox) void this.client.removeChannel(this.inbox);
    this.street = null;
    this.inbox = null;
    this.streetListeners.clear();
    this.notifListeners.clear();
    this.statusListeners.clear();
  }
}
