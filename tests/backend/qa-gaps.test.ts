// QA gap-filling tests (see .squad/QA-REPORT.md for the traceability matrix).
import { describe, expect, it } from 'vitest';
import { assignSeats } from '@/lib/seats';
import { rankInZone } from '@/lib/seats';
import { toRanked } from '@/state/world';
import { drawFortuneDemo, selectFortune } from '@/lib/fortune';
import { effectiveStatus } from '@/lib/notify';
import { LIMITS } from '@/lib/rules';
import { sit, World, AVATAR } from './helpers';

const MSG = 'Mời bạn phỏng vấn nhé';
/** Security hardening: new HR accounts cannot send 500k and new reporters are not counted until their profile is old enough. */
const ripen = (w: World) => w.advance(Math.max(LIMITS.hrInviteMinAgeMinutes, LIMITS.reporterMinAgeMinutes) * 60_000 + 1000);

describe('QA: xu tình thương (BR-L1, AC-12)', () => {
  it('a spectator gets exactly 5 love coins per VN day, 1 per candidate, then LIMIT_DAILY; resets next day', async () => {
    const w = new World();
    const v = await w.user('v', 'viewer');
    const samples = (await v.listCandidates()).filter((c) => c.isSample);
    for (let i = 0; i < 5; i++) {
      w.advance(1500);
      expect((await v.dropGift(samples[i].id, 'love')).ok).toBe(true);
    }
    expect((await v.getMe())?.quota.loveUsed).toBe(5);
    w.advance(1500);
    expect(await v.dropGift(samples[5].id, 'love')).toMatchObject({ ok: false, error: 'LIMIT_DAILY' });
    expect((await v.getCandidate(samples[5].id))?.totals.love).toBe(samples[5].totals.love); // no change
    w.days(1);
    expect((await v.getMe())?.quota.loveUsed).toBe(0);
    expect((await v.dropGift(samples[0].id, 'love')).ok).toBe(true);
  });

  it('love never spends HR xu, is counted separately and is blocked for unavailable candidates', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const { b: cand, id } = await sit(w, 'c');
    const before = (await hr.getCandidate(id))!.totals;
    const r = await hr.dropGift(id, 'love');
    expect(r.ok).toBe(true);
    const me = await hr.getMe();
    expect(me?.quota.xuUsed).toBe(0);
    expect(me?.quota.loveUsed).toBe(1);
    const after = (await hr.getCandidate(id))!.totals;
    expect(after.love).toBe(before.love + 1);
    expect(after.xu).toBe(before.xu);
    w.advance(1500);
    await cand.setMyCandidateStatus('hidden');
    const v = await w.user('v', 'viewer');
    expect(await v.dropGift(id, 'love')).toMatchObject({ ok: false, error: 'CANDIDATE_UNAVAILABLE' });
  });

  it('another candidate may send love to a candidate (not only spectators)', async () => {
    const w = new World();
    const { id } = await sit(w, 'c1');
    const { b: other } = await sit(w, 'c2');
    expect((await other.dropGift(id, 'love')).ok).toBe(true);
  });
});

describe('QA: invitation expiry (AC-10.4, BR-5-5)', () => {
  it('expires exactly at 14 days, is visible as expired and cannot be accepted', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const { b: cand, id } = await sit(w, 'c');
    ripen(w);
    const inv = await hr.sendInvitation(id, MSG, 'hr@acme.vn');
    if (!inv.ok) throw new Error();
    const day = 24 * 3600 * 1000;
    w.advance(14 * day - 1000);
    expect((await hr.getCandidate(id))?.me?.openInvite).toBe(true);
    w.advance(2000);
    expect((await hr.getCandidate(id))?.me?.openInvite).toBe(false);
    const listed = (await hr.listMyInvitations()).find((i) => i.id === inv.data.id)!;
    expect(effectiveStatus(listed, w.now)).toBe('expired'); // lazy expiry, as the Inbox renders it
    expect(await cand.respondInvitation(inv.data.id, true)).toMatchObject({ ok: false, error: 'EXPIRED' });
  });

  it('an expired invitation frees one of the 5 open slots and allows a re-invite after cooldown', async () => {
    const w = new World();
    const { id, b: cand } = await sit(w, 'c');
    const hrs = [];
    for (let i = 0; i < 5; i++) hrs.push(await w.user(`hr${i}`, 'hr', `HR ${i}`));
    const hr6 = await w.user('hr6', 'hr');
    ripen(w);
    for (const hr of hrs) expect((await hr.sendInvitation(id, MSG, 'hr@acme.vn')).ok).toBe(true);
    expect(await hr6.sendInvitation(id, MSG, 'hr@acme.vn')).toMatchObject({ error: 'CANDIDATE_FULL' });
    w.days(LIMITS.invite.expireDays + 1);
    expect((await hr6.sendInvitation(id, MSG, 'hr@acme.vn')).ok).toBe(true);
    expect((await hrs[0].sendInvitation(id, MSG, 'hr@acme.vn')).ok).toBe(true); // cooldown (7d) passed too
    expect(cand).toBeTruthy();
  });

  it('accepting an expired invitation does not unlock anything new / does not create an accepted state', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const { b: cand, id } = await sit(w, 'c');
    ripen(w);
    const inv = await hr.sendInvitation(id, MSG, 'hr@acme.vn');
    if (!inv.ok) throw new Error();
    w.days(15);
    await cand.respondInvitation(inv.data.id, true);
    expect((await hr.getCandidate(id))?.me?.acceptedInviteId ?? null).toBeNull();
    expect(await hr.sendOffer(id, { position: 'Dev', package: '30tr', showCompany: false })).toMatchObject({ ok: false, error: 'NEED_ACCEPTED_INVITE' });
  });
});

describe('QA: contact privacy (BR-Privacy, AC-8.2)', () => {
  it('the contact value never appears in public card/detail payloads for anyone but the owner/unlocked HR', async () => {
    const w = new World();
    const { b: cand, id } = await sit(w, 'c', { contact: { kind: 'email', value: 'secret.person@example.com' } });
    const hr = await w.user('hr', 'hr');
    const viewer = await w.user('v', 'viewer');
    const other = await w.user('o', 'candidate');
    for (const b of [hr, viewer, other]) {
      expect(JSON.stringify(await b.listCandidates())).not.toContain('secret.person');
      expect(JSON.stringify(await b.getCandidate(id))).not.toContain('secret.person');
      expect(await b.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    }
    // xu and love do not unlock
    await hr.dropGift(id, 'xu');
    await viewer.dropGift(id, 'love');
    expect(await hr.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    expect(await other.getCandidateContact(id)).toMatchObject({ ok: false });
    expect((await cand.getCandidateContact(id)).ok).toBe(true); // owner always sees it
  });

  // Rule change in flight: contact unlocks only once the candidate ACCEPTS the 500k invitation.
  it('contact unlocks for that HR only after the candidate accepts the 500k (not on send, not after decline)', async () => {
    const w = new World();
    const { b: cand, id } = await sit(w, 'c', { contact: { kind: 'email', value: 'secret.person@example.com' } });
    const hr = await w.user('hr', 'hr');
    const hr2 = await w.user('hr2', 'hr');
    const viewer = await w.user('v', 'viewer');
    ripen(w);
    const inv = await hr.sendInvitation(id, MSG, 'hr@acme.vn');
    const inv2 = await hr2.sendInvitation(id, MSG, 'hr2@acme.vn');
    if (!inv.ok || !inv2.ok) throw new Error();
    expect(await hr.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    expect((await hr.getCandidate(id))?.me?.canSeeContact).toBe(false);
    await cand.respondInvitation(inv2.data.id, false, 'Chưa tiện');
    expect(await hr2.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    expect((await cand.respondInvitation(inv.data.id, true)).ok).toBe(true);
    expect(await hr.getCandidateContact(id)).toMatchObject({ ok: true, data: { value: 'secret.person@example.com' } });
    expect((await hr.getCandidate(id))?.me?.canSeeContact).toBe(true);
    expect(await hr2.getCandidateContact(id)).toMatchObject({ ok: false });
    expect(await viewer.getCandidateContact(id)).toMatchObject({ ok: false });
  });
});

describe('QA: reports (US-20, AC-20.2)', () => {
  it('repeat reports by the SAME user never hide; N-1 distinct reporters do not hide; the Nth does (N = reportsToHideSign)', async () => {
    const w = new World();
    const { id } = await sit(w, 'c');
    const roles = ['viewer', 'hr', 'candidate', 'viewer', 'hr', 'viewer'] as const;
    const reporters = [];
    for (const [i, role] of roles.entries()) reporters.push(await w.user(`r${i}`, role));
    ripen(w); // reporters must be old enough to count (security audit M2)
    const r1 = reporters[0];
    for (let i = 0; i < 6; i++) await r1.report(id, 'spam');
    expect((await r1.getCandidate(id))?.signState).toBe('ok');
    const N = LIMITS.reportsToHideSign;
    for (let i = 1; i < N - 1; i++) await reporters[i].report(id, 'other', 'ghi chú');
    expect((await r1.getCandidate(id))?.signState).toBe('ok'); // N-1 distinct reporters
    await reporters[N - 1].report(id, 'obscene');
    expect((await r1.getCandidate(id))?.signState).toBe('pending_review');
    expect((await r1.getCandidate(id))?.signText).toBeNull();
    const listed = (await r1.listCandidates()).find((c) => c.id === id)!;
    expect(listed.signState).toBe('pending_review');
    expect(listed.signText ?? null).toBeNull();
  });

  it('reporting is idempotent under concurrency (same user, 10 parallel reports count once)', async () => {
    const w = new World();
    const { id } = await sit(w, 'c');
    const r = await w.user('r', 'viewer');
    const res = await Promise.all(Array.from({ length: 10 }, () => r.report(id, 'spam')));
    expect(res.filter((x) => x.ok)).toHaveLength(1);
    expect((await r.getCandidate(id))?.signState).toBe('ok');
  });
});

describe('QA: fortune with a controlled clock (BR-Q1/Q2)', () => {
  it('is fixed within a VN day (even across tabs/devices) and uses the new day after 00:00 VN (17:00Z)', async () => {
    const w = new World();
    w.now = Date.parse('2026-11-04T00:00:00Z'); // 07:00 VN
    const a = await w.user('same', 'viewer');
    const aDevice2 = w.tab('same');
    const first = await a.getFortune();
    if (!first.ok) throw new Error();
    expect(first.data.day).toBe('2026-11-04');
    w.now = Date.parse('2026-11-04T16:59:59Z'); // 23:59:59 VN
    expect(await a.getFortune()).toEqual(first);
    expect(await aDevice2.getFortune()).toEqual(first);
    w.now = Date.parse('2026-11-04T17:00:00Z'); // 00:00:00 VN next day
    const next = await a.getFortune();
    if (!next.ok) throw new Error();
    expect(next.data.day).toBe('2026-11-05');
    expect(await aDevice2.getFortune()).toEqual(next); // other device agrees on the new day
  });

  it('across a week the same user gets more than one distinct fortune, and users differ on the same day', async () => {
    const w = new World();
    const a = await w.user('a', 'viewer');
    const ids = new Set<string>();
    for (let d = 0; d < 14; d++) {
      const r = await a.getFortune();
      if (r.ok) ids.add(selectFortune(r.data).id);
      w.days(1);
    }
    expect(ids.size).toBeGreaterThan(2);
    const day = ['2026-11-04'];
    const perUser = new Set(Array.from({ length: 30 }, (_, i) => selectFortune(drawFortuneDemo(`u${i}`, day[0])).id));
    expect(perUser.size).toBeGreaterThan(5);
  });
});

describe('QA: ranking / seats react to coins (AC-15, BR-Rank)', () => {
  it('xu from several HR push a candidate up the zone order; incense does not', async () => {
    const w = new World();
    const { b: cand, id } = await sit(w, 'c', { zone: 'backend' });
    const rank = async () => {
      const list = await cand.listCandidates();
      const plan = assignSeats(list.map((c) => toRanked(c, w.now)), undefined, w.now);
      return rankInZone(plan, id)!;
    };
    w.days(2); // newcomer boost is gone
    const base = await rank();
    const v = await w.user('v', 'viewer');
    await v.lightIncense(id);
    expect(await rank()).toBe(base); // incense is cosmetic
    for (let i = 0; i < 5; i++) {
      const hr = await w.user(`hr${i}`, 'hr', `HR ${i}`);
      await hr.dropGift(id, 'xu');
      w.advance(1100);
      await hr.dropGift(id, 'xu');
      w.advance(1100);
    }
    const after = await rank();
    expect(after).toBeLessThan(base);
  });

  it('hiding a candidate removes the seat for others (no gaps)', async () => {
    const w = new World();
    const { b: c1, id: id1 } = await sit(w, 'c1', { zone: 'qa' });
    const { id: id2 } = await sit(w, 'c2', { zone: 'qa' });
    const plan = (list: Awaited<ReturnType<typeof c1.listCandidates>>) => assignSeats(list.map((c) => toRanked(c, w.now)), undefined, w.now);
    const p1 = plan(await c1.listCandidates());
    const s2 = p1.seats.get(id2)!.seat;
    await c1.setMyCandidateStatus('hidden');
    const p2 = plan(await c1.listCandidates());
    expect(p2.seats.has(id1)).toBe(false);
    expect(p2.seats.get(id2)!.seat).toBeLessThan(s2);
  });
});

describe('QA: onboarding validation through the backend (AC-1.2, AC-1.3)', () => {
  const reg = (w: World, uid: string, displayName: string, role: 'hr' | 'candidate' | 'viewer', company?: string) =>
    w.tab(uid).register({ displayName, role, company, avatar: AVATAR });

  it('rejects empty, 1-char, 25-char, whitespace-only, zero-width-only and blocked names', async () => {
    const w = new World();
    for (const name of ['', ' ', '   ', 'a', 'x'.repeat(25), '​​​', 'địt mẹ mày', 'D.M']) {
      const r = await reg(w, `u-${w.seq++}`, name, 'viewer');
      expect(r.ok, `name ${JSON.stringify(name)}`).toBe(false);
      if (!r.ok) expect(r.field).toBe('display_name');
    }
  });

  it('accepts boundary names (2 and 24 chars), diacritics, emoji and RTL', async () => {
    const w = new World();
    for (const name of ['ab', 'a'.repeat(24), 'Nguyễn Thị Hồng Ánh', '😀😀', '🔥🔥🔥', 'مرحبا بالعالم', '日本語の名前']) {
      const r = await reg(w, `u-${w.seq++}`, name, 'viewer');
      expect(r.ok, `name ${JSON.stringify(name)}`).toBe(true);
    }
  });

  it('HR needs a 2..40 char company and others ignore it', async () => {
    const w = new World();
    expect(await reg(w, 'h1', 'Chị Lan', 'hr')).toMatchObject({ ok: false, field: 'company' });
    expect(await reg(w, 'h2', 'Chị Lan', 'hr', 'A')).toMatchObject({ ok: false, field: 'company' });
    expect(await reg(w, 'h3', 'Chị Lan', 'hr', 'C'.repeat(41))).toMatchObject({ ok: false, field: 'company' });
    expect(await reg(w, 'h4', 'Chị Lan', 'hr', 'địt mẹ corp')).toMatchObject({ ok: false });
    const ok = await reg(w, 'h5', 'Chị Lan', 'hr', 'AB');
    expect(ok.ok).toBe(true);
  });
});
