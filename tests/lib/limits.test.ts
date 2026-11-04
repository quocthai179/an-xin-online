import { describe, expect, it } from 'vitest';
import { checkGift, checkIncense, checkInvite, checkOffer, checkReport, checkRespond, type GiftCtx, type InviteCtx, type OfferCtx } from '@/lib/limits';

const gift: GiftCtx = { hasProfile: true, role: 'hr', kind: 'xu', candidateFound: true, candidateStatus: 'sitting', isSelf: false, opsLastSecond: 1, pairToday: 0, dayToday: 0 };
const invite: InviteCtx = { hasProfile: true, role: 'hr', candidateFound: true, candidateStatus: 'sitting', candidateIsSample: false, message: 'Mời bạn phỏng vấn nhé', contact: 'hr@acme.vn', openPair: false, inCooldown: false, dayCount: 0, candidateOpen: 0 };
const offer: OfferCtx = { role: 'hr', candidateFound: true, candidateStatus: 'sitting', hasAcceptedInvite: true, position: 'Dev', pkg: '30tr', message: null, candidateHasOpenOffer: false, hrOpenOffers: 0 };

describe('limits', () => {
  it('gift: order of checks', () => {
    expect(checkGift(gift)).toBeNull();
    expect(checkGift({ ...gift, hasProfile: false })?.error).toBe('NO_PROFILE');
    expect(checkGift({ ...gift, role: 'viewer' })?.error).toBe('WRONG_ROLE');
    expect(checkGift({ ...gift, role: 'viewer', kind: 'love' })).toBeNull();
    expect(checkGift({ ...gift, candidateFound: false })?.error).toBe('NOT_FOUND');
    expect(checkGift({ ...gift, candidateStatus: 'placed' })?.error).toBe('CANDIDATE_UNAVAILABLE');
    expect(checkGift({ ...gift, isSelf: true })?.error).toBe('SELF_ACTION');
    expect(checkGift({ ...gift, opsLastSecond: 6 })?.error).toBe('RATE_LIMITED');
    expect(checkGift({ ...gift, pairToday: 2 })?.error).toBe('LIMIT_PER_CANDIDATE_DAY');
    expect(checkGift({ ...gift, dayToday: 10 })?.error).toBe('LIMIT_DAILY');
    expect(checkGift({ ...gift, kind: 'love', pairToday: 1 })?.error).toBe('LIMIT_PER_CANDIDATE_DAY');
    expect(checkGift({ ...gift, kind: 'love', dayToday: 5 })?.error).toBe('LIMIT_DAILY');
  });

  it('invite', () => {
    expect(checkInvite(invite)).toBeNull();
    expect(checkInvite({ ...invite, role: 'candidate' })?.error).toBe('WRONG_ROLE');
    expect(checkInvite({ ...invite, candidateIsSample: true })?.error).toBe('SAMPLE_CANDIDATE');
    expect(checkInvite({ ...invite, message: 'ngắn' })).toEqual({ error: 'VALIDATION', field: 'message' });
    expect(checkInvite({ ...invite, message: 'vcl mời đi phỏng vấn' })?.error).toBe('BLOCKED_CONTENT');
    expect(checkInvite({ ...invite, contact: 'ab' })).toEqual({ error: 'VALIDATION', field: 'hr_contact' });
    expect(checkInvite({ ...invite, openPair: true })?.error).toBe('INVITE_ALREADY_OPEN');
    expect(checkInvite({ ...invite, inCooldown: true })?.error).toBe('INVITE_COOLDOWN');
    expect(checkInvite({ ...invite, dayCount: 3 })?.error).toBe('LIMIT_DAILY');
    expect(checkInvite({ ...invite, candidateOpen: 5 })?.error).toBe('CANDIDATE_FULL');
  });

  it('offer', () => {
    expect(checkOffer(offer)).toBeNull();
    expect(checkOffer({ ...offer, role: null })?.error).toBe('WRONG_ROLE');
    expect(checkOffer({ ...offer, hasAcceptedInvite: false })?.error).toBe('NEED_ACCEPTED_INVITE');
    expect(checkOffer({ ...offer, position: null })).toEqual({ error: 'VALIDATION', field: 'position' });
    expect(checkOffer({ ...offer, pkg: 'x'.repeat(101) })).toEqual({ error: 'VALIDATION', field: 'package' });
    expect(checkOffer({ ...offer, candidateHasOpenOffer: true })?.error).toBe('OFFER_ALREADY_OPEN');
    expect(checkOffer({ ...offer, hrOpenOffers: 3 })?.error).toBe('HR_OFFER_LIMIT');
  });

  it('respond / report / incense', () => {
    const r = { found: true, status: 'pending', expired: false, reason: null };
    expect(checkRespond(r)).toBeNull();
    expect(checkRespond({ ...r, found: false })?.error).toBe('NOT_FOUND');
    expect(checkRespond({ ...r, expired: true })?.error).toBe('EXPIRED');
    expect(checkRespond({ ...r, status: 'accepted' })?.error).toBe('NOT_PENDING');
    expect(checkRespond({ ...r, reason: 'x'.repeat(201) })?.error).toBe('VALIDATION');
    const rp = { hasProfile: true, candidateFound: true, isSelf: false, reasonValid: true, reportsToday: 1, alreadyReported: false };
    expect(checkReport(rp)).toBeNull();
    expect(checkReport({ ...rp, isSelf: true })?.error).toBe('SELF_ACTION');
    expect(checkReport({ ...rp, reportsToday: 21 })?.error).toBe('RATE_LIMITED');
    expect(checkReport({ ...rp, alreadyReported: true })?.error).toBe('ALREADY_REPORTED');
    expect(checkIncense({ hasProfile: true, targetGiven: false, targetSitting: false, alreadyDone: true })?.error).toBe('ALREADY_DONE');
    expect(checkIncense({ hasProfile: true, targetGiven: true, targetSitting: false, alreadyDone: false })?.error).toBe('NOT_FOUND');
  });
});
