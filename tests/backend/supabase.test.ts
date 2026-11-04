import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseBackend } from '@/backend/supabase/SupabaseBackend';
import {
  candidateInputToRpc, mapCard, mapDetail, mapInvitation, mapMe, mapNotification, mapStreetEvent, toResult,
} from '@/backend/supabase/mappers';
import type { CandidateInput } from '@/backend/types';

type Handler = (m: { payload: unknown }) => void;

class FakeChannel {
  state = 'joined';
  handlers: { type: string; event: string; cb: Handler }[] = [];
  statusCb: ((s: string) => void) | null = null;
  sent: { type: string; event: string; payload: unknown }[] = [];
  tracked: unknown[] = [];
  presence: Record<string, unknown> = {};
  untracked = 0;
  constructor(public topic: string, public config: Record<string, unknown>) {}
  on(type: string, filter: { event: string }, cb: Handler) {
    this.handlers.push({ type, event: filter.event, cb });
    return this;
  }
  subscribe(cb?: (s: string) => void) {
    this.statusCb = cb ?? null;
    cb?.('SUBSCRIBED');
    return this;
  }
  send(m: { type: string; event: string; payload: unknown }) {
    this.sent.push(m);
    return Promise.resolve('ok');
  }
  track(p: unknown) {
    this.tracked.push(p);
    return Promise.resolve('ok');
  }
  untrack() {
    this.untracked++;
    return Promise.resolve('ok');
  }
  presenceState() {
    return this.presence;
  }
  emit(type: string, event: string, payload: unknown) {
    for (const h of this.handlers) if (h.type === type && h.event === event) h.cb({ payload });
  }
}

interface FakeOpts {
  session?: boolean;
  signInError?: boolean;
  rpc?: (fn: string, args: unknown) => { data: unknown; error: unknown; status?: number };
}

function makeClient(o: FakeOpts = {}) {
  const channels: FakeChannel[] = [];
  const rpcCalls: { fn: string; args: unknown }[] = [];
  const removed: string[] = [];
  const signIn = vi.fn(async () =>
    o.signInError ? { data: { user: null }, error: new Error('down') } : { data: { user: { id: 'u1' } }, error: null },
  );
  const setAuth = vi.fn(async () => undefined);
  const tableRows: Record<string, unknown[]> = {};
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: o.session ? { user: { id: 'u0' } } : null } })),
      signInAnonymously: signIn,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    realtime: { setAuth },
    channel: vi.fn((topic: string, opts: { config: Record<string, unknown> }) => {
      const ch = new FakeChannel(topic, opts.config);
      channels.push(ch);
      return ch;
    }),
    removeChannel: vi.fn(async (ch: FakeChannel) => {
      removed.push(ch.topic);
    }),
    rpc: vi.fn(async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return o.rpc ? o.rpc(fn, args) : { data: { ok: true, data: {} }, error: null, status: 200 };
    }),
    from: vi.fn((table: string) => {
      const q = {
        select: () => q,
        order: () => q,
        limit: () => Promise.resolve({ data: tableRows[table] ?? [], error: null }),
      };
      return q;
    }),
  };
  return { client: client as unknown as SupabaseClient, raw: client, channels, rpcCalls, removed, setAuth, signIn, tableRows };
}

const backendOf = (o: FakeOpts = {}) => {
  const h = makeClient(o);
  const b = new SupabaseBackend(h.client, { autoRetry: false, presenceTimers: false, isVisible: () => true, restoreTimeoutMs: 200 });
  return { ...h, b };
};

const ok = (data: unknown) => ({ data: { ok: true, data }, error: null, status: 200 });

describe('mappers', () => {
  it('toResult maps envelope, known/unknown codes and transport errors', () => {
    expect(toResult({ data: { ok: true, data: { a: 1 } }, error: null }, (d) => d.a)).toEqual({ ok: true, data: 1 });
    expect(toResult({ data: { ok: false, error: 'LIMIT_DAILY' }, error: null }, () => 1)).toEqual({ ok: false, error: 'LIMIT_DAILY' });
    expect(toResult({ data: { ok: false, error: 'RATE_LIMITED', retryAfterSec: 1 }, error: null }, () => 1)).toEqual({
      ok: false, error: 'RATE_LIMITED', retryAfterSec: 1,
    });
    expect(toResult({ data: { ok: false, error: 'VALIDATION', field: 'sign_text' }, error: null }, () => 1)).toEqual({
      ok: false, error: 'VALIDATION', field: 'sign_text',
    });
    expect(toResult({ data: { ok: false, error: 'SOMETHING_NEW' }, error: null }, () => 1)).toEqual({ ok: false, error: 'NETWORK' });
    expect(toResult({ data: null, error: { message: 'x', code: 'PGRST301' } }, () => 1)).toEqual({ ok: false, error: 'NETWORK' });
    expect(toResult({ data: null, error: { code: '42501' } }, () => 1)).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
    expect(toResult({ data: null, error: null }, () => 1)).toEqual({ ok: false, error: 'NETWORK' });
    expect(toResult({ data: { ok: true, data: null }, error: null }, (d) => d.x.y)).toEqual({ ok: false, error: 'NETWORK' });
  });

  const row = {
    id: 'c1', slug: 'abc', display_name: 'Dev A', zone: 'backend', sign_text: 'Biển', sign_state: 'ok', title: 'BE', years_exp: 3,
    skills: ['Go'], status: 'sitting', is_sample: false, avatar: { skin: 1, shirt: 2, pants: 3, hat: 'cap', bowl: 'box' },
    sitting_since: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', placed_at: null, placed_company: null,
    xu_total: 4, love_total: 5, invite_total: 6, incense_total: 7, completeness: 3,
    hr_decayed: 1.5, love_decayed: 2, invite_decayed: 0.5, accepted_decayed: 0.25, xu_week: 2, xu_today: 1,
  };

  it('maps list rows to cards (and hides the sign when not ok)', () => {
    const c = mapCard(row);
    expect(c).toMatchObject({
      id: 'c1', displayName: 'Dev A', signText: 'Biển', yearsExp: 3, isSample: false,
      totals: { xu: 4, love: 5, invites: 6, incense: 7 }, decayed: { hr: 1.5, love: 2, invites: 0.5, accepted: 0.25 }, xuWeek: 2, xuToday: 1,
    });
    expect(mapCard({ ...row, sign_state: 'pending_review', sign_text: null }).signText).toBeNull();
  });

  it('maps get_candidate with the caller info and get_me with quota', () => {
    const d = mapDetail({
      ...row, salary_min: 10, salary_max: null, salary_negotiable: true, show_salary_on_card: false, hide_from_ticker: true,
      city: 'HN', work_modes: ['remote'], bio: null, open_offer: true, open_invites: 2,
      me: { is_mine: false, xu_today: 1, love_today: 0, last_invite_at: null, open_invite: false, accepted_invite_id: 'i1', can_see_contact: true, reported: false },
    });
    expect(d).toMatchObject({ salaryMin: 10, salaryMax: null, hideFromTicker: true, openOffer: true, openInvites: 2 });
    expect(d.me).toMatchObject({ isMine: false, xuToday: 1, acceptedInviteId: 'i1', canSeeContact: true });
    const me = mapMe({
      profile: { id: 'u1', display_name: 'Lan', role: 'hr', company: 'ACME', avatar: {}, created_at: 't' },
      candidate: null,
      quota: { day: '2026-11-04', xu_used: 3, love_used: 1, invite_used: 2, offers_open: 1, incense_done: true },
      unread: 4,
    });
    expect(me).toMatchObject({
      profile: { id: 'u1', displayName: 'Lan', role: 'hr', company: 'ACME' },
      quota: { xuUsed: 3, loveUsed: 1, inviteUsed: 2, offersOpen: 1, incenseDone: true },
      unread: 4,
    });
    expect(mapMe(null)).toBeNull();
  });

  it('shows pending-but-expired invitations as expired', () => {
    const inv = { id: 'i', hr_id: 'h', candidate_id: 'c', hr_name: 'n', hr_company: 'co', message: 'm', hr_contact: 'x', status: 'pending',
      created_at: '2026-01-01T00:00:00Z', expires_at: '2026-01-02T00:00:00Z', responded_at: null, response_reason: null };
    expect(mapInvitation(inv, Date.parse('2026-01-03T00:00:00Z')).status).toBe('expired');
    expect(mapInvitation(inv, Date.parse('2026-01-01T12:00:00Z')).status).toBe('pending');
  });

  it('maps notifications from realtime payloads and from table rows', () => {
    expect(mapNotification({ id: '5', type: 'gift', payload: { kind: 'xu' }, createdAt: 't' })).toEqual({
      id: '5', type: 'gift', payload: { kind: 'xu' }, createdAt: 't', readAt: null,
    });
    expect(mapNotification({ id: 6, type: 'sign_hidden', payload: {}, created_at: 't2', read_at: 't3' })).toMatchObject({
      id: '6', createdAt: 't2', readAt: 't3',
    });
  });

  it('maps every street event and ignores malformed ones', () => {
    const giver = { id: 'h', name: 'Lan', role: 'hr', company: 'ACME' };
    const cand = { id: 'c1', name: 'Dev A', zone: 'qa' };
    expect(mapStreetEvent('gift', { id: '9', kind: 'xu', giver, candidate: cand, at: 't' })).toEqual({
      type: 'gift', id: '9', kind: 'xu', giver, candidate: cand, at: 't',
    });
    expect(mapStreetEvent('invite', { id: 'i', giver, candidate: cand, at: 't' })?.type).toBe('invite');
    expect(mapStreetEvent('offer', { id: 'o', giver, candidate: cand, at: 't' })?.type).toBe('offer');
    const placed = mapStreetEvent('placed', { candidate: row, company: 'ACME', at: 't' });
    expect(placed).toMatchObject({ type: 'placed', company: 'ACME', candidate: { id: 'c1', xuWeek: 0 } });
    expect(mapStreetEvent('incense', { name: 'Ai đó', at: 't' })).toEqual({ type: 'incense', name: 'Ai đó', at: 't' });
    expect(mapStreetEvent('candidate_upsert', { candidate: row, at: 't' })).toMatchObject({ type: 'candidate_upsert', candidate: { slug: 'abc' } });
    expect(mapStreetEvent('candidate_remove', { id: 'c1', at: 't' })).toEqual({ type: 'candidate_remove', id: 'c1', at: 't' });
    expect(mapStreetEvent('nope', {})).toBeNull();
    expect(mapStreetEvent('placed', { company: null })).toBeNull();
    expect(mapStreetEvent('gift', null)).toBeNull();
  });

  it('builds the upsert_my_candidate argument with snake_case keys', () => {
    const input: CandidateInput = {
      signText: 's', title: 't', yearsExp: 2, skills: ['a'], salaryNegotiable: true, workModes: ['remote'], zone: 'qa',
      hideFromTicker: false, showSalaryOnCard: true, contact: { kind: 'email', value: 'a@b.co' },
    };
    expect(candidateInputToRpc(input)).toEqual({
      sign_text: 's', title: 't', years_exp: 2, skills: ['a'], salary_min: null, salary_max: null, salary_negotiable: true,
      city: null, work_modes: ['remote'], bio: null, hide_from_ticker: false, show_salary_on_card: true, zone: 'qa',
      contact_kind: 'email', contact_value: 'a@b.co',
    });
  });
});

describe('SupabaseBackend session and channels', () => {
  it('signs in anonymously, authorises realtime and opens private street + inbox channels', async () => {
    const { b, channels, setAuth, signIn } = backendOf({ rpc: () => ({ data: null, error: null }) });
    expect(await b.restore()).toBeNull(); // no profile yet
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(setAuth).toHaveBeenCalled();
    const street = channels.find((c) => c.topic === 'street')!;
    const inbox = channels.find((c) => c.topic === 'inbox:u1')!;
    expect(street.config).toMatchObject({ private: true, presence: { key: 'u1' } });
    expect(inbox.config).toMatchObject({ private: true });
    expect(b.getStatus()).toBe('online');
  });

  it('reuses a persisted session instead of signing in again', async () => {
    const { b, signIn, channels } = backendOf({ session: true, rpc: () => ({ data: null, error: null }) });
    await b.restore();
    expect(signIn).not.toHaveBeenCalled();
    expect(channels.some((c) => c.topic === 'inbox:u0')).toBe(true);
  });

  it('dispatches street broadcasts and inbox notifications to listeners', async () => {
    const { b, channels } = backendOf({ rpc: () => ({ data: null, error: null }) });
    const street: unknown[] = [];
    const notifs: unknown[] = [];
    const offS = b.onStreetEvent((e) => street.push(e));
    b.onNotification((n) => notifs.push(n));
    await b.restore();
    channels.find((c) => c.topic === 'street')!.emit('broadcast', 'incense', { name: 'Ai đó', at: 't' });
    channels.find((c) => c.topic === 'street')!.emit('broadcast', 'candidate_remove', { id: 'c9', at: 't' });
    channels.find((c) => c.topic === 'inbox:u1')!.emit('broadcast', 'notification', { id: '3', type: 'gift', payload: {}, createdAt: 't' });
    expect(street).toEqual([
      { type: 'incense', name: 'Ai đó', at: 't' },
      { type: 'candidate_remove', id: 'c9', at: 't' },
    ]);
    expect(notifs).toEqual([{ id: '3', type: 'gift', payload: {}, createdAt: 't', readAt: null }]);
    offS();
    channels.find((c) => c.topic === 'street')!.emit('broadcast', 'incense', { name: 'x', at: 't' });
    expect(street).toHaveLength(2);
  });

  it('reports offline and returns NETWORK (no throw) when sign-in fails', async () => {
    const { b, rpcCalls } = backendOf({ signInError: true });
    const states: string[] = [];
    b.onStatus((s) => states.push(s));
    expect(await b.restore()).toBeNull();
    expect(b.getStatus()).toBe('offline');
    expect(states).toEqual(['offline']);
    expect(await b.dropGift('c1', 'xu')).toEqual({ ok: false, error: 'NETWORK' });
    expect(await b.listCandidates()).toEqual([]);
    expect(await b.listMyInvitations()).toEqual([]);
    expect(rpcCalls.filter((c) => c.fn === 'drop_gift')).toHaveLength(0);
  });

  it('flags offline on a transport failure and recovers on the next answer', async () => {
    let fail = false;
    const { b } = backendOf({ rpc: () => (fail ? { data: null, error: { message: 'Failed to fetch' }, status: 0 } : ok({})) });
    const states: string[] = [];
    await b.restore();
    b.onStatus((s) => states.push(s));
    fail = true;
    expect((await b.report('c', 'spam')).ok).toBe(false);
    expect(states).toEqual(['offline']);
    fail = false;
    expect((await b.report('c', 'spam')).ok).toBe(true);
    expect(states).toEqual(['offline', 'online']);
  });

  it('resubscribing after a channel error flips back online', async () => {
    const { b, channels } = backendOf({ rpc: () => ({ data: null, error: null }) });
    await b.restore();
    const states: string[] = [];
    b.onStatus((s) => states.push(s));
    const street = channels.find((c) => c.topic === 'street')!;
    street.statusCb!('CHANNEL_ERROR');
    street.statusCb!('SUBSCRIBED');
    expect(states).toEqual(['offline', 'online']);
  });
});

describe('SupabaseBackend method -> RPC mapping', () => {
  it('uses the exact function and parameter names of 0001_init.sql', async () => {
    const { b, rpcCalls } = backendOf({
      rpc: (fn) => {
        if (fn === 'light_incense') return ok({ incense_today: 7 });
        if (fn === 'get_temple_stats') return { data: { incense_today: 7 }, error: null }; // bare jsonb, no envelope
        if (fn === 'send_invitation' || fn === 'respond_invitation') {
          return ok({ id: 'i', hr_id: 'h', candidate_id: 'c', status: 'accepted', expires_at: 't' });
        }
        if (fn === 'get_candidate_contact') return ok({ kind: 'email', value: 'a@b.co' });
        if (fn === 'drop_gift') return ok({ giftId: '5', remainingToday: 9, remainingForCandidate: 1 });
        if (fn === 'get_fortune') return ok({ day: 'd', roll: 3, pick: 4 });
        if (fn === 'get_me') return { data: null, error: null };
        return ok({ id: 'x', slug: 's', status: 'sitting' });
      },
    });
    const avatar = { skin: 1, shirt: 1, pants: 1, hat: 'none' as const, bowl: 'bowl' as const };
    await b.register({ displayName: 'Lan', role: 'hr', company: 'ACME', avatar });
    await b.register({ displayName: 'Viewer', role: 'viewer', avatar });
    await b.getMe();
    await b.getCandidate('slug-1');
    await b.setMyCandidateStatus('hidden');
    await b.deleteMyCandidate();
    await b.getCandidateContact('c1');
    expect(await b.dropGift('c1', 'xu')).toEqual({ ok: true, data: { giftId: '5', remainingToday: 9, remainingForCandidate: 1 } });
    await b.sendInvitation('c1', 'Mời bạn phỏng vấn', 'lan@acme.vn');
    await b.respondInvitation('i1', false, 'bận');
    await b.respondInvitation('i1', true);
    await b.sendOffer('c1', { position: 'BE', package: '30tr', showCompany: true });
    await b.respondOffer('o1', true, { showCompany: true, reason: 'ok' });
    await b.respondOffer('o1', false);
    expect(await b.lightIncense()).toEqual({ ok: true, data: { incenseToday: 7 } });
    await b.lightIncense('c1');
    expect(await b.getFortune()).toEqual({ ok: true, data: { day: 'd', roll: 3, pick: 4 } });
    expect(await b.getTempleStats()).toEqual({ incenseToday: 7 });
    await b.report('c1', 'spam', 'note');
    await b.report('c1', 'other');
    await b.markNotificationsRead(['1', '2']);
    await b.markNotificationsRead();
    const calls = rpcCalls.map((c) => [c.fn, c.args]);
    expect(calls).toEqual([
      ['upsert_profile', { p_display_name: 'Lan', p_role: 'hr', p_company: 'ACME', p_avatar: avatar }],
      ['get_me', undefined],
      ['upsert_profile', { p_display_name: 'Viewer', p_role: 'viewer', p_company: null, p_avatar: avatar }],
      ['get_me', undefined],
      ['get_me', undefined],
      ['get_candidate', { p_key: 'slug-1' }],
      ['set_my_candidate_status', { p_status: 'hidden' }],
      ['delete_my_candidate', undefined],
      ['get_candidate_contact', { p_candidate_id: 'c1' }],
      ['drop_gift', { p_candidate_id: 'c1', p_kind: 'xu' }],
      ['send_invitation', { p_candidate_id: 'c1', p_message: 'Mời bạn phỏng vấn', p_hr_contact: 'lan@acme.vn' }],
      ['respond_invitation', { p_invitation_id: 'i1', p_accept: false, p_reason: 'bận' }],
      ['respond_invitation', { p_invitation_id: 'i1', p_accept: true, p_reason: null }],
      ['send_offer', { p_candidate_id: 'c1', p_position: 'BE', p_package: '30tr', p_message: null, p_show_company: true }],
      ['respond_offer', { p_offer_id: 'o1', p_accept: true, p_show_company: true, p_reason: 'ok' }],
      ['respond_offer', { p_offer_id: 'o1', p_accept: false, p_show_company: false, p_reason: null }],
      ['light_incense', { p_target_candidate_id: null }],
      ['light_incense', { p_target_candidate_id: 'c1' }],
      ['get_fortune', undefined],
      ['get_temple_stats', undefined],
      ['report_candidate', { p_candidate_id: 'c1', p_reason: 'spam', p_note: 'note' }],
      ['report_candidate', { p_candidate_id: 'c1', p_reason: 'other', p_note: null }],
      ['mark_notifications_read', { p_ids: [1, 2] }],
      ['mark_notifications_read', { p_ids: null }],
    ]);
  });

  it('wraps the candidate form in { p } and reads lists', async () => {
    const { b, rpcCalls, tableRows, raw } = backendOf({
      rpc: (fn) => (fn === 'list_candidates' ? { data: [{ id: 'c1', slug: 's', display_name: 'A', zone: 'qa' }], error: null } : ok({ id: 'c1', slug: 's' })),
    });
    const r = await b.saveMyCandidate({
      signText: 'Biển xin việc', title: 'QA', yearsExp: 1, skills: ['x'], salaryNegotiable: false, workModes: [], zone: 'qa',
      hideFromTicker: false, showSalaryOnCard: false, contact: { kind: 'phone', value: '0901234567' },
    });
    expect(r).toEqual({ ok: true, data: { id: 'c1', slug: 's' } });
    expect(rpcCalls[0].fn).toBe('upsert_my_candidate');
    expect(rpcCalls[0].args).toMatchObject({ p: { sign_text: 'Biển xin việc', contact_kind: 'phone', contact_value: '0901234567', zone: 'qa' } });
    expect((await b.listCandidates())[0]).toMatchObject({ id: 'c1', displayName: 'A' });

    tableRows.invitations = [{ id: 'i', hr_id: 'h', candidate_id: 'c', status: 'pending', expires_at: '2999-01-01T00:00:00Z', created_at: 't' }];
    tableRows.notifications = [{ id: 1, type: 'gift', payload: {}, created_at: 't', read_at: null }];
    expect((await b.listMyInvitations())[0].status).toBe('pending');
    expect((await b.listNotifications())[0]).toMatchObject({ id: '1', type: 'gift' });
    expect(raw.from).toHaveBeenCalledWith('invitations');
    expect(raw.from).toHaveBeenCalledWith('notifications');
  });

  it('maps error codes from the RPC envelope', async () => {
    const { b } = backendOf({
      rpc: (fn) =>
        fn === 'drop_gift'
          ? { data: { ok: false, error: 'LIMIT_PER_CANDIDATE_DAY' }, error: null }
          : fn === 'send_invitation'
            ? { data: { ok: false, error: 'VALIDATION', field: 'message' }, error: null }
            : { data: { ok: false, error: 'RATE_LIMITED', retryAfterSec: 1 }, error: null },
    });
    expect(await b.dropGift('c', 'xu')).toEqual({ ok: false, error: 'LIMIT_PER_CANDIDATE_DAY' });
    expect(await b.sendInvitation('c', 'x', 'y')).toEqual({ ok: false, error: 'VALIDATION', field: 'message' });
    expect(await b.report('c', 'spam')).toEqual({ ok: false, error: 'RATE_LIMITED', retryAfterSec: 1 });
  });
});

describe('SupabasePresence', () => {
  const meta = { uid: 'u1', name: 'Lan', role: 'hr' as const, company: 'ACME', avatar: { skin: 0, shirt: 0, pants: 0, hat: 'none' as const, bowl: 'bowl' as const } };

  async function joined() {
    let t = 1000;
    const h = makeClient({ rpc: () => ({ data: null, error: null }) });
    const b = new SupabaseBackend(h.client, { autoRetry: false, presenceTimers: false, isVisible: () => true, now: () => t });
    await b.restore();
    return { ...h, b, tick: (ms: number) => (t += ms) };
  }

  it('tracks on the street channel, publishes throttled poses on the zone channel and cleans up on leave', async () => {
    const { b, channels, tick, removed } = await joined();
    await b.presence.join(meta, 'backend');
    const street = channels.find((c) => c.topic === 'street')!;
    expect(street.tracked[0]).toMatchObject({ uid: 'u1', name: 'Lan', zone: 'backend' });
    const pos = channels.find((c) => c.topic === 'pos:backend')!;
    expect(pos.config).toMatchObject({ private: true });
    b.presence.publishPose({ x: 1.234, z: 2, ry: 0.5, moving: true });
    b.presence.publishPose({ x: 1.3, z: 2, ry: 0.5, moving: true }); // too soon (5 Hz)
    tick(250);
    b.presence.publishPose({ x: 2, z: 2, ry: 0.5, moving: true });
    expect(pos.sent).toHaveLength(2);
    expect(pos.sent[0]).toMatchObject({ type: 'broadcast', event: 'pose', payload: { u: 'u1', x: 1.23, m: 1, n: 'Lan', ro: 'hr' } });
    expect(pos.sent[1].payload).not.toHaveProperty('n');
    await b.presence.leave();
    expect(removed).toContain('pos:backend');
    expect(street.untracked).toBe(1);
  });

  it('keeps current + neighbour zone channels only', async () => {
    const { b, channels, removed } = await joined();
    await b.presence.join(meta, 'backend');
    b.presence.setZones('backend', 'frontend');
    expect(channels.map((c) => c.topic)).toContain('pos:frontend');
    b.presence.setZones('frontend', null);
    expect(removed).toEqual(['pos:backend']);
    expect(channels.filter((c) => c.topic === 'pos:frontend')).toHaveLength(1);
  });

  it('delivers remote poses (clamped, own echo ignored), reactions (rate limited) and the online count', async () => {
    const { b, channels, tick } = await joined();
    const poses: unknown[] = [];
    const reacts: unknown[] = [];
    const counts: number[] = [];
    b.presence.subscribe({
      onPose: (uid, pose, m) => poses.push([uid, pose, m?.name]),
      onLeave: (uid) => poses.push(['leave', uid]),
      onReaction: (uid, e) => reacts.push([uid, e]),
      onCount: (n) => counts.push(n),
    });
    await b.presence.join(meta, 'plaza');
    const pos = channels.find((c) => c.topic === 'pos:plaza')!;
    pos.emit('broadcast', 'pose', { u: 'u2', x: 1, z: 2, r: 0.1, m: 1, n: 'Bao', ro: 'candidate', co: null, av: meta.avatar });
    pos.emit('broadcast', 'pose', { u: 'u1', x: 1, z: 2, r: 0, m: 0 }); // echo of ourselves
    pos.emit('broadcast', 'pose', { u: 'u3', x: 'bad', z: 2, r: 0, m: 0 });
    pos.emit('broadcast', 'pose', { u: 'u4', x: 99999, z: 2, r: 0, m: 0 });
    expect(poses[0]).toEqual(['u2', { x: 1, z: 2, ry: 0.1, moving: true }, 'Bao']);
    expect(poses).toHaveLength(2);
    expect((poses[1] as [string, { x: number }])[1].x).toBeLessThan(99999);
    pos.emit('broadcast', 'react', { u: 'u2', e: 'heart', x: 0, z: 0 });
    pos.emit('broadcast', 'react', { u: 'u2', e: 'fire', x: 0, z: 0 });
    expect(reacts).toEqual([['u2', 'heart']]);

    const street = channels.find((c) => c.topic === 'street')!;
    street.presence = { u1: [{}], u2: [{}], u3: [{}] };
    street.emit('presence', 'sync', undefined);
    expect(counts.at(-1)).toBe(3);

    // expiry after 15 s without a pose
    tick(16_000);
    (b.presence as unknown as { sweep(n: number): void }).sweep(1000 + 16_000);
    expect(poses.filter((p) => (p as string[])[0] === 'leave').length).toBeGreaterThanOrEqual(1);
  });

  it('limits reactions to one per 3 seconds and does not publish while the tab is hidden', async () => {
    let visible = true;
    let t = 5000;
    const h = makeClient({ rpc: () => ({ data: null, error: null }) });
    const b = new SupabaseBackend(h.client, { autoRetry: false, presenceTimers: false, isVisible: () => visible, now: () => t });
    await b.restore();
    await b.presence.join(meta, 'qa');
    expect(b.presence.sendReaction('heart', 0, 0)).toBe(true);
    expect(b.presence.sendReaction('heart', 0, 0)).toBe(false);
    t += 3100;
    expect(b.presence.sendReaction('fire', 0, 0)).toBe(true);
    visible = false;
    b.presence.publishPose({ x: 0, z: 0, ry: 0, moving: true });
    const pos = h.channels.find((c) => c.topic === 'pos:qa')!;
    expect(pos.sent.filter((s) => s.event === 'pose')).toHaveLength(0);
    expect(pos.sent.filter((s) => s.event === 'react')).toHaveLength(2);
  });
});
