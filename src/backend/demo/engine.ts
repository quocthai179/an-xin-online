// "Stored procedures" in TS. Same check order and error codes as supabase/migrations/0001_init.sql.
import type {
  Actor, AppNotification, AvatarSpec, CandidateCard, CandidateDetail, CandidateInput, CandRef, Contact, ErrorCode,
  FortuneDraw, GiftKind, Invitation, Me, NotificationType, Offer, Profile, ReportReason, Result, StreetEvent,
} from '../types';
import { DAY_MS, HOUR_MS, LIMITS } from '@/lib/rules';
import { startOfIsoWeekVn, vnDay } from '@/lib/time';
import { decayedSums, profileCompleteness } from '@/lib/ranking';
import { clean } from '@/lib/moderation/normalize';
import {
  checkGift, checkIncense, checkInvite, checkOffer, checkReport, checkRespond, type Check,
} from '@/lib/limits';
import { validateCandidateInput } from '@/lib/validation/candidate';
import { validateProfileInput } from '@/lib/validation/profile';
import { drawFortuneDemo } from '@/lib/fortune';
import { fnv1a32 } from '@/lib/hash';
import { topicInbox, TOPIC_STREET } from '../topics';
import type { CandRow, DemoDb, InvRow, NotifRow, OfferRow, UserRow } from './db';

export interface Emit {
  topic: string;
  event: string;
  payload: unknown;
}
export interface Ctx {
  now: number;
  uid: string | null;
  newId: () => string;
}
export interface Out<T> {
  res: Result<T>;
  emits: Emit[];
}

const iso = (ms: number) => new Date(ms).toISOString();
const isoOrNull = (ms: number | null) => (ms === null ? null : iso(ms));

function done<T>(data: T, emits: Emit[] = []): Out<T> {
  return { res: { ok: true, data }, emits };
}
function fail<T = never>(c: NonNullable<Check> | { error: ErrorCode; field?: string; retryAfterSec?: number }, emits: Emit[] = []): Out<T> {
  const r: Result<T> = { ok: false, error: c.error };
  if (c.field) r.field = c.field;
  if ('retryAfterSec' in c && c.retryAfterSec) r.retryAfterSec = c.retryAfterSec;
  return { res: r, emits };
}

/** Fixed-window counter (mirror of private.hit). Returns true while within max. */
export function hit(db: DemoDb, key: string, windowMs: number, max: number, now: number): boolean {
  const bucket = Math.floor(now / windowMs) * windowMs;
  const cur = db.rate[key];
  if (!cur || cur.bucket !== bucket) db.rate[key] = { bucket, n: 1 };
  else cur.n += 1;
  for (const k of Object.keys(db.rate)) if (db.rate[k].bucket < now - 2 * DAY_MS) delete db.rate[k];
  return db.rate[key].n <= max;
}

function street(e: StreetEvent): Emit {
  return { topic: TOPIC_STREET, event: e.type, payload: e };
}

function notify(db: DemoDb, ctx: Ctx, userId: string | null, type: NotificationType, payload: Record<string, unknown>): Emit[] {
  if (!userId) return [];
  const row: NotifRow = { id: String(++db.seq), userId, type, payload, createdAt: ctx.now, readAt: null };
  db.notifications.push(row);
  return [{ topic: topicInbox(userId), event: 'notification', payload: notifDto(row) }];
}

function notifDto(n: NotifRow): AppNotification {
  return { id: n.id, type: n.type, payload: n.payload, createdAt: iso(n.createdAt), readAt: isoOrNull(n.readAt) };
}

// ---------- mappers ----------
export function profileDto(u: UserRow): Profile {
  return { id: u.id, displayName: u.displayName, role: u.role, company: u.company, avatar: u.avatar, createdAt: iso(u.createdAt) };
}

function tickerName(c: CandRow) {
  return c.hideFromTicker ? 'một bạn ẩn danh' : c.displayName;
}
const actorOf = (u: UserRow): Actor => ({ id: u.id, name: u.displayName, role: u.role, company: u.company });
const refOf = (c: CandRow): CandRef => ({ id: c.id, name: tickerName(c), zone: c.zone });

export function cardOf(db: DemoDb, c: CandRow, now: number): CandidateCard {
  const today = vnDay(now);
  const buckets = db.daily[c.id] ?? [];
  const week = startOfIsoWeekVn(now);
  return {
    id: c.id,
    slug: c.slug,
    displayName: c.displayName,
    zone: c.zone,
    signText: c.signState === 'ok' ? c.signText : null,
    signState: c.signState,
    title: c.title,
    yearsExp: c.yearsExp,
    skills: c.skills,
    status: c.status === 'placed' ? 'placed' : 'sitting',
    isSample: c.isSample,
    avatar: c.avatar,
    sittingSince: iso(c.sittingSince),
    createdAt: iso(c.createdAt),
    placedAt: isoOrNull(c.placedAt),
    placedCompany: c.placedCompany,
    totals: { xu: c.xuTotal, love: c.loveTotal, invites: c.inviteTotal, incense: c.incenseTotal },
    completeness: profileCompleteness(c),
    decayed: decayedSums(buckets, today),
    xuWeek: buckets.filter((b) => b.day >= week).reduce((s, b) => s + b.xu, 0),
    xuToday: buckets.find((b) => b.day === today)?.xu ?? 0,
  };
}

function lightCard(db: DemoDb, c: CandRow, now: number): Omit<CandidateCard, 'decayed' | 'xuWeek' | 'xuToday'> {
  const { decayed: _d, xuWeek: _w, xuToday: _t, ...rest } = cardOf(db, c, now);
  void _d; void _w; void _t;
  return rest;
}

function invDto(i: InvRow): Invitation {
  return {
    id: i.id, hrId: i.hrId, candidateId: i.candidateId, hrName: i.hrName, hrCompany: i.hrCompany, message: i.message,
    hrContact: i.hrContact, status: i.status, responseReason: i.responseReason, createdAt: iso(i.createdAt),
    respondedAt: isoOrNull(i.respondedAt), expiresAt: iso(i.expiresAt),
  };
}
function offerDto(o: OfferRow): Offer {
  return {
    id: o.id, hrId: o.hrId, candidateId: o.candidateId, invitationId: o.invitationId, hrName: o.hrName,
    hrCompany: o.hrCompany, position: o.position, package: o.package, message: o.message, hrShowCompany: o.hrShowCompany,
    status: o.status, createdAt: iso(o.createdAt), expiresAt: iso(o.expiresAt),
  };
}

// ---------- helpers ----------
const candOfUser = (db: DemoDb, uid: string) => Object.values(db.candidates).find((c) => c.userId === uid);

/** Lazy expiry (private.expire_stale). */
export function expireStale(db: DemoDb, now: number, candidateId: string | null, hrId: string | null): void {
  for (const i of Object.values(db.invitations)) {
    if (i.status === 'pending' && i.expiresAt < now && (i.candidateId === candidateId || i.hrId === hrId)) i.status = 'expired';
  }
  for (const o of Object.values(db.offers)) {
    if (o.status === 'pending' && o.expiresAt < now && (o.candidateId === candidateId || o.hrId === hrId)) o.status = 'expired';
  }
}

function bumpDaily(db: DemoDb, candidateId: string, col: 'xu' | 'love' | 'invites' | 'invitesAccepted', now: number) {
  const day = vnDay(now);
  const list = (db.daily[candidateId] ??= []);
  let b = list.find((x) => x.day === day);
  if (!b) {
    b = { day, xu: 0, love: 0, invites: 0, invitesAccepted: 0 };
    list.push(b);
  }
  b[col] += 1;
}

function slugFor(id: string): string {
  return (fnv1a32(id).toString(16).padStart(8, '0') + fnv1a32(id + 'x').toString(16).padStart(8, '0')).slice(0, 10);
}

// ---------- identity ----------
export function upsertProfile(
  db: DemoDb,
  ctx: Ctx,
  input: { displayName: string; role: string; company?: string | null; avatar: AvatarSpec },
): Out<UserRow> {
  const uid = ctx.uid;
  if (!uid) return fail({ error: 'UNAUTHENTICATED' });
  const v = validateProfileInput(input);
  if (!v.ok) return fail({ error: v.error, field: v.field });
  const old = db.users[uid];
  if (old && old.displayName !== v.value.displayName && old.nameChangedAt !== null &&
      old.nameChangedAt > ctx.now - LIMITS.nameChangeHours * HOUR_MS) {
    return fail({ error: 'NAME_CHANGE_COOLDOWN', field: 'display_name' });
  }
  const emits: Emit[] = [];
  const row: UserRow = {
    id: uid,
    displayName: v.value.displayName,
    role: v.value.role,
    company: v.value.company,
    avatar: input.avatar,
    createdAt: old?.createdAt ?? ctx.now,
    nameChangedAt: old && old.displayName !== v.value.displayName ? ctx.now : (old?.nameChangedAt ?? null),
    isBot: old?.isBot,
  };
  db.users[uid] = row;
  const cand = candOfUser(db, uid);
  if (cand) {
    cand.displayName = row.displayName;
    cand.avatar = row.avatar;
    cand.updatedAt = ctx.now;
    if (row.role !== 'candidate' && cand.status === 'sitting') {
      cand.status = 'hidden'; // A3: role switch hides the profile
      emits.push(street({ type: 'candidate_remove', id: cand.id, at: iso(ctx.now) }));
    } else if (cand.status === 'sitting') {
      emits.push(street({ type: 'candidate_upsert', candidate: lightCard(db, cand, ctx.now), at: iso(ctx.now) }));
    }
  }
  return done(row, emits);
}

// ---------- candidate profile ----------
export function upsertMyCandidate(db: DemoDb, ctx: Ctx, input: CandidateInput): Out<{ id: string; slug: string }> {
  const uid = ctx.uid;
  if (!uid) return fail({ error: 'UNAUTHENTICATED' });
  const prof = db.users[uid];
  if (!prof) return fail({ error: 'NO_PROFILE' });
  if (prof.role !== 'candidate') return fail({ error: 'WRONG_ROLE' });
  const v = validateCandidateInput(input);
  if (!v.ok) return fail({ error: v.error, field: v.field });
  const val = v.value;
  const old = candOfUser(db, uid);
  if (old && old.zone !== val.zone && old.zoneChangedAt !== null && old.zoneChangedAt > ctx.now - LIMITS.zoneChangeHours * HOUR_MS) {
    return fail({ error: 'ZONE_CHANGE_COOLDOWN', field: 'zone' });
  }
  if (!old) {
    if (!hit(db, `cand_create:${uid}`, 10 * 60_000, LIMITS.profileCreatePer10Min, ctx.now)) {
      return fail({ error: 'RATE_LIMITED', retryAfterSec: 600 });
    }
  } else if (!hit(db, `cand_edit:${uid}`, HOUR_MS, LIMITS.signEditsPerHour, ctx.now)) {
    return fail({ error: 'RATE_LIMITED', retryAfterSec: 3600 });
  }
  let c: CandRow;
  if (!old) {
    const id = ctx.newId();
    c = {
      id, userId: uid, slug: slugFor(id), isSample: false, displayName: prof.displayName, zone: val.zone,
      signText: val.signText, title: val.title, yearsExp: val.yearsExp, skills: val.skills,
      salaryMin: val.salaryMin ?? null, salaryMax: val.salaryMax ?? null, salaryNegotiable: val.salaryNegotiable,
      city: val.city ?? null, workModes: val.workModes, bio: val.bio ?? null, avatar: prof.avatar, status: 'sitting',
      signState: 'ok', hideFromTicker: val.hideFromTicker, showSalaryOnCard: val.showSalaryOnCard,
      sittingSince: ctx.now, zoneChangedAt: null, placedAt: null, placedCompany: null, xuTotal: 0, loveTotal: 0,
      inviteTotal: 0, incenseTotal: 0, reportCount: 0, createdAt: ctx.now, updatedAt: ctx.now,
    };
    db.candidates[id] = c;
  } else {
    c = old;
    if (c.zone !== val.zone) c.zoneChangedAt = ctx.now;
    Object.assign(c, {
      zone: val.zone, signText: val.signText, title: val.title, yearsExp: val.yearsExp, skills: val.skills,
      salaryMin: val.salaryMin ?? null, salaryMax: val.salaryMax ?? null, salaryNegotiable: val.salaryNegotiable,
      city: val.city ?? null, workModes: val.workModes, bio: val.bio ?? null, hideFromTicker: val.hideFromTicker,
      showSalaryOnCard: val.showSalaryOnCard, updatedAt: ctx.now,
    });
  }
  db.contacts[c.id] = val.contact;
  const emits = c.status === 'sitting'
    ? [street({ type: 'candidate_upsert', candidate: lightCard(db, c, ctx.now), at: iso(ctx.now) })]
    : [];
  return done({ id: c.id, slug: c.slug }, emits);
}

export function setMyCandidateStatus(db: DemoDb, ctx: Ctx, s: 'sitting' | 'hidden'): Out<{ status: string }> {
  if (!ctx.uid) return fail({ error: 'UNAUTHENTICATED' });
  if (s !== 'sitting' && s !== 'hidden') return fail({ error: 'VALIDATION', field: 'status' });
  const c = candOfUser(db, ctx.uid);
  if (!c) return fail({ error: 'NOT_FOUND' });
  if (s === 'sitting' && c.status !== 'sitting') {
    c.sittingSince = ctx.now;
    c.placedAt = null;
    c.placedCompany = null;
  }
  c.status = s;
  c.updatedAt = ctx.now;
  const at = iso(ctx.now);
  return done(
    { status: c.status },
    [s === 'sitting' ? street({ type: 'candidate_upsert', candidate: lightCard(db, c, ctx.now), at }) : street({ type: 'candidate_remove', id: c.id, at })],
  );
}

export function deleteMyCandidate(db: DemoDb, ctx: Ctx): Out<void> {
  if (!ctx.uid) return fail({ error: 'UNAUTHENTICATED' });
  const c = candOfUser(db, ctx.uid);
  if (!c) return fail({ error: 'NOT_FOUND' });
  delete db.candidates[c.id];
  delete db.contacts[c.id];
  delete db.daily[c.id];
  db.gifts = db.gifts.filter((g) => g.candidateId !== c.id);
  db.reports = db.reports.filter((r) => r.candidateId !== c.id);
  for (const [k, i] of Object.entries(db.invitations)) if (i.candidateId === c.id) delete db.invitations[k];
  for (const [k, o] of Object.entries(db.offers)) if (o.candidateId === c.id) delete db.offers[k];
  return done(undefined, [street({ type: 'candidate_remove', id: c.id, at: iso(ctx.now) })]);
}

// ---------- reads ----------
export function listCandidates(db: DemoDb, now: number): CandidateCard[] {
  return Object.values(db.candidates)
    .filter((c) => c.status === 'sitting' || c.status === 'placed')
    .sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1))
    .map((c) => cardOf(db, c, now));
}

export function getCandidate(db: DemoDb, uid: string | null, key: string, now: number): CandidateDetail | null {
  const c = Object.values(db.candidates).find((x) => x.slug === key || x.id === key);
  if (!c || (c.status === 'hidden' && c.userId !== uid)) return null;
  const today = vnDay(now);
  let me: CandidateDetail['me'] = null;
  if (uid) {
    const mine = db.gifts.filter((g) => g.giverId === uid && g.candidateId === c.id && g.day === today);
    const invs = Object.values(db.invitations).filter((i) => i.hrId === uid && i.candidateId === c.id);
    const accepted = invs.filter((i) => i.status === 'accepted').sort((a, b) => b.createdAt - a.createdAt)[0];
    me = {
      isMine: c.userId === uid,
      xuToday: mine.filter((g) => g.kind === 'xu').length,
      loveToday: mine.filter((g) => g.kind === 'love').length,
      lastInviteAt: invs.length ? iso(Math.max(...invs.map((i) => i.createdAt))) : null,
      openInvite: invs.some((i) => i.status === 'pending' && i.expiresAt > now),
      acceptedInviteId: accepted?.id ?? null,
      canSeeContact: c.userId === uid || invs.length > 0,
      reported: db.reports.some((r) => r.reporterId === uid && r.candidateId === c.id),
    };
  }
  const invsOpen = Object.values(db.invitations).filter((i) => i.candidateId === c.id && i.status === 'pending' && i.expiresAt > now);
  return {
    ...cardOf(db, c, now),
    salaryMin: c.salaryMin,
    salaryMax: c.salaryMax,
    salaryNegotiable: c.salaryNegotiable,
    showSalaryOnCard: c.showSalaryOnCard,
    hideFromTicker: c.hideFromTicker,
    city: c.city,
    workModes: c.workModes,
    bio: c.bio,
    openOffer: Object.values(db.offers).some((o) => o.candidateId === c.id && o.status === 'pending' && o.expiresAt > now),
    openInvites: invsOpen.length,
    me,
  };
}

export function getCandidateContact(db: DemoDb, uid: string | null, candidateId: string): Result<Contact> {
  if (!uid) return { ok: false, error: 'UNAUTHENTICATED' };
  const c = db.candidates[candidateId];
  if (!c) return { ok: false, error: 'NOT_FOUND' };
  if (c.userId !== uid && !Object.values(db.invitations).some((i) => i.hrId === uid && i.candidateId === candidateId)) {
    return { ok: false, error: 'CONTACT_LOCKED' }; // BR-Privacy
  }
  const contact = db.contacts[candidateId];
  if (!contact) return { ok: false, error: 'NOT_FOUND' };
  return { ok: true, data: contact };
}

export function getMe(db: DemoDb, uid: string | null, now: number): Me | null {
  if (!uid) return null;
  const u = db.users[uid];
  if (!u) return null;
  const today = vnDay(now);
  const c = candOfUser(db, uid);
  const detail = c ? getCandidate(db, uid, c.id, now) : null;
  const contact = c ? db.contacts[c.id] : undefined;
  return {
    profile: profileDto(u),
    candidate: detail && contact ? { ...detail, contact } : null,
    quota: {
      day: today,
      xuUsed: db.gifts.filter((g) => g.giverId === uid && g.kind === 'xu' && g.day === today).length,
      loveUsed: db.gifts.filter((g) => g.giverId === uid && g.kind === 'love' && g.day === today).length,
      inviteUsed: Object.values(db.invitations).filter((i) => i.hrId === uid && i.day === today).length,
      offersOpen: Object.values(db.offers).filter((o) => o.hrId === uid && o.status === 'pending' && o.expiresAt > now).length,
      incenseDone: db.incense.some((x) => x.userId === uid && x.day === today),
    },
    unread: db.notifications.filter((n) => n.userId === uid && n.readAt === null).length,
  };
}

export function templeStats(db: DemoDb, now: number): { incenseToday: number } {
  const today = vnDay(now);
  return { incenseToday: db.incense.filter((x) => x.day === today).length };
}

// ---------- gifts ----------
export function dropGift(
  db: DemoDb, ctx: Ctx, candidateId: string, kind: GiftKind,
): Out<{ giftId: string; remainingToday: number; remainingForCandidate: number }> {
  const uid = ctx.uid;
  if (!uid) return fail({ error: 'UNAUTHENTICATED' });
  const prof = db.users[uid];
  const cand = db.candidates[candidateId];
  const today = vnDay(ctx.now);
  const base = {
    hasProfile: !!prof, role: prof?.role ?? 'viewer', kind, candidateFound: !!cand, candidateStatus: cand?.status,
    isSelf: !!cand && cand.userId === uid, opsLastSecond: 0, pairToday: 0, dayToday: 0,
  } as const;
  const early = checkGift({ ...base });
  if (early) return fail(early);
  const mine = db.gifts.filter((g) => g.giverId === uid && g.kind === kind && g.day === today);
  const pair = mine.filter((g) => g.candidateId === candidateId).length;
  const ops = hit(db, `gift_s:${uid}`, 1000, LIMITS.giftOpsPerSecond, ctx.now) ? 1 : LIMITS.giftOpsPerSecond + 1;
  const late = checkGift({ ...base, opsLastSecond: ops, pairToday: pair, dayToday: mine.length });
  if (late) return fail(late.error === 'RATE_LIMITED' ? { ...late, retryAfterSec: 1 } : late);

  const rule = LIMITS[kind];
  const id = ++db.seq;
  db.gifts.push({ id, giverId: uid, candidateId, kind, day: today, at: ctx.now });
  bumpDaily(db, candidateId, kind, ctx.now);
  if (kind === 'xu') cand.xuTotal += 1;
  else cand.loveTotal += 1;
  const emits: Emit[] = [
    street({ type: 'gift', id: String(id), kind, giver: actorOf(prof), candidate: refOf(cand), at: iso(ctx.now) }),
    ...notify(db, ctx, cand.userId, 'gift', {
      kind, candidateId: cand.id, giverName: prof.displayName, giverRole: prof.role, giverCompany: prof.company,
    }),
  ];
  return done(
    { giftId: String(id), remainingToday: rule.perDay - mine.length - 1, remainingForCandidate: rule.perCandidatePerDay - pair - 1 },
    emits,
  );
}

// ---------- invitations ----------
export function sendInvitation(db: DemoDb, ctx: Ctx, candidateId: string, message: string, hrContact: string): Out<Invitation> {
  const uid = ctx.uid;
  if (!uid) return fail({ error: 'UNAUTHENTICATED' });
  const prof = db.users[uid];
  const cand = db.candidates[candidateId];
  const r = LIMITS.invite;
  expireStale(db, ctx.now, candidateId, uid);
  const mineAll = Object.values(db.invitations).filter((i) => i.hrId === uid && i.candidateId === candidateId);
  const today = vnDay(ctx.now);
  const fault = checkInvite({
    hasProfile: !!prof, role: prof?.role ?? 'viewer', candidateFound: !!cand, candidateStatus: cand?.status,
    candidateIsSample: !!cand?.isSample, message: clean(message), contact: clean(hrContact),
    openPair: mineAll.some((i) => i.status === 'pending'),
    inCooldown: mineAll.some((i) => i.createdAt > ctx.now - r.cooldownDays * DAY_MS),
    dayCount: Object.values(db.invitations).filter((i) => i.hrId === uid && i.day === today).length,
    candidateOpen: Object.values(db.invitations).filter((i) => i.candidateId === candidateId && i.status === 'pending').length,
  });
  if (fault) return fail(fault);
  const inv: InvRow = {
    id: ctx.newId(), hrId: uid, candidateId, hrName: prof.displayName, hrCompany: prof.company ?? '',
    message: clean(message)!, hrContact: clean(hrContact)!, status: 'pending', responseReason: null, day: today,
    createdAt: ctx.now, respondedAt: null, expiresAt: ctx.now + r.expireDays * DAY_MS,
  };
  db.invitations[inv.id] = inv;
  bumpDaily(db, candidateId, 'invites', ctx.now);
  cand.inviteTotal += 1;
  const emits: Emit[] = [
    street({ type: 'invite', id: inv.id, giver: actorOf(prof), candidate: refOf(cand), at: iso(ctx.now) }),
    ...notify(db, ctx, cand.userId, 'invite_received', {
      invitationId: inv.id, hrName: prof.displayName, hrCompany: prof.company, message: inv.message, hrContact: inv.hrContact,
    }),
  ];
  return done(invDto(inv), emits);
}

export function respondInvitation(db: DemoDb, ctx: Ctx, id: string, accept: boolean, reason?: string): Out<Invitation> {
  if (!ctx.uid) return fail({ error: 'UNAUTHENTICATED' });
  const cand = candOfUser(db, ctx.uid);
  const inv = cand ? db.invitations[id] : undefined;
  const mine = inv && cand && inv.candidateId === cand.id ? inv : undefined;
  const rs = clean(reason);
  const fault = checkRespond({ found: !!mine, status: mine?.status ?? '', expired: !!mine && mine.expiresAt < ctx.now, reason: rs });
  if (fault) {
    if (fault.error === 'EXPIRED' && mine) mine.status = 'expired';
    return fail(fault);
  }
  const i = mine!;
  i.status = accept ? 'accepted' : 'declined';
  i.respondedAt = ctx.now;
  i.responseReason = rs;
  if (accept) bumpDaily(db, cand!.id, 'invitesAccepted', ctx.now);
  const emits = notify(db, ctx, i.hrId, 'invite_responded', {
    invitationId: i.id, candidateId: cand!.id, candidateName: cand!.displayName, accepted: accept, reason: rs,
  });
  return done(invDto(i), emits);
}

// ---------- offers ----------
export function sendOffer(
  db: DemoDb, ctx: Ctx, candidateId: string,
  o: { position: string; package: string; message?: string; showCompany: boolean },
): Out<Offer> {
  const uid = ctx.uid;
  if (!uid) return fail({ error: 'UNAUTHENTICATED' });
  const prof = db.users[uid];
  const cand = db.candidates[candidateId];
  expireStale(db, ctx.now, candidateId, uid);
  const accepted = Object.values(db.invitations)
    .filter((i) => i.hrId === uid && i.candidateId === candidateId && i.status === 'accepted')
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const fault = checkOffer({
    role: prof?.role ?? null, candidateFound: !!cand, candidateStatus: cand?.status, hasAcceptedInvite: !!accepted,
    position: clean(o.position), pkg: clean(o.package), message: clean(o.message),
    candidateHasOpenOffer: Object.values(db.offers).some((x) => x.candidateId === candidateId && x.status === 'pending'),
    hrOpenOffers: Object.values(db.offers).filter((x) => x.hrId === uid && x.status === 'pending').length,
  });
  if (fault) return fail(fault);
  const row: OfferRow = {
    id: ctx.newId(), hrId: uid, candidateId, invitationId: accepted.id, hrName: prof.displayName,
    hrCompany: prof.company ?? '', position: clean(o.position)!, package: clean(o.package)!, message: clean(o.message),
    hrShowCompany: !!o.showCompany, candidateShowCompany: null, status: 'pending', responseReason: null,
    createdAt: ctx.now, respondedAt: null, expiresAt: ctx.now + LIMITS.offer.expireDays * DAY_MS,
  };
  db.offers[row.id] = row;
  const emits: Emit[] = [
    street({ type: 'offer', id: row.id, giver: actorOf(prof), candidate: refOf(cand), at: iso(ctx.now) }),
    ...notify(db, ctx, cand.userId, 'offer_received', {
      offerId: row.id, hrName: prof.displayName, hrCompany: prof.company, position: row.position, package: row.package, message: row.message,
    }),
  ];
  return done(offerDto(row), emits);
}

export function respondOffer(
  db: DemoDb, ctx: Ctx, id: string, accept: boolean, opts: { showCompany?: boolean; reason?: string } = {},
): Out<Offer> {
  if (!ctx.uid) return fail({ error: 'UNAUTHENTICATED' });
  const cand = candOfUser(db, ctx.uid);
  const found = cand ? db.offers[id] : undefined;
  const mine = found && cand && found.candidateId === cand.id ? found : undefined;
  const fault = checkRespond({ found: !!mine, status: mine?.status ?? '', expired: !!mine && mine.expiresAt < ctx.now, reason: null });
  if (fault) {
    if (fault.error === 'EXPIRED' && mine) mine.status = 'expired';
    return fail(fault);
  }
  const o = mine!;
  const c = cand!;
  o.status = accept ? 'accepted' : 'declined';
  o.respondedAt = ctx.now;
  o.candidateShowCompany = !!opts.showCompany;
  o.responseReason = clean(opts.reason);
  const emits: Emit[] = [];
  if (accept) {
    const company = o.hrShowCompany && opts.showCompany ? o.hrCompany : null; // BR-O4
    c.status = 'placed';
    c.placedAt = ctx.now;
    c.placedCompany = company;
    c.updatedAt = ctx.now;
    for (const i of Object.values(db.invitations)) {
      if (i.candidateId === c.id && i.status === 'pending') {
        i.status = 'closed';
        i.respondedAt = ctx.now;
        emits.push(...notify(db, ctx, i.hrId, 'invite_closed', { invitationId: i.id, candidateName: c.displayName }));
      }
    }
    emits.push(street({ type: 'placed', candidate: cardOf(db, c, ctx.now), company, at: iso(ctx.now) }));
  }
  emits.push(...notify(db, ctx, o.hrId, 'offer_responded', { offerId: o.id, candidateName: c.displayName, accepted: accept }));
  return done(offerDto(o), emits);
}

export function listMyInvitations(db: DemoDb, uid: string | null): Invitation[] {
  if (!uid) return [];
  const mine = candOfUser(db, uid);
  return Object.values(db.invitations)
    .filter((i) => i.hrId === uid || (mine && i.candidateId === mine.id))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 100)
    .map(invDto);
}

export function listMyOffers(db: DemoDb, uid: string | null): Offer[] {
  if (!uid) return [];
  const mine = candOfUser(db, uid);
  return Object.values(db.offers)
    .filter((o) => o.hrId === uid || (mine && o.candidateId === mine.id))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 100)
    .map(offerDto);
}

// ---------- temple ----------
export function lightIncense(db: DemoDb, ctx: Ctx, targetCandidateId?: string): Out<{ incenseToday: number }> {
  const uid = ctx.uid;
  if (!uid) return fail({ error: 'UNAUTHENTICATED' });
  const prof = db.users[uid];
  const today = vnDay(ctx.now);
  const target = targetCandidateId ? db.candidates[targetCandidateId] : candOfUser(db, uid);
  const sitting = target?.status === 'sitting';
  const fault = checkIncense({
    hasProfile: !!prof,
    targetGiven: !!targetCandidateId,
    targetSitting: !!target && sitting,
    alreadyDone: db.incense.some((x) => x.userId === uid && x.day === today),
  });
  if (fault) return fail(fault);
  const t = target && sitting ? target : null;
  db.incense.push({ userId: uid, day: today, target: t?.id ?? null });
  const emits: Emit[] = [];
  if (t) {
    t.incenseTotal += 1; // cosmetic only
    if (t.userId !== uid) emits.push(...notify(db, ctx, t.userId, 'incense_for_you', {}));
  }
  emits.push(street({ type: 'incense', name: prof.displayName, at: iso(ctx.now) }));
  return done(templeStats(db, ctx.now), emits);
}

export function getFortuneDraw(db: DemoDb, uid: string | null, now: number): Result<FortuneDraw> {
  if (!uid) return { ok: false, error: 'UNAUTHENTICATED' };
  return { ok: true, data: drawFortuneDemo(uid, vnDay(now)) };
}

// ---------- reports ----------
const REPORT_REASONS: ReportReason[] = ['obscene', 'harassment', 'spam', 'personal_info', 'other'];

export function reportCandidate(db: DemoDb, ctx: Ctx, candidateId: string, reason: ReportReason, note?: string): Out<void> {
  const uid = ctx.uid;
  if (!uid) return fail({ error: 'UNAUTHENTICATED' });
  const cand = db.candidates[candidateId];
  const today = vnDay(ctx.now);
  const early = checkReport({
    hasProfile: !!db.users[uid], candidateFound: !!cand, isSelf: !!cand && cand.userId === uid,
    reasonValid: REPORT_REASONS.includes(reason), reportsToday: 0, alreadyReported: false,
  });
  if (early) return fail(early);
  const late = checkReport({
    hasProfile: true, candidateFound: true, isSelf: false, reasonValid: true,
    reportsToday: hit(db, `report:${uid}:${today}`, DAY_MS, LIMITS.reportsPerDay, ctx.now) ? 1 : LIMITS.reportsPerDay + 1,
    alreadyReported: db.reports.some((r) => r.reporterId === uid && r.candidateId === candidateId),
  });
  if (late) return fail(late);
  db.reports.push({ reporterId: uid, candidateId, reason, note: (clean(note) ?? '').slice(0, 200) || null, at: ctx.now });
  cand.reportCount += 1;
  const emits: Emit[] = [];
  if (cand.reportCount >= LIMITS.reportsToHideSign && cand.signState === 'ok') {
    cand.signState = 'pending_review'; // AC-20.2
    emits.push(...notify(db, ctx, cand.userId, 'sign_hidden', {}));
    emits.push(street({ type: 'candidate_upsert', candidate: lightCard(db, cand, ctx.now), at: iso(ctx.now) }));
  }
  return done(undefined, emits);
}

// ---------- notifications ----------
export function listNotifications(db: DemoDb, uid: string | null, limit = 50): AppNotification[] {
  if (!uid) return [];
  return db.notifications
    .filter((n) => n.userId === uid)
    .sort((a, b) => b.createdAt - a.createdAt || Number(b.id) - Number(a.id))
    .slice(0, limit)
    .map(notifDto);
}

export function markNotificationsRead(db: DemoDb, ctx: Ctx, ids?: string[]): void {
  for (const n of db.notifications) {
    if (n.userId === ctx.uid && n.readAt === null && (!ids || ids.includes(n.id))) n.readAt = ctx.now;
  }
}

