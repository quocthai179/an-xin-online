import type { ErrorCode, GiftKind, Role } from '@/backend/types';
import { LIMITS } from './rules';
import { isBlocked } from './moderation/blocklist';
import { clean } from './moderation/normalize';

export type Check = { error: ErrorCode; field?: string } | null;

const len = (s: string) => [...s].length;

export interface GiftCtx {
  hasProfile: boolean;
  role: Role;
  kind: GiftKind;
  candidateFound: boolean;
  candidateStatus?: string;
  isSelf: boolean;
  opsLastSecond: number; // gift attempts by this giver within the current 1 s window, including this one
  pairToday: number;
  dayToday: number;
}

/** Same check order as public.drop_gift. */
export function checkGift(c: GiftCtx): Check {
  if (!c.hasProfile) return { error: 'NO_PROFILE' };
  if (c.kind === 'xu' && c.role !== 'hr') return { error: 'WRONG_ROLE' };
  if (!c.candidateFound) return { error: 'NOT_FOUND' };
  if (c.candidateStatus !== 'sitting') return { error: 'CANDIDATE_UNAVAILABLE' };
  if (c.isSelf) return { error: 'SELF_ACTION' };
  if (c.opsLastSecond > LIMITS.giftOpsPerSecond) return { error: 'RATE_LIMITED' };
  const rule = LIMITS[c.kind];
  if (c.pairToday >= rule.perCandidatePerDay) return { error: 'LIMIT_PER_CANDIDATE_DAY' };
  if (c.dayToday >= rule.perDay) return { error: 'LIMIT_DAILY' };
  return null;
}

export interface InviteCtx {
  hasProfile: boolean;
  role: Role;
  candidateFound: boolean;
  candidateStatus?: string;
  candidateIsSample: boolean;
  message: string | null; // cleaned
  contact: string | null; // cleaned
  openPair: boolean;
  inCooldown: boolean;
  dayCount: number;
  candidateOpen: number;
}

/** Same check order as public.send_invitation. */
export function checkInvite(c: InviteCtx): Check {
  const r = LIMITS.invite;
  if (!c.hasProfile) return { error: 'NO_PROFILE' };
  if (c.role !== 'hr') return { error: 'WRONG_ROLE' };
  if (!c.candidateFound) return { error: 'NOT_FOUND' };
  if (c.candidateStatus !== 'sitting') return { error: 'CANDIDATE_UNAVAILABLE' };
  if (c.candidateIsSample) return { error: 'SAMPLE_CANDIDATE' };
  if (c.message === null || len(c.message) < r.messageMin || len(c.message) > r.messageMax) {
    return { error: 'VALIDATION', field: 'message' };
  }
  if (isBlocked(c.message)) return { error: 'BLOCKED_CONTENT', field: 'message' };
  if (c.contact === null || len(c.contact) < r.contactMin || len(c.contact) > r.contactMax) {
    return { error: 'VALIDATION', field: 'hr_contact' };
  }
  if (c.openPair) return { error: 'INVITE_ALREADY_OPEN' };
  if (c.inCooldown) return { error: 'INVITE_COOLDOWN' };
  if (c.dayCount >= r.perDay) return { error: 'LIMIT_DAILY' };
  if (c.candidateOpen >= r.maxOpenPerCandidate) return { error: 'CANDIDATE_FULL' };
  return null;
}

export interface OfferCtx {
  role: Role | null; // null = no profile
  candidateFound: boolean;
  candidateStatus?: string;
  hasAcceptedInvite: boolean;
  position: string | null;
  pkg: string | null;
  message: string | null;
  candidateHasOpenOffer: boolean;
  hrOpenOffers: number;
}

/** Same check order as public.send_offer. */
export function checkOffer(c: OfferCtx): Check {
  const r = LIMITS.offer;
  if (c.role !== 'hr') return { error: 'WRONG_ROLE' };
  if (!c.candidateFound) return { error: 'NOT_FOUND' };
  if (c.candidateStatus !== 'sitting') return { error: 'CANDIDATE_UNAVAILABLE' };
  if (!c.hasAcceptedInvite) return { error: 'NEED_ACCEPTED_INVITE' };
  if (c.position === null || len(c.position) > r.positionMax || isBlocked(c.position)) return { error: 'VALIDATION', field: 'position' };
  if (c.pkg === null || len(c.pkg) > r.packageMax || isBlocked(c.pkg)) return { error: 'VALIDATION', field: 'package' };
  if (c.message !== null && (len(c.message) > r.messageMax || isBlocked(c.message))) return { error: 'VALIDATION', field: 'message' };
  if (c.candidateHasOpenOffer) return { error: 'OFFER_ALREADY_OPEN' };
  if (c.hrOpenOffers >= r.maxOpenPerHr) return { error: 'HR_OFFER_LIMIT' };
  return null;
}

export interface RespondCtx {
  found: boolean;
  status: string;
  expired: boolean;
  reason: string | null;
}

/** respond_invitation / respond_offer */
export function checkRespond(c: RespondCtx): Check {
  if (!c.found) return { error: 'NOT_FOUND' };
  if (c.status === 'pending' && c.expired) return { error: 'EXPIRED' };
  if (c.status !== 'pending') return { error: 'NOT_PENDING' };
  if (c.reason !== null && (len(c.reason) > 200 || isBlocked(c.reason))) return { error: 'VALIDATION', field: 'reason' };
  return null;
}

export function checkReport(c: {
  hasProfile: boolean;
  candidateFound: boolean;
  isSelf: boolean;
  reasonValid: boolean;
  reportsToday: number;
  alreadyReported: boolean;
}): Check {
  if (!c.hasProfile) return { error: 'NO_PROFILE' };
  if (!c.candidateFound) return { error: 'NOT_FOUND' };
  if (c.isSelf) return { error: 'SELF_ACTION' };
  if (!c.reasonValid) return { error: 'VALIDATION', field: 'reason' };
  if (c.reportsToday > LIMITS.reportsPerDay) return { error: 'RATE_LIMITED' };
  if (c.alreadyReported) return { error: 'ALREADY_REPORTED' };
  return null;
}

export function checkIncense(c: { hasProfile: boolean; targetGiven: boolean; targetSitting: boolean; alreadyDone: boolean }): Check {
  if (!c.hasProfile) return { error: 'NO_PROFILE' };
  if (c.targetGiven && !c.targetSitting) return { error: 'NOT_FOUND' };
  if (c.alreadyDone) return { error: 'ALREADY_DONE' };
  return null;
}

export function cleanOrNull(s: string | null | undefined): string | null {
  return clean(s);
}
