// DemoBackend / engine parity for supabase/migrations/0002_hardening.sql (same scenarios as supabase/tests/80-84_*.sql).
import { describe, expect, it } from 'vitest';
import * as engine from '@/backend/demo/engine';
import { loadRaw, saveDb, type DemoDb } from '@/backend/demo/db';
import { BOT_HRS } from '@/backend/demo/seed';
import { DAY_MS, HOUR_MS, LIMITS } from '@/lib/rules';
import { AVATAR, World, candInput, collect, sit } from './helpers';

const MSG = 'Mời bạn phỏng vấn nhé';
const MIN = 60_000;

/** registers an HR and lets the TOO_NEW gate pass */
async function hr(w: World, uid: string, company = 'ACME') {
  const b = await w.user(uid, 'hr', `HR ${uid}`, company);
  w.advance(LIMITS.hrInviteMinAgeMinutes * MIN + 1000);
  return b;
}

function admin(w: World, fn: (db: DemoDb) => engine.Out<void>) {
  const db = loadRaw(w.store)!;
  const out = fn(db);
  saveDb(w.store, db);
  return out;
}

describe('0002: contact gate (sec H1 + L5)', () => {
  it('unlocks only on an ACCEPTED invitation, for a caller who is still HR; capped per hour', async () => {
    const w = new World();
    const { b: cand, id } = await sit(w, 'c');
    const h = await hr(w, 'h');
    const inv = await h.sendInvitation(id, MSG, 'hr@acme.vn');
    expect(inv.ok).toBe(true);
    expect(await h.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    expect((await h.getCandidate(id))?.me?.canSeeContact).toBe(false);
    if (!inv.ok) return;
    expect((await cand.respondInvitation(inv.data.id, true)).ok).toBe(true);
    expect(await h.getCandidateContact(id)).toMatchObject({ ok: true, data: { value: 'me@example.com' } });
    expect((await h.getCandidate(id))?.me?.canSeeContact).toBe(true);

    // role change locks again (L5)
    expect((await h.register({ displayName: 'HR h', role: 'viewer', avatar: AVATAR })).ok).toBe(true);
    expect(await h.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    expect((await h.getCandidate(id))?.me?.canSeeContact).toBe(false);
    expect((await h.register({ displayName: 'HR h', role: 'hr', company: 'ACME', avatar: AVATAR })).ok).toBe(true);
    expect((await h.getCandidateContact(id)).ok).toBe(true);

    // hourly cap (owner never capped)
    w.advance(HOUR_MS);
    for (let i = 0; i < LIMITS.contactViewsPerHour; i++) expect((await h.getCandidateContact(id)).ok).toBe(true);
    expect(await h.getCandidateContact(id)).toMatchObject({ ok: false, error: 'RATE_LIMITED', retryAfterSec: 3600 });
    for (let i = 0; i < 25; i++) expect((await cand.getCandidateContact(id)).ok).toBe(true);
  });

  it('declined invitations never unlock; a missing contact row is NOT_FOUND', async () => {
    const w = new World();
    const { b: cand, id } = await sit(w, 'c');
    const h = await hr(w, 'h');
    const inv = await h.sendInvitation(id, MSG, 'hr@acme.vn');
    if (!inv.ok) throw new Error(inv.error);
    await cand.respondInvitation(inv.data.id, false);
    expect(await h.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    admin(w, (db) => {
      delete db.contacts[id];
      return { res: { ok: true, data: undefined }, emits: [] };
    });
    expect(await cand.getCandidateContact(id)).toMatchObject({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('0002: HR account-age gate (TOO_NEW) and hr_contact moderation', () => {
  it('no 500k within 10 minutes of becoming HR; switching to HR restarts the clock', async () => {
    const w = new World();
    const { id } = await sit(w, 'c');
    const h = await w.user('h', 'hr');
    expect(await h.sendInvitation(id, MSG, 'hr@acme.vn')).toMatchObject({ ok: false, error: 'TOO_NEW', retryAfterSec: 600 });
    w.advance(9 * MIN + 30_000);
    expect(await h.sendInvitation(id, MSG, 'hr@acme.vn')).toMatchObject({ error: 'TOO_NEW', retryAfterSec: 30 });
    w.advance(31_000);
    expect((await h.sendInvitation(id, MSG, 'hr@acme.vn')).ok).toBe(true);

    const v = await w.user('v', 'viewer');
    w.advance(2 * HOUR_MS);
    await v.register({ displayName: 'Bạn v', role: 'hr', company: 'Đổi Corp', avatar: AVATAR });
    expect(await v.sendInvitation('nope', 'ngắn', 'x')).toMatchObject({ error: 'TOO_NEW' }); // gate runs before lookup/validation
  });

  it('hr_contact must look like email / http(s) URL / phone and passes the blocklist', async () => {
    const w = new World();
    const { id } = await sit(w, 'c');
    const { id: id2 } = await sit(w, 'c2');
    const h = await hr(w, 'h');
    for (const bad of ['gọi tui nha', 'javascript:alert(1)', 'ftp://acme.vn', 'abc']) {
      expect(await h.sendInvitation(id, MSG, bad)).toMatchObject({ ok: false, error: 'VALIDATION', field: 'hr_contact' });
    }
    expect(await h.sendInvitation(id, MSG, 'vcl.hr@acme.vn')).toMatchObject({ error: 'BLOCKED_CONTENT', field: 'hr_contact' });
    expect((await h.sendInvitation(id, MSG, 'https://acme.vn/jobs')).ok).toBe(true);
    expect((await h.sendInvitation(id2, MSG, '+84 912 345 678')).ok).toBe(true);
  });
});

describe('0002: rate limits and no-op broadcasts (sec H3)', () => {
  it('upsert_profile 5/min, set_my_candidate_status 4/min', async () => {
    const w = new World();
    const u = w.tab('u');
    for (let i = 0; i < LIMITS.profileUpdatesPerMinute; i++) {
      expect((await u.register({ displayName: 'Hay Đổi', role: 'viewer', avatar: { ...AVATAR, skin: i } })).ok).toBe(true);
    }
    expect(await u.register({ displayName: 'Hay Đổi', role: 'viewer', avatar: AVATAR })).toMatchObject({ error: 'RATE_LIMITED', retryAfterSec: 60 });
    w.advance(MIN);
    expect((await u.register({ displayName: 'Hay Đổi', role: 'viewer', avatar: AVATAR })).ok).toBe(true);

    const { b } = await sit(w, 'c');
    for (const s of ['hidden', 'sitting', 'hidden', 'sitting'] as const) expect((await b.setMyCandidateStatus(s)).ok).toBe(true);
    expect(await b.setMyCandidateStatus('hidden')).toMatchObject({ error: 'RATE_LIMITED', retryAfterSec: 60 });
  });

  it('unchanged profile / status / card is not re-broadcast', async () => {
    const w = new World();
    const { b } = await sit(w, 'c');
    const seen = collect(b);
    w.advance(MIN);
    await b.register({ displayName: 'Bạn c', role: 'candidate', avatar: AVATAR });
    expect(seen.street).toHaveLength(0);
    await b.register({ displayName: 'Bạn c', role: 'candidate', avatar: { ...AVATAR, skin: 3 } });
    expect(seen.street.map((e) => e.type)).toEqual(['candidate_upsert']);
    await b.setMyCandidateStatus('sitting');
    expect(seen.street).toHaveLength(1);
    await b.setMyCandidateStatus('hidden');
    await b.setMyCandidateStatus('hidden');
    expect(seen.street.map((e) => e.type)).toEqual(['candidate_upsert', 'candidate_remove']);
    w.advance(MIN);
    await b.setMyCandidateStatus('sitting');
    seen.street.length = 0;
    await b.saveMyCandidate(candInput());
    expect(seen.street).toHaveLength(0);
    await b.saveMyCandidate(candInput({ signText: 'Biển đổi thật rồi nha' }));
    expect(seen.street.map((e) => e.type)).toEqual(['candidate_upsert']);
  });
});

describe('0002: moderation lock, tombstones, bans (sec M1)', () => {
  it('admin hide locks "sit again" until unhide; removed / pending signs lock too', async () => {
    const w = new World();
    const { b, id } = await sit(w, 'c');
    expect(admin(w, (db) => engine.adminModerate(db, w.now, id, 'hide')).emits.map((e) => e.event)).toEqual(['candidate_remove']);
    expect(await b.setMyCandidateStatus('sitting')).toMatchObject({ ok: false, error: 'MODERATION_LOCKED' });
    expect((await b.setMyCandidateStatus('hidden')).ok).toBe(true);
    expect((await b.saveMyCandidate(candInput({ title: 'Dev mới' }))).ok).toBe(true);
    expect(await b.setMyCandidateStatus('sitting')).toMatchObject({ error: 'MODERATION_LOCKED' });
    admin(w, (db) => engine.adminModerate(db, w.now, id, 'unhide'));
    expect((await b.getCandidate(id))?.status).toBe('sitting'); // detail maps hidden -> sitting; check the row instead
    expect(loadRaw(w.store)!.candidates[id].status).toBe('hidden');
    expect((await b.setMyCandidateStatus('sitting')).ok).toBe(true);

    admin(w, (db) => engine.adminModerate(db, w.now, id, 'remove_sign'));
    w.advance(MIN);
    await b.setMyCandidateStatus('hidden');
    expect(await b.setMyCandidateStatus('sitting')).toMatchObject({ error: 'MODERATION_LOCKED' });
    admin(w, (db) => engine.adminModerate(db, w.now, id, 'approve_sign'));
    expect((await b.setMyCandidateStatus('sitting')).ok).toBe(true);
  });

  it('delete + recreate keeps the moderation state; at most 3 creations per VN day', async () => {
    const w = new World();
    const { b, id } = await sit(w, 'c');
    admin(w, (db) => engine.adminModerate(db, w.now, id, 'remove_sign'));
    expect((await b.deleteMyCandidate()).ok).toBe(true);
    w.advance(11 * MIN);
    const r = await b.saveMyCandidate(candInput());
    if (!r.ok) throw new Error(r.error);
    let row = loadRaw(w.store)!.candidates[r.data.id];
    expect([row.signState, row.status]).toEqual(['pending_review', 'sitting']);

    admin(w, (db) => engine.adminModerate(db, w.now, r.data.id, 'hide'));
    expect((await b.deleteMyCandidate()).ok).toBe(true);
    w.advance(11 * MIN);
    const r2 = await b.saveMyCandidate(candInput());
    if (!r2.ok) throw new Error(r2.error);
    row = loadRaw(w.store)!.candidates[r2.data.id];
    expect([row.status, row.modHiddenAt !== null && row.modHiddenAt !== undefined]).toEqual(['hidden', true]);
    expect(await b.setMyCandidateStatus('sitting')).toMatchObject({ error: 'MODERATION_LOCKED' });

    // 3 creations today already (sit + 2 recreates)
    expect((await b.deleteMyCandidate()).ok).toBe(true);
    w.advance(11 * MIN);
    const r3 = await b.saveMyCandidate(candInput());
    expect(r3).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
    expect(r3.ok === false && r3.retryAfterSec).toBeFalsy();
    w.days(1);
    expect((await b.saveMyCandidate(candInput())).ok).toBe(true);
  });

  it('bans block profile, candidate, 500k and reports', async () => {
    const w = new World();
    const { b, id } = await sit(w, 'c');
    const { id: other } = await sit(w, 'o');
    admin(w, (db) => engine.adminModerate(db, w.now, id, 'ban'));
    expect(await b.register({ displayName: 'Bạn c', role: 'candidate', avatar: AVATAR })).toMatchObject({ error: 'BANNED' });
    expect(await b.saveMyCandidate(candInput())).toMatchObject({ error: 'BANNED' });
    expect(await b.report(other, 'spam')).toMatchObject({ error: 'BANNED' });
    expect(await b.setMyCandidateStatus('sitting')).toMatchObject({ error: 'MODERATION_LOCKED' });
    const h = await hr(w, 'h');
    admin(w, (db) => engine.adminBanUser(db, w.now, 'h', true, 'scam'));
    expect(await h.sendInvitation(other, MSG, 'hr@acme.vn')).toMatchObject({ error: 'BANNED' });
    admin(w, (db) => engine.adminBanUser(db, w.now, 'h', false));
    expect((await h.sendInvitation(other, MSG, 'hr@acme.vn')).ok).toBe(true);
    admin(w, (db) => engine.adminModerate(db, w.now, id, 'unban'));
    expect((await b.register({ displayName: 'Bạn c', role: 'candidate', avatar: AVATAR })).ok).toBe(true);
    expect(admin(w, (db) => engine.adminModerate(db, w.now, id, 'nuke')).res).toMatchObject({ ok: false, error: 'VALIDATION', field: 'action' });
  });
});

describe('0002: reports (sec M2, review M2)', () => {
  it('fresh reporters are not counted; 5 aged distinct reporters hide the sign', async () => {
    const w = new World();
    const { id } = await sit(w, 'c');
    const fresh = [];
    for (let i = 0; i < 5; i++) fresh.push(await w.user(`f${i}`, 'viewer'));
    for (const f of fresh) expect((await f.report(id, 'spam')).ok).toBe(true);
    expect((await fresh[0].getCandidate(id))?.signState).toBe('ok');
    const aged = [];
    for (let i = 0; i < 5; i++) aged.push(await w.user(`a${i}`, 'viewer'));
    w.advance(LIMITS.reporterMinAgeMinutes * MIN);
    for (let i = 0; i < 4; i++) await aged[i].report(id, 'other');
    expect((await aged[0].getCandidate(id))?.signState).toBe('ok');
    await aged[4].report(id, 'other');
    expect((await aged[0].getCandidate(id))?.signState).toBe('pending_review');
  });

  it('a hidden candidate reaching the threshold is never upserted (candidate_remove instead)', async () => {
    const w = new World();
    const { b, id } = await sit(w, 'c');
    await b.setMyCandidateStatus('hidden');
    const rs = [];
    for (let i = 0; i < LIMITS.reportsToHideSign; i++) rs.push(await w.user(`a${i}`, 'viewer'));
    w.advance(LIMITS.reporterMinAgeMinutes * MIN);
    const seen = collect(rs[0]);
    for (const r of rs) await r.report(id, 'other');
    expect(seen.street.map((e) => e.type)).toEqual(['candidate_remove']);
    expect(admin(w, (db) => engine.adminModerate(db, w.now, id, 'approve_sign')).emits.map((e) => e.event)).toEqual(['candidate_remove']);
  });
});

describe('0002: reads (review M4) and anonymous street refs (sec L1)', () => {
  it('lists placed candidates only within placedVisibleDays', async () => {
    const w = new World();
    const { id } = await sit(w, 'c');
    admin(w, (db) => {
      Object.assign(db.candidates[id], { status: 'placed', placedAt: w.now });
      return { res: { ok: true, data: undefined }, emits: [] };
    });
    w.days(LIMITS.placedVisibleDays - 1);
    expect((await w.tab('x').listCandidates()).some((c) => c.id === id)).toBe(true);
    w.days(2);
    expect((await w.tab('y').listCandidates()).some((c) => c.id === id)).toBe(false);
  });

  it('hide_from_ticker: gift / invite events carry no candidate id or zone; placed carries the ticker name', async () => {
    const w = new World();
    const { b: cand, id } = await sit(w, 'c', { hideFromTicker: true });
    const h = await hr(w, 'h');
    const seen = collect(h);
    await h.dropGift(id, 'xu');
    const inv = await h.sendInvitation(id, MSG, 'hr@acme.vn');
    if (!inv.ok) throw new Error(inv.error);
    await cand.respondInvitation(inv.data.id, true);
    const off = await h.sendOffer(id, { position: 'Dev', package: '30tr', showCompany: false });
    if (!off.ok) throw new Error(off.error);
    await cand.respondOffer(off.data.id, true);
    for (const e of seen.street) {
      if (e.type === 'gift' || e.type === 'invite' || e.type === 'offer') expect(e.candidate).toEqual({ id: '', name: 'một bạn ẩn danh', zone: null });
      if (e.type === 'placed') expect(e.name).toBe('một bạn ẩn danh');
    }
    expect(seen.street.map((e) => e.type)).toEqual(['gift', 'invite', 'offer', 'placed']);
  });
});

describe('0002: demo bots skip daily gift quotas (review M3, demo only)', () => {
  it('a bot HR can keep gifting the same sample candidate', async () => {
    const w = new World();
    const b = w.tab('viewer');
    const sample = (await b.listCandidates()).find((c) => c.isSample)!;
    for (let i = 0; i < LIMITS.xu.perDay + 3; i++) {
      w.advance(1000);
      expect((await b.botGift(BOT_HRS[1].id, sample.id, 'xu')).ok).toBe(true);
    }
    w.advance(DAY_MS);
  });
});
