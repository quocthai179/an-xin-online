import { describe, expect, it } from 'vitest';
import { World, candInput, collect, sit, AVATAR } from './helpers';
import { LIMITS } from '@/lib/rules';

describe('DemoBackend: identity and seed', () => {
  it('seeds >= 40 sample candidates and has no user before register', async () => {
    const w = new World();
    const b = w.tab('u1');
    expect(await b.restore()).toBeNull();
    const list = await b.listCandidates();
    expect(list.length).toBeGreaterThanOrEqual(40);
    expect(list.every((c) => c.isSample)).toBe(true);
  });

  it('registers, validates and enforces the name-change cooldown', async () => {
    const w = new World();
    const b = w.tab('u1');
    expect(await b.register({ displayName: 'a', role: 'viewer', avatar: AVATAR })).toMatchObject({ ok: false, field: 'display_name' });
    expect(await b.register({ displayName: 'Lan', role: 'hr', avatar: AVATAR })).toMatchObject({ ok: false, field: 'company' });
    const ok = await b.register({ displayName: 'Lan', role: 'hr', company: 'ACME', avatar: AVATAR });
    expect(ok.ok && ok.data.profile.role).toBe('hr');
    // first rename is free (name_changed_at is null), the next one within 24 h is not
    expect((await b.register({ displayName: 'Lan 2', role: 'hr', company: 'ACME', avatar: AVATAR })).ok).toBe(true);
    expect(await b.register({ displayName: 'Lan 3', role: 'hr', company: 'ACME', avatar: AVATAR })).toMatchObject({
      ok: false, error: 'NAME_CHANGE_COOLDOWN',
    });
    w.days(1);
    expect((await b.register({ displayName: 'Lan 3', role: 'hr', company: 'ACME', avatar: AVATAR })).ok).toBe(true);
    expect((await b.restore())?.profile.displayName).toBe('Lan 3');
  });
});

describe('DemoBackend: candidate lifecycle', () => {
  it('creates, broadcasts, edits with zone cooldown, hides, re-sits and deletes', async () => {
    const w = new World();
    const viewer = await w.user('v', 'viewer');
    const seen = collect(viewer);
    const { b, id } = await sit(w, 'c1');
    expect(seen.street.map((e) => e.type)).toEqual(['candidate_upsert']);
    expect((await viewer.getCandidate(id))?.signText).toContain('Java');

    expect(await b.saveMyCandidate(candInput({ zone: 'qa' }))).toMatchObject({ ok: true });
    expect(await b.saveMyCandidate(candInput({ zone: 'design' }))).toMatchObject({ ok: false, error: 'ZONE_CHANGE_COOLDOWN' });

    expect(await b.setMyCandidateStatus('hidden')).toMatchObject({ ok: true });
    expect(await viewer.getCandidate(id)).toBeNull();
    expect((await viewer.listCandidates()).some((c) => c.id === id)).toBe(false);
    expect(await b.getCandidate(id)).not.toBeNull(); // owner still sees it
    expect(seen.street.at(-1)?.type).toBe('candidate_remove');

    w.days(1);
    expect(await b.setMyCandidateStatus('sitting')).toMatchObject({ ok: true });
    expect((await viewer.listCandidates()).some((c) => c.id === id)).toBe(true);

    expect(await b.deleteMyCandidate()).toMatchObject({ ok: true });
    expect(await viewer.getCandidate(id)).toBeNull();
  });

  it('rejects invalid / blocked / pii input and wrong roles', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    expect(await hr.saveMyCandidate(candInput())).toMatchObject({ ok: false, error: 'WRONG_ROLE' });
    const c = await w.user('c', 'candidate');
    expect(await c.saveMyCandidate(candInput({ signText: 'abc' }))).toMatchObject({ ok: false, field: 'sign_text' });
    expect(await c.saveMyCandidate(candInput({ signText: 'xin việc vcl nhé' }))).toMatchObject({ ok: false, error: 'BLOCKED_CONTENT' });
    expect(await c.saveMyCandidate(candInput({ bio: 'gọi 0912345678' }))).toMatchObject({ ok: false, error: 'PII_NOT_ALLOWED' });
    expect((await c.saveMyCandidate(candInput())).ok).toBe(true);
  });

  it('rate limits sign edits to 10 per hour', async () => {
    const w = new World();
    const { b } = await sit(w, 'c');
    for (let i = 0; i < LIMITS.signEditsPerHour; i++) expect((await b.saveMyCandidate(candInput({ title: `Dev ${i}` }))).ok).toBe(true);
    expect(await b.saveMyCandidate(candInput())).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
  });

  it('switching to a non-candidate role hides the sitting profile', async () => {
    const w = new World();
    const { b, id } = await sit(w, 'c');
    w.days(1);
    expect((await b.register({ displayName: 'Bạn c', role: 'viewer', avatar: AVATAR })).ok).toBe(true);
    const v = w.tab('x');
    expect(await v.getCandidate(id)).toBeNull();
  });
});

describe('DemoBackend: gifts', () => {
  it('HR gift: candidate gets a notification, both tabs get the street event, counters update', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr', 'Lan');
    const { b: cand, id } = await sit(w, 'c', {});
    const hrSeen = collect(hr);
    const cSeen = collect(cand);
    const r = await hr.dropGift(id, 'xu');
    expect(r).toMatchObject({ ok: true, data: { remainingToday: 9, remainingForCandidate: 1 } });
    expect(hrSeen.street.map((e) => e.type)).toEqual(['gift']);
    expect(cSeen.street.map((e) => e.type)).toEqual(['gift']);
    expect(cSeen.notifs).toHaveLength(1);
    expect(cSeen.notifs[0]).toMatchObject({ type: 'gift', payload: { kind: 'xu', giverName: 'Lan', giverCompany: 'ACME' } });
    expect(hrSeen.notifs).toHaveLength(0);
    const me = await cand.getMe();
    expect(me?.unread).toBe(1);
    expect(me?.candidate?.totals.xu).toBe(1);
    expect((await hr.getMe())?.quota.xuUsed).toBe(1);
    expect((await cand.listNotifications())[0].type).toBe('gift');
    await cand.markNotificationsRead();
    expect((await cand.getMe())?.unread).toBe(0);
  });

  it('error paths: role, self, per-candidate and daily limits, unavailable, unknown', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const viewer = await w.user('v', 'viewer');
    const { b: cand, id } = await sit(w, 'c');
    expect(await viewer.dropGift(id, 'xu')).toMatchObject({ ok: false, error: 'WRONG_ROLE' });
    expect((await viewer.dropGift(id, 'love')).ok).toBe(true);
    expect(await viewer.dropGift(id, 'love')).toMatchObject({ ok: false, error: 'LIMIT_PER_CANDIDATE_DAY' });
    expect(await cand.dropGift(id, 'love')).toMatchObject({ ok: false, error: 'SELF_ACTION' });
    expect(await hr.dropGift('nope', 'xu')).toMatchObject({ ok: false, error: 'NOT_FOUND' });

    expect((await hr.dropGift(id, 'xu')).ok).toBe(true);
    w.advance(1500);
    expect((await hr.dropGift(id, 'xu')).ok).toBe(true);
    w.advance(1500);
    expect(await hr.dropGift(id, 'xu')).toMatchObject({ ok: false, error: 'LIMIT_PER_CANDIDATE_DAY' });

    const samples = (await hr.listCandidates()).filter((c) => c.isSample);
    let okCount = 2;
    for (const s of samples.slice(0, 8)) {
      w.advance(1500);
      const r = await hr.dropGift(s.id, 'xu');
      if (r.ok) okCount++;
      if (okCount === LIMITS.xu.perDay) break;
    }
    w.advance(1500);
    expect(await hr.dropGift(samples[10].id, 'xu')).toMatchObject({ ok: false, error: 'LIMIT_DAILY' });
    expect((await hr.getMe())?.quota.xuUsed).toBe(10);

    w.days(1);
    expect((await hr.getMe())?.quota.xuUsed).toBe(0);
    expect((await hr.dropGift(id, 'xu')).ok).toBe(true);

    await cand.setMyCandidateStatus('hidden');
    w.advance(1500);
    expect(await hr.dropGift(id, 'xu')).toMatchObject({ ok: false, error: 'CANDIDATE_UNAVAILABLE' });
  });

  it('20 concurrent drops never exceed 2 per candidate or 10 per day (BR-C5)', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const { id } = await sit(w, 'c');
    const results = await Promise.all(Array.from({ length: 20 }, () => hr.dropGift(id, 'xu')));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect((await hr.getMe())?.quota.xuUsed).toBe(2);
    expect((await hr.getCandidate(id))?.totals.xu).toBe(2);

    w.advance(2000);
    const samples = (await hr.listCandidates()).filter((c) => c.isSample).slice(0, 15);
    const rs = await Promise.all(samples.map((s) => hr.dropGift(s.id, 'xu')));
    expect(rs.filter((r) => r.ok).length).toBeLessThanOrEqual(8);
    expect((await hr.getMe())!.quota.xuUsed).toBeLessThanOrEqual(10);
  });

  it('rate-limits more than 5 ops per second', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const samples = (await hr.listCandidates()).filter((c) => c.isSample).slice(0, 7);
    const rs = [];
    for (const s of samples) rs.push(await hr.dropGift(s.id, 'xu'));
    expect(rs.filter((r) => !r.ok && r.error === 'RATE_LIMITED')).toHaveLength(2);
  });

  it('ticker name respects hideFromTicker', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const { id } = await sit(w, 'c', { hideFromTicker: true });
    const seen = collect(hr);
    await hr.dropGift(id, 'xu');
    expect(seen.street[0]).toMatchObject({ type: 'gift', candidate: { name: 'một bạn ẩn danh' } });
  });
});

describe('DemoBackend: invitations, privacy and offers', () => {
  it('contact is locked until an invitation exists; sample candidates cannot be invited', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr', 'Lan');
    const { b: cand, id } = await sit(w, 'c');
    expect(await hr.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    expect((await hr.getCandidate(id))?.me?.canSeeContact).toBe(false);
    const sample = (await hr.listCandidates()).find((c) => c.isSample)!;
    expect(await hr.sendInvitation(sample.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn')).toMatchObject({ ok: false, error: 'SAMPLE_CANDIDATE' });

    const cSeen = collect(cand);
    const inv = await hr.sendInvitation(id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn');
    expect(inv.ok).toBe(true);
    expect(cSeen.notifs[0]).toMatchObject({ type: 'invite_received', payload: { hrContact: 'hr@acme.vn' } });
    expect(await hr.getCandidateContact(id)).toMatchObject({ ok: true, data: { value: 'me@example.com' } });
    expect((await cand.getCandidateContact(id)).ok).toBe(true);
    const stranger = await w.user('s', 'hr', 'Stranger');
    expect(await stranger.getCandidateContact(id)).toMatchObject({ ok: false, error: 'CONTACT_LOCKED' });
    expect((await hr.getMe())?.quota.inviteUsed).toBe(1);
  });

  it('validation, duplicates, cooldown, daily and per-candidate limits, expiry', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const c1 = await sit(w, 'c1');
    expect(await hr.sendInvitation(c1.id, 'ngắn', 'hr@acme.vn')).toMatchObject({ ok: false, field: 'message' });
    expect(await hr.sendInvitation(c1.id, 'Mời bạn phỏng vấn nhé', 'x')).toMatchObject({ ok: false, field: 'hr_contact' });
    const first = await hr.sendInvitation(c1.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn');
    expect(first.ok).toBe(true);
    expect(await hr.sendInvitation(c1.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn')).toMatchObject({ error: 'INVITE_ALREADY_OPEN' });
    if (!first.ok) throw new Error();
    expect((await c1.b.respondInvitation(first.data.id, false, 'Chưa tiện')).ok).toBe(true);
    expect(await hr.sendInvitation(c1.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn')).toMatchObject({ error: 'INVITE_COOLDOWN' });

    const c2 = await sit(w, 'c2');
    const c3 = await sit(w, 'c3');
    const c4 = await sit(w, 'c4');
    expect((await hr.sendInvitation(c2.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn')).ok).toBe(true);
    expect((await hr.sendInvitation(c3.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn')).ok).toBe(true);
    expect(await hr.sendInvitation(c4.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn')).toMatchObject({ error: 'LIMIT_DAILY' });

    w.days(8); // cooldown over, daily reset, first invite long gone
    const again = await hr.sendInvitation(c1.id, 'Mời lại bạn nhé nhé', 'hr@acme.vn');
    expect(again.ok).toBe(true);
    // c2's invitation sent 8 days ago is still open (14-day expiry)
    expect((await hr.getCandidate(c2.id))?.me?.openInvite).toBe(true);
    w.days(7);
    expect((await hr.getCandidate(c2.id))?.me?.openInvite).toBe(false);
    if (!again.ok) throw new Error();
    w.days(8);
    expect(await c1.b.respondInvitation(again.data.id, true)).toMatchObject({ ok: false, error: 'EXPIRED' });
  });

  it('caps open invitations per candidate at 5', async () => {
    const w = new World();
    const c = await sit(w, 'c');
    for (let i = 0; i < 5; i++) {
      const hr = await w.user(`hr${i}`, 'hr', `HR ${i}`);
      expect((await hr.sendInvitation(c.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn')).ok).toBe(true);
    }
    const hr6 = await w.user('hr6', 'hr');
    expect(await hr6.sendInvitation(c.id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn')).toMatchObject({ error: 'CANDIDATE_FULL' });
  });

  it('full flow: xu, 500k, accept, bao tron, accept -> placed', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr', 'Lan', 'ACME');
    const other = await w.user('hr2', 'hr', 'Minh', 'Other Co');
    const { b: cand, id } = await sit(w, 'c');
    const hrSeen = collect(hr);
    const otherSeen = collect(other);
    const cSeen = collect(cand);

    expect(await hr.sendOffer(id, { position: 'Dev', package: '30tr', showCompany: true })).toMatchObject({ error: 'NEED_ACCEPTED_INVITE' });
    await hr.dropGift(id, 'xu');
    const inv = await hr.sendInvitation(id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn');
    const inv2 = await other.sendInvitation(id, 'Bên mình cũng quan tâm bạn', 'hr2@other.vn');
    if (!inv.ok || !inv2.ok) throw new Error();
    expect((await cand.getCandidate(id))?.openInvites).toBe(2);

    expect((await cand.respondInvitation(inv.data.id, true)).ok).toBe(true);
    expect(hrSeen.notifs.at(-1)).toMatchObject({ type: 'invite_responded', payload: { accepted: true } });
    expect(await cand.respondInvitation(inv.data.id, true)).toMatchObject({ error: 'NOT_PENDING' });
    expect((await hr.getCandidate(id))?.me?.acceptedInviteId).toBe(inv.data.id);
    expect(await hr.sendOffer(id, { position: 'x'.repeat(61), package: '30tr', showCompany: true })).toMatchObject({ field: 'position' });

    const offer = await hr.sendOffer(id, { position: 'Senior Dev', package: '40tr + thưởng', message: 'Chào mừng!', showCompany: true });
    expect(offer.ok).toBe(true);
    if (!offer.ok) throw new Error();
    expect(cSeen.notifs.at(-1)).toMatchObject({ type: 'offer_received', payload: { position: 'Senior Dev' } });
    expect((await hr.getMe())?.quota.offersOpen).toBe(1);
    expect((await cand.getCandidate(id))?.openOffer).toBe(true);
    expect(await hr.sendOffer(id, { position: 'Dev', package: '30tr', showCompany: true })).toMatchObject({ error: 'OFFER_ALREADY_OPEN' });

    const done = await cand.respondOffer(offer.data.id, true, { showCompany: true });
    expect(done.ok).toBe(true);
    const placed = hrSeen.street.find((e) => e.type === 'placed');
    expect(placed).toMatchObject({ type: 'placed', company: 'ACME', candidate: { status: 'placed', placedCompany: 'ACME' } });
    expect(otherSeen.notifs.at(-1)).toMatchObject({ type: 'invite_closed' });
    expect(hrSeen.notifs.at(-1)).toMatchObject({ type: 'offer_responded', payload: { accepted: true } });

    const after = await hr.getCandidate(id);
    expect(after?.status).toBe('placed');
    expect(after?.placedCompany).toBe('ACME');
    expect((await other.dropGift(id, 'xu')).ok).toBe(false);
    expect((await w.tab('late').listCandidates()).find((c) => c.id === id)?.status).toBe('placed');
    expect((await other.listMyInvitations())[0].status).toBe('closed');

    // sit again: placed fields reset
    expect((await cand.setMyCandidateStatus('sitting')).ok).toBe(true);
    expect((await hr.getCandidate(id))?.status).toBe('sitting');
    expect((await hr.getCandidate(id))?.placedCompany).toBeNull();
  });

  it('company is hidden unless both sides consent (BR-O4)', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr', 'Lan', 'ACME');
    const { b: cand, id } = await sit(w, 'c');
    const inv = await hr.sendInvitation(id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn');
    if (!inv.ok) throw new Error();
    await cand.respondInvitation(inv.data.id, true);
    const offer = await hr.sendOffer(id, { position: 'Dev', package: '30tr', showCompany: true });
    if (!offer.ok) throw new Error();
    await cand.respondOffer(offer.data.id, true, { showCompany: false });
    expect((await hr.getCandidate(id))?.placedCompany).toBeNull();
  });

  it('declined offers keep the candidate sitting; offers expire after 7 days', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const { b: cand, id } = await sit(w, 'c');
    const inv = await hr.sendInvitation(id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn');
    if (!inv.ok) throw new Error();
    await cand.respondInvitation(inv.data.id, true);
    const o1 = await hr.sendOffer(id, { position: 'Dev', package: '30tr', showCompany: false });
    if (!o1.ok) throw new Error();
    expect((await cand.respondOffer(o1.data.id, false)).ok).toBe(true);
    expect((await hr.getCandidate(id))?.status).toBe('sitting');
    const o2 = await hr.sendOffer(id, { position: 'Dev', package: '35tr', showCompany: false });
    if (!o2.ok) throw new Error();
    w.days(8);
    expect(await cand.respondOffer(o2.data.id, true)).toMatchObject({ ok: false, error: 'EXPIRED' });
    expect((await hr.getCandidate(id))?.status).toBe('sitting');
  });

  it('limits HR to 3 open offers', async () => {
    const w = new World();
    const hr = await w.user('hr', 'hr');
    const cs = [];
    for (const n of ['a', 'b', 'c', 'd']) cs.push(await sit(w, `cand-${n}`));
    for (let i = 0; i < 4; i++) {
      if (i === 3) w.days(1);
      const inv = await hr.sendInvitation(cs[i].id, 'Mời bạn phỏng vấn nhé', 'hr@acme.vn');
      if (!inv.ok) throw new Error(String(inv.error));
      await cs[i].b.respondInvitation(inv.data.id, true);
      const r = await hr.sendOffer(cs[i].id, { position: 'Dev', package: '30tr', showCompany: false });
      if (i < 3) expect(r.ok).toBe(true);
      else expect(r).toMatchObject({ ok: false, error: 'HR_OFFER_LIMIT' });
    }
  });
});

describe('DemoBackend: temple, fortune, reports', () => {
  it('incense once per day, notifies the target anonymously, counts for the temple', async () => {
    const w = new World();
    const v = await w.user('v', 'viewer', 'Khach');
    const { b: cand, id } = await sit(w, 'c');
    const cSeen = collect(cand);
    const vSeen = collect(v);
    expect(await v.lightIncense(id)).toMatchObject({ ok: true, data: { incenseToday: 1 } });
    expect(cSeen.notifs[0]).toMatchObject({ type: 'incense_for_you', payload: {} });
    expect(vSeen.street[0]).toMatchObject({ type: 'incense', name: 'Khach' });
    expect(await v.lightIncense(id)).toMatchObject({ ok: false, error: 'ALREADY_DONE' });
    expect((await v.getMe())?.quota.incenseDone).toBe(true);
    expect((await cand.lightIncense()).ok).toBe(true); // for self: no notification to self
    expect(cSeen.notifs).toHaveLength(1);
    expect(await v.getTempleStats()).toEqual({ incenseToday: 2 });
    w.days(1);
    expect((await v.lightIncense()).ok).toBe(true);
    expect((await v.getCandidate(id))?.totals.incense).toBe(2); // one from v, one self-incense
  });

  it('fortune is stable per user and day', async () => {
    const w = new World();
    const a = await w.user('a', 'viewer');
    const b = await w.user('b', 'viewer');
    const f1 = await a.getFortune();
    const f2 = await a.getFortune();
    expect(f1).toEqual(f2);
    w.days(1);
    const f3 = await a.getFortune();
    expect(f3.ok && f3.data.day).toBe('2026-11-05');
    expect(await b.getFortune()).toMatchObject({ ok: true });
  });

  it('3 reports hide the sign and notify the owner; one report per reporter', async () => {
    const w = new World();
    const { b: cand, id } = await sit(w, 'c');
    const cSeen = collect(cand);
    const reporters = [];
    for (let i = 0; i < 3; i++) reporters.push(await w.user(`r${i}`, 'viewer'));
    expect((await reporters[0].report(id, 'spam')).ok).toBe(true);
    expect(await reporters[0].report(id, 'spam')).toMatchObject({ error: 'ALREADY_REPORTED' });
    expect(await cand.report(id, 'spam')).toMatchObject({ error: 'SELF_ACTION' });
    expect(await reporters[1].report(id, 'bogus' as never)).toMatchObject({ error: 'VALIDATION' });
    expect((await reporters[0].getCandidate(id))?.signText).not.toBeNull();
    await reporters[1].report(id, 'obscene', 'tục');
    await reporters[2].report(id, 'harassment');
    const c = await reporters[0].getCandidate(id);
    expect(c?.signState).toBe('pending_review');
    expect(c?.signText).toBeNull();
    expect(cSeen.notifs.map((n) => n.type)).toContain('sign_hidden');
    expect((await reporters[0].getCandidate(id))?.me?.reported).toBe(true);
  });
});

describe('DemoBackend: two tabs share data', () => {
  it('a tab created later sees data written by another tab', async () => {
    const w = new World();
    const { id } = await sit(w, 'c');
    const late = w.tab('late');
    expect((await late.listCandidates()).some((c) => c.id === id)).toBe(true);
  });
});
