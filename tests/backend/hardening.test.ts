import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseBackend } from '@/backend/supabase/SupabaseBackend';
import { mapCardLight, mapListCard, mapStreetEvent } from '@/backend/supabase/mappers';
import { SupabasePresence } from '@/backend/supabase/presence';
import { DemoPresence } from '@/backend/demo/presence';
import { MemoryBus } from '@/backend/demo/bus';
import { claimIdentity, MemoryIdentityLocks } from '@/backend/demo/identity';
import { MemoryStore } from '@/backend/demo/db';
import { useSession } from '@/state/session';
import { useWorld } from '@/state/world';
import { clearPeers, MAX_REMOTE_PEERS, onPeerPose, peers } from '@/state/peers';
import { parsePose, parseReaction, MAX_PEERS } from '@/lib/peerInput';
import { NotificationAggregator } from '@/lib/notify';
import { ogStamp } from '@/lib/shareData';
import type { Backend, CandidateCard, PeerMeta, StreetEvent } from '@/backend/types';
import { AVATAR } from './helpers';

function fakeClient(rpc: (fn: string) => { data: unknown; error: unknown; status?: number }, signIn = vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null }))) {
  const ch = () => {
    const c = { on: () => c, subscribe: (cb?: (s: string) => void) => (cb?.('SUBSCRIBED'), c), send: async () => 'ok', track: async () => 'ok', untrack: async () => 'ok', presenceState: () => ({}), state: 'joined' };
    return c;
  };
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), signInAnonymously: signIn, onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    realtime: { setAuth: async () => undefined },
    channel: ch,
    removeChannel: async () => undefined,
    rpc: async (fn: string) => rpc(fn),
  };
  return { client: client as unknown as SupabaseClient, signIn };
}

const card = (over: Record<string, unknown> = {}) => ({
  id: 'c1', slug: 's', display_name: 'A', zone: 'backend', sign_text: 'x', sign_state: 'ok', title: 'T', years_exp: 1, skills: [], status: 'sitting',
  is_sample: false, avatar: {}, sitting_since: 't', created_at: 't', ...over,
});

describe('M1: getMe distinguishes an error from "no profile"', () => {
  it('returns null for no profile, throws on an RPC error', async () => {
    let fail = false;
    const { client } = fakeClient(() => (fail ? { data: null, error: { message: 'Failed to fetch' }, status: 0 } : { data: null, error: null, status: 200 }));
    const b = new SupabaseBackend(client, { autoRetry: false, presenceTimers: false, isVisible: () => true });
    expect(await b.getMe()).toBeNull();
    fail = true;
    await expect(b.getMe()).rejects.toThrow();
    expect(await b.register({ displayName: 'Lan', role: 'viewer', avatar: AVATAR })).toEqual({ ok: false, error: 'NETWORK' });
  });

  it('refreshMe keeps the previous me on a transient failure', async () => {
    const me = { profile: { id: 'u1' } } as never;
    const getMe = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce(null);
    useSession.setState({ backend: { getMe } as unknown as Backend, me });
    await useSession.getState().refreshMe();
    expect(useSession.getState().me).toBe(me);
    await useSession.getState().refreshMe(); // a real "no profile" answer still clears it
    expect(useSession.getState().me).toBeNull();
  });
});

describe('M2 (client): hidden candidates never reach the street', () => {
  it('mappers drop or convert hidden', () => {
    expect(mapCardLight(card({ status: 'hidden' }))).toBeNull();
    expect(mapListCard(card({ status: 'hidden' }))).toBeNull();
    expect(mapListCard(card())?.status).toBe('sitting');
    expect(mapStreetEvent('candidate_upsert', { candidate: card({ status: 'hidden' }), at: 't' })).toEqual({ type: 'candidate_remove', id: 'c1', at: 't' });
    expect(mapStreetEvent('placed', { candidate: card({ status: 'hidden' }), at: 't' })).toBeNull();
  });
});

const full = (id: string, over: Partial<CandidateCard> = {}): CandidateCard => ({
  id, slug: id, displayName: id, zone: 'backend', signText: 's', signState: 'ok', title: 't', yearsExp: 1, skills: [], status: 'sitting', isSample: false,
  avatar: AVATAR, sittingSince: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', placedAt: null, placedCompany: null,
  totals: { xu: 0, love: 0, invites: 0, incense: 0 }, completeness: 3, decayed: { hr: 0, love: 0, invites: 0, accepted: 0 }, xuWeek: 0, xuToday: 0, ...over,
});
const upsert = (c: CandidateCard): StreetEvent => ({ type: 'candidate_upsert', candidate: c, at: 't' });

describe('world store', () => {
  const NOW = Date.parse('2026-02-01T00:00:00Z');
  beforeEach(() => useWorld.setState({ candidates: {}, loaded: false }));

  it('seats a placed -> sitting candidate immediately', () => {
    useWorld.getState().setAll([full('a', { status: 'placed' })], NOW);
    expect(useWorld.getState().plan.seats.has('a')).toBe(false);
    useWorld.getState().apply(upsert(full('a')), NOW);
    expect(useWorld.getState().plan.seats.has('a')).toBe(true);
  });

  it('replays structural events that arrived while the street was loading', () => {
    const w = useWorld.getState();
    w.beginLoad();
    w.apply(upsert(full('late')), NOW);
    w.apply({ type: 'candidate_remove', id: 'gone', at: 't' }, NOW);
    w.setAll([full('gone'), full('old')], NOW);
    const c = useWorld.getState().candidates;
    expect(Object.keys(c).sort()).toEqual(['late', 'old']);
    expect(useWorld.getState().plan.seats.has('late')).toBe(true);
  });
});

describe('M3 (bots): welcome gift is reserved', () => {
  it('random gifts never use the welcome bot and stop on LIMIT_DAILY', async () => {
    const { startBots } = await import('@/backend/demo/bots');
    const { BOT_HRS } = await import('@/backend/demo/seed');
    vi.useFakeTimers();
    const used: string[] = [];
    const backend = {
      listCandidates: async () => [full('s1', { isSample: true })],
      botGift: async (bot: string) => (used.push(bot), { ok: false as const, error: 'LIMIT_DAILY' as const }),
      onStreetEvent: () => () => undefined,
      botPose: () => undefined,
    };
    const stop = startBots(backend as never, { acquireLeader: async () => true, rand: () => 0.5 });
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    stop();
    vi.useRealTimers();
    expect(used.includes(BOT_HRS[0].id)).toBe(false);
    expect(used.length).toBeLessThanOrEqual(BOT_HRS.length - 1); // one failed attempt per ticker bot, then silence
  });
});

describe('pose / reaction receivers (Sec M3)', () => {
  const pose = (over: Record<string, unknown> = {}) => ({ u: 'peer', x: 1, z: -3, r: 0.5, m: 1, ...over });

  it('parsePose trusts only finite numbers, clamps, and moderates the meta', () => {
    expect(parsePose(pose({ x: Infinity }), 'me')).toBeNull();
    expect(parsePose(pose({ x: '1' }), 'me')).toBeNull();
    expect(parsePose(pose({ u: 'me' }), 'me')).toBeNull();
    expect(parsePose(pose({ u: 'x'.repeat(100) }), 'me')).toBeNull();
    expect(parsePose(null, 'me')).toBeNull();
    const far = parsePose(pose({ x: 9999, z: 9999 }), 'me')!;
    expect(far.pose.x).toBeLessThan(10);
    expect(far.pose.z).toBeLessThan(100);
    const good = parsePose(pose({ n: 'Lan Anh', ro: 'hr', co: 'ACME', av: { skin: 1, shirt: 2, pants: 3, hat: 'cap', bowl: 'box' } }), 'me')!;
    expect(good.meta).toMatchObject({ uid: 'peer', name: 'Lan Anh', role: 'hr', company: 'ACME' });
    // forged / hostile meta: blocked word, PII, unknown role, junk avatar
    expect(parsePose(pose({ n: 'vcl', ro: 'hr', av: {} }), 'me')!.meta).toBeNull();
    expect(parsePose(pose({ n: 'gọi 0912345678', ro: 'hr', av: {} }), 'me')!.meta).toBeNull();
    expect(parsePose(pose({ n: 'Lan', ro: 'admin', av: {} }), 'me')!.meta).toBeNull();
    const junk = parsePose(pose({ n: 'Lan', ro: 'viewer', co: 'a@b.co', av: { skin: -5, shirt: 1e9, hat: 'evil', bowl: {} } }), 'me')!.meta!;
    expect(junk.company).toBeNull();
    expect(junk.avatar).toEqual({ skin: 0, shirt: 31, pants: 0, hat: 'none', bowl: 'bowl' });
  });

  it('parseReaction only accepts allowlisted emoji', () => {
    expect(parseReaction({ u: 'p', e: 'heart', x: 0, z: 0 }, 'me')).toMatchObject({ e: 'heart' });
    expect(parseReaction({ u: 'p', e: '<img src=x>', x: 0, z: 0 }, 'me')).toBeNull();
    expect(parseReaction({ u: 'p', e: 'heart', x: NaN, z: 0 }, 'me')).toBeNull();
  });

  it('SupabasePresence caps peers and rate-limits one uid', () => {
    const t = { now: 1000 };
    const p = new SupabasePresence({} as SupabaseClient, () => 'me', { now: () => t.now, timers: false });
    const got: string[] = [];
    p.subscribe({ onPose: (u) => got.push(u), onLeave: () => undefined, onReaction: () => undefined, onCount: () => undefined });
    p.onPose({ u: 'a', x: 0, z: 0, r: 0, m: 1 });
    p.onPose({ u: 'a', x: 0, z: 0, r: 0, m: 1 }); // same instant: dropped by the per-uid gate
    expect(got).toEqual(['a']);
    for (let i = 0; i < MAX_PEERS + 50; i++) {
      t.now += 1;
      p.onPose({ u: `f${i}`, x: 0, z: 0, r: 0, m: 1 });
    }
    expect(new Set(got).size).toBeLessThanOrEqual(MAX_PEERS);
  });

  it('DemoPresence coerces a non-numeric rotation and validates reactions', async () => {
    const hub = new MemoryBus();
    const b = new DemoPresence(hub.peer(), 'b', () => 5000, { timers: false });
    const a = hub;
    const poses: number[] = [];
    const reacts: string[] = [];
    b.subscribe({ onPose: (_u, p) => poses.push(p.ry), onLeave: () => undefined, onReaction: (_u, e) => reacts.push(e), onCount: () => undefined });
    await b.join({ uid: 'b', name: 'b', role: 'viewer', company: null, avatar: AVATAR } as PeerMeta, 'backend');
    a.post({ topic: 'pos:backend', event: 'pose', payload: { u: 'evil', x: 0, z: 0, r: '<script>', m: 1 } });
    a.post({ topic: 'pos:backend', event: 'react', payload: { u: 'evil', e: 'boom', x: 0, z: 0 } });
    expect(poses).toEqual([0]);
    expect(reacts).toEqual([]);
  });

  it('the peers store ignores non-finite poses and caps the map', () => {
    clearPeers();
    onPeerPose('n', { x: NaN, z: 0, ry: 0, moving: false }, null, 1);
    expect(peers.size).toBe(0);
    for (let i = 0; i < MAX_REMOTE_PEERS + 20; i++) onPeerPose(`p${i}`, { x: 0, z: 0, ry: 0, moving: false }, null, 1);
    expect(peers.size).toBe(MAX_REMOTE_PEERS);
    clearPeers();
  });
});

describe('Minor 5/6: demo identity and hidden tabs', () => {
  it('two tabs claiming at once get different users and both are remembered', async () => {
    const local = new MemoryStore();
    const locks = new MemoryIdentityLocks();
    let n = 0;
    const deps = (s: MemoryStore) => ({ local, session: s, locks, newId: () => `u${++n}` });
    const [a, b] = await Promise.all([claimIdentity(deps(new MemoryStore())), claimIdentity(deps(new MemoryStore()))]);
    expect(a).not.toBe(b);
    expect(JSON.parse(local.get('pxv:demo:users')!).sort()).toEqual([a, b].sort());
  });

  it('a hidden-tab peer survives the normal 15 s expiry', async () => {
    const hub = new MemoryBus();
    let t = 1000;
    const a = new DemoPresence(hub, 'a', () => t, { timers: false });
    const left: string[] = [];
    a.subscribe({ onPose: () => undefined, onLeave: (u) => left.push(u), onReaction: () => undefined, onCount: () => undefined });
    await a.join({ uid: 'a', name: 'a', role: 'viewer', company: null, avatar: AVATAR } as PeerMeta, 'backend');
    const other = hub.peer();
    other.post({ topic: 'street', event: 'hello', payload: { uid: 'bg', meta: { uid: 'bg' }, hidden: true } });
    other.post({ topic: 'street', event: 'hello', payload: { uid: 'fg', meta: { uid: 'fg' } } });
    t += 60_000;
    a.sweep(t);
    expect(left).toEqual(['fg']);
    t += 120_000;
    a.sweep(t);
    expect(left).toEqual(['fg', 'bg']);
  });
});

describe('Minor 7/8', () => {
  it('OG stamp follows the data source', () => {
    expect(ogStamp({ demo: true, sample: false })).toBe('Bản demo');
    expect(ogStamp({ demo: false, sample: true })).toBe('Ứng viên mẫu');
    expect(ogStamp({ demo: false, sample: false, placed: true })).toBe('Đã được bao trọn');
    expect(ogStamp({ demo: false, sample: false })).toBe('');
  });

  it('aggregate gift notifications are counted per kind', () => {
    const a = new NotificationAggregator();
    let act = a.push({ type: 'gift', payload: { kind: 'xu' } }, 0);
    for (let i = 1; i < 8; i++) act = a.push({ type: 'gift', payload: { kind: i % 2 ? 'love' : 'xu' } }, i * 100);
    expect(act).toMatchObject({ kind: 'aggregate', count: 8, xu: 4, love: 4 });
  });
});

describe('M5: street snapshot with RPC fallback', () => {
  it('uses the cached snapshot, falls back to the RPC when it fails', async () => {
    const rpc = vi.fn(() => ({ data: [card({ id: 'rpc' })], error: null, status: 200 }));
    const { client } = fakeClient(rpc);
    const b = new SupabaseBackend(client, { autoRetry: false, presenceTimers: false, snapshotUrl: '/api/street' });
    const f = vi.spyOn(globalThis, 'fetch');
    f.mockResolvedValueOnce(new Response(JSON.stringify([card({ id: 'snap' }), card({ id: 'h', status: 'hidden' })]), { status: 200 }));
    expect((await b.listCandidates()).map((c) => c.id)).toEqual(['snap']);
    expect(rpc).not.toHaveBeenCalled();
    f.mockResolvedValueOnce(new Response('x', { status: 503 }));
    expect((await b.listCandidates()).map((c) => c.id)).toEqual(['rpc']);
    f.mockRejectedValueOnce(new Error('offline'));
    expect((await b.listCandidates()).map((c) => c.id)).toEqual(['rpc']);
    f.mockRestore();
  });
});

describe('H1: CAPTCHA token on the anonymous sign-in', () => {
  it('waits for a token, passes it to signInAnonymously and does not sign in at restore', async () => {
    const signIn = vi.fn(async (...args: unknown[]) => (void args, { data: { user: { id: 'u1' } }, error: null }));
    const { client } = fakeClient(() => ({ data: null, error: null, status: 200 }), signIn);
    const take = vi.fn(async () => 'tok-123');
    const b = new SupabaseBackend(client, { autoRetry: false, presenceTimers: false, captcha: { take } });
    expect(await b.restore()).toBeNull();
    expect(signIn).not.toHaveBeenCalled();
    expect(take).not.toHaveBeenCalled();
    await b.register({ displayName: 'Lan', role: 'viewer', avatar: AVATAR });
    expect(signIn).toHaveBeenCalledWith({ options: { captchaToken: 'tok-123' } });
  });
});
