import type { ZoneId } from '@/lib/rules';

export type Mode = 'supabase' | 'demo';
export type Role = 'hr' | 'candidate' | 'viewer';
export type GiftKind = 'xu' | 'love';

export type ErrorCode =
  | 'UNAUTHENTICATED' | 'NO_PROFILE' | 'WRONG_ROLE' | 'NOT_FOUND' | 'SELF_ACTION'
  | 'CANDIDATE_UNAVAILABLE' | 'SAMPLE_CANDIDATE' | 'RATE_LIMITED' | 'IP_LIMIT'
  | 'LIMIT_DAILY' | 'LIMIT_PER_CANDIDATE_DAY' | 'INVITE_ALREADY_OPEN' | 'INVITE_COOLDOWN' | 'CANDIDATE_FULL'
  | 'NEED_ACCEPTED_INVITE' | 'OFFER_ALREADY_OPEN' | 'HR_OFFER_LIMIT' | 'EXPIRED' | 'NOT_PENDING'
  | 'ALREADY_DONE' | 'ALREADY_REPORTED' | 'CONTACT_LOCKED' | 'VALIDATION' | 'BLOCKED_CONTENT' | 'PII_NOT_ALLOWED'
  | 'NAME_CHANGE_COOLDOWN' | 'ZONE_CHANGE_COOLDOWN' | 'NETWORK';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorCode; field?: string; retryAfterSec?: number };

export interface AvatarSpec {
  skin: number;
  shirt: number;
  pants: number;
  hat: 'non_la' | 'cap' | 'beanie' | 'none';
  bowl: 'bowl' | 'hat' | 'box';
}

export interface Profile {
  id: string;
  displayName: string;
  role: Role;
  company: string | null;
  avatar: AvatarSpec;
  createdAt: string;
}

export type SignState = 'ok' | 'pending_review' | 'removed';
export type WorkMode = 'remote' | 'hybrid' | 'onsite';

export interface CandidateCard {
  id: string;
  slug: string;
  displayName: string;
  zone: ZoneId;
  signText: string | null;
  signState: SignState;
  title: string;
  yearsExp: number;
  skills: string[];
  status: 'sitting' | 'placed';
  isSample: boolean;
  avatar: AvatarSpec;
  sittingSince: string;
  createdAt: string;
  placedAt: string | null;
  placedCompany: string | null;
  totals: { xu: number; love: number; invites: number; incense: number };
  completeness: number;
  decayed: { hr: number; love: number; invites: number; accepted: number };
  xuWeek: number;
  xuToday: number;
}

export interface CandidateMeInfo {
  isMine: boolean;
  xuToday: number;
  loveToday: number;
  lastInviteAt: string | null;
  openInvite: boolean;
  acceptedInviteId: string | null;
  canSeeContact: boolean;
  reported: boolean;
}

export interface CandidateDetail extends CandidateCard {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  showSalaryOnCard: boolean;
  hideFromTicker: boolean;
  city: string | null;
  workModes: WorkMode[];
  bio: string | null;
  openOffer: boolean;
  openInvites: number;
  me: null | CandidateMeInfo;
}

export interface Contact {
  kind: 'email' | 'url' | 'phone';
  value: string;
}

export interface CandidateInput {
  signText: string;
  title: string;
  yearsExp: number;
  skills: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryNegotiable: boolean;
  city?: string | null;
  workModes: WorkMode[];
  bio?: string | null;
  zone: ZoneId;
  hideFromTicker: boolean;
  showSalaryOnCard: boolean;
  contact: Contact;
}

export interface Quota {
  day: string;
  xuUsed: number;
  loveUsed: number;
  inviteUsed: number;
  offersOpen: number;
  incenseDone: boolean;
}

export interface Me {
  profile: Profile;
  candidate: (CandidateDetail & { contact: Contact }) | null;
  quota: Quota;
  unread: number;
}

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'closed';

export interface Invitation {
  id: string;
  hrId: string;
  candidateId: string;
  hrName: string;
  hrCompany: string;
  message: string;
  hrContact: string;
  status: InviteStatus;
  responseReason: string | null;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
}

export interface Offer {
  id: string;
  hrId: string;
  candidateId: string;
  invitationId: string;
  hrName: string;
  hrCompany: string;
  position: string;
  package: string;
  message: string | null;
  hrShowCompany: boolean;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
}

export type NotificationType =
  | 'gift' | 'invite_received' | 'invite_responded' | 'invite_closed'
  | 'offer_received' | 'offer_responded' | 'incense_for_you' | 'sign_hidden';

export interface AppNotification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export interface FortuneDraw {
  day: string;
  roll: number;
  pick: number;
}

export interface Actor {
  id: string;
  name: string;
  role: Role;
  company: string | null;
}
export interface CandRef {
  id: string;
  name: string;
  zone: ZoneId;
}

export type StreetEvent =
  | { type: 'gift'; id: string; kind: GiftKind; giver: Actor; candidate: CandRef; at: string }
  | { type: 'invite' | 'offer'; id: string; giver: Actor; candidate: CandRef; at: string }
  | { type: 'placed'; candidate: CandidateCard; company: string | null; at: string }
  | { type: 'incense'; name: string; at: string }
  | { type: 'candidate_upsert'; candidate: Omit<CandidateCard, 'decayed' | 'xuWeek' | 'xuToday'>; at: string }
  | { type: 'candidate_remove'; id: string; at: string };

export interface Pose {
  x: number;
  z: number;
  ry: number;
  moving: boolean;
}
export interface PeerMeta {
  uid: string;
  name: string;
  role: Role;
  company: string | null;
  avatar: AvatarSpec;
  isBot?: boolean;
}
export type ReactionEmoji = 'heart' | 'fire' | 'cry' | 'laugh' | 'clap' | 'pray';
export type ReportReason = 'obscene' | 'harassment' | 'spam' | 'personal_info' | 'other';
export type ZoneOrPlaza = ZoneId | 'plaza';

export interface PresenceListener {
  onPose(uid: string, pose: Pose, meta: PeerMeta | null, receivedAt: number): void;
  onLeave(uid: string): void;
  onReaction(uid: string, emoji: ReactionEmoji, x: number, z: number): void;
  onCount(n: number): void;
}

export interface PresenceApi {
  join(meta: PeerMeta, zone: ZoneOrPlaza): Promise<void>;
  setZones(current: ZoneOrPlaza, neighbor: ZoneOrPlaza | null): void;
  publishPose(p: Pose): void;
  sendReaction(e: ReactionEmoji, x: number, z: number): boolean;
  subscribe(l: PresenceListener): () => void;
  leave(): Promise<void>;
}

/** Connection state of a remote backend (the demo backend never goes offline). */
export type BackendStatus = 'online' | 'offline';

export interface Backend {
  readonly mode: Mode;
  restore(): Promise<Me | null>;
  register(input: { displayName: string; role: Role; company?: string; avatar: AvatarSpec }): Promise<Result<Me>>;
  getMe(): Promise<Me | null>;
  listCandidates(): Promise<CandidateCard[]>;
  getCandidate(idOrSlug: string): Promise<CandidateDetail | null>;
  saveMyCandidate(input: CandidateInput): Promise<Result<{ id: string; slug: string }>>;
  setMyCandidateStatus(s: 'sitting' | 'hidden'): Promise<Result<{ status: string }>>;
  deleteMyCandidate(): Promise<Result<void>>;
  getCandidateContact(candidateId: string): Promise<Result<Contact>>;
  dropGift(
    candidateId: string,
    kind: GiftKind,
  ): Promise<Result<{ giftId: string; remainingToday: number; remainingForCandidate: number }>>;
  sendInvitation(candidateId: string, message: string, hrContact: string): Promise<Result<Invitation>>;
  respondInvitation(id: string, accept: boolean, reason?: string): Promise<Result<Invitation>>;
  sendOffer(
    candidateId: string,
    o: { position: string; package: string; message?: string; showCompany: boolean },
  ): Promise<Result<Offer>>;
  respondOffer(id: string, accept: boolean, opts?: { showCompany?: boolean; reason?: string }): Promise<Result<Offer>>;
  listMyInvitations(): Promise<Invitation[]>;
  listMyOffers(): Promise<Offer[]>;
  lightIncense(targetCandidateId?: string): Promise<Result<{ incenseToday: number }>>;
  getFortune(): Promise<Result<FortuneDraw>>;
  getTempleStats(): Promise<{ incenseToday: number }>;
  report(candidateId: string, reason: ReportReason, note?: string): Promise<Result<void>>;
  listNotifications(limit?: number): Promise<AppNotification[]>;
  markNotificationsRead(ids?: string[]): Promise<void>;
  onStreetEvent(cb: (e: StreetEvent) => void): () => void;
  onNotification(cb: (n: AppNotification) => void): () => void;
  /** Optional: remote backends report connectivity; the UI shows a banner and refetches when it comes back. */
  onStatus?(cb: (s: BackendStatus) => void): () => void;
  presence: PresenceApi;
  dispose(): void;
}
