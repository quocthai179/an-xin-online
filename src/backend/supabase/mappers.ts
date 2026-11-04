// DB (snake_case jsonb returned by the RPCs in supabase/migrations/0001_init.sql) -> domain types (camelCase).
import type {
  AppNotification, AvatarSpec, CandidateCard, CandidateDetail, CandidateInput, CandidateMeInfo, Contact, ErrorCode,
  Invitation, InviteStatus, Me, NotificationType, Offer, Profile, Quota, Result, SignState, StreetEvent, WorkMode,
} from '../types';
import type { ZoneId } from '@/lib/rules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
type Obj = Record<string, Json>;

const ERROR_CODES: ReadonlySet<string> = new Set<ErrorCode>([
  'UNAUTHENTICATED', 'NO_PROFILE', 'WRONG_ROLE', 'NOT_FOUND', 'SELF_ACTION', 'CANDIDATE_UNAVAILABLE', 'SAMPLE_CANDIDATE',
  'RATE_LIMITED', 'IP_LIMIT', 'LIMIT_DAILY', 'LIMIT_PER_CANDIDATE_DAY', 'INVITE_ALREADY_OPEN', 'INVITE_COOLDOWN',
  'CANDIDATE_FULL', 'NEED_ACCEPTED_INVITE', 'OFFER_ALREADY_OPEN', 'HR_OFFER_LIMIT', 'EXPIRED', 'NOT_PENDING',
  'ALREADY_DONE', 'ALREADY_REPORTED', 'CONTACT_LOCKED', 'VALIDATION', 'BLOCKED_CONTENT', 'PII_NOT_ALLOWED',
  'NAME_CHANGE_COOLDOWN', 'ZONE_CHANGE_COOLDOWN', 'NETWORK',
]);

export interface RpcResponse {
  data: unknown;
  error: { code?: string; message?: string } | null;
  status?: number;
}

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v));

/** True for transport failures (offline, DNS, CORS, server down), as opposed to a Postgres/PostgREST answer. */
export function isNetworkFailure(res: RpcResponse): boolean {
  return !!res.error && (res.status === 0 || res.status === undefined) && !res.error.code;
}

/** RPC envelope `{ok, data | error, field, retryAfterSec}` -> Result. Anything unexpected becomes NETWORK. */
export function toResult<T>(res: RpcResponse, map: (data: Json) => T): Result<T> {
  if (res.error) {
    // 42501 = insufficient_privilege: PostgREST answers this when the JWT/role cannot call the function.
    return { ok: false, error: res.error.code === '42501' ? 'UNAUTHENTICATED' : 'NETWORK' };
  }
  const env = res.data;
  if (!isObj(env)) return { ok: false, error: 'NETWORK' };
  if (env.ok === true) {
    try {
      return { ok: true, data: map(env.data) };
    } catch {
      return { ok: false, error: 'NETWORK' };
    }
  }
  const code = str(env.error);
  const out: Result<T> = { ok: false, error: ERROR_CODES.has(code) ? (code as ErrorCode) : 'NETWORK' };
  if (typeof env.field === 'string') out.field = env.field;
  if (typeof env.retryAfterSec === 'number') out.retryAfterSec = env.retryAfterSec;
  return out;
}

export function mapAvatar(v: unknown): AvatarSpec {
  const a = isObj(v) ? v : {};
  const hat = ['non_la', 'cap', 'beanie', 'none'].includes(a.hat) ? a.hat : 'none';
  const bowl = ['bowl', 'hat', 'box'].includes(a.bowl) ? a.bowl : 'bowl';
  return { skin: num(a.skin), shirt: num(a.shirt), pants: num(a.pants), hat, bowl };
}

export function mapProfile(p: Json): Profile {
  return {
    id: str(p.id),
    displayName: str(p.display_name),
    role: p.role,
    company: strOrNull(p.company),
    avatar: mapAvatar(p.avatar),
    createdAt: str(p.created_at),
  };
}

/** `private.card_json` (also the payload of candidate_upsert / placed broadcasts). */
export function mapCardLight(c: Json): Omit<CandidateCard, 'decayed' | 'xuWeek' | 'xuToday'> {
  return {
    id: str(c.id),
    slug: str(c.slug),
    displayName: str(c.display_name),
    zone: c.zone as ZoneId,
    signText: c.sign_state === 'ok' ? strOrNull(c.sign_text) : null,
    signState: (c.sign_state ?? 'ok') as SignState,
    title: str(c.title),
    yearsExp: num(c.years_exp),
    skills: Array.isArray(c.skills) ? c.skills.map(String) : [],
    status: c.status === 'placed' ? 'placed' : 'sitting',
    isSample: c.is_sample === true,
    avatar: mapAvatar(c.avatar),
    sittingSince: str(c.sitting_since),
    createdAt: str(c.created_at),
    placedAt: strOrNull(c.placed_at),
    placedCompany: strOrNull(c.placed_company),
    totals: { xu: num(c.xu_total), love: num(c.love_total), invites: num(c.invite_total), incense: num(c.incense_total) },
    completeness: num(c.completeness),
  };
}

/** Row of `list_candidates` (card + decayed sums). */
export function mapCard(c: Json): CandidateCard {
  return {
    ...mapCardLight(c),
    decayed: { hr: num(c.hr_decayed), love: num(c.love_decayed), invites: num(c.invite_decayed), accepted: num(c.accepted_decayed) },
    xuWeek: num(c.xu_week),
    xuToday: num(c.xu_today),
  };
}

function mapMeInfo(m: Json): CandidateMeInfo {
  return {
    isMine: m.is_mine === true,
    xuToday: num(m.xu_today),
    loveToday: num(m.love_today),
    lastInviteAt: strOrNull(m.last_invite_at),
    openInvite: m.open_invite === true,
    acceptedInviteId: strOrNull(m.accepted_invite_id),
    canSeeContact: m.can_see_contact === true,
    reported: m.reported === true,
  };
}

/** `get_candidate` */
export function mapDetail(c: Json): CandidateDetail {
  return {
    ...mapCard(c),
    salaryMin: numOrNull(c.salary_min),
    salaryMax: numOrNull(c.salary_max),
    salaryNegotiable: c.salary_negotiable === true,
    showSalaryOnCard: c.show_salary_on_card === true,
    hideFromTicker: c.hide_from_ticker === true,
    city: strOrNull(c.city),
    workModes: Array.isArray(c.work_modes) ? (c.work_modes as WorkMode[]) : [],
    bio: strOrNull(c.bio),
    openOffer: c.open_offer === true,
    openInvites: num(c.open_invites),
    me: isObj(c.me) ? mapMeInfo(c.me) : null,
  };
}

export function mapContact(c: Json): Contact {
  return { kind: c.kind, value: str(c.value) };
}

function mapQuota(q: Json): Quota {
  return {
    day: str(q.day),
    xuUsed: num(q.xu_used),
    loveUsed: num(q.love_used),
    inviteUsed: num(q.invite_used),
    offersOpen: num(q.offers_open),
    incenseDone: q.incense_done === true,
  };
}

/** `get_me` (null when the anonymous user has no profile yet). */
export function mapMe(m: unknown): Me | null {
  if (!isObj(m) || !isObj(m.profile)) return null;
  const cand = isObj(m.candidate) ? m.candidate : null;
  return {
    profile: mapProfile(m.profile),
    candidate: cand ? { ...mapDetail(cand), contact: isObj(cand.contact) ? mapContact(cand.contact) : { kind: 'email', value: '' } } : null,
    quota: mapQuota(isObj(m.quota) ? m.quota : {}),
    unread: num(m.unread),
  };
}

/** Lazy expiry is applied on write in SQL; reads show pending-but-past-due rows as expired. */
function liveStatus(status: string, expiresAt: string, nowMs: number): InviteStatus {
  const t = Date.parse(expiresAt);
  if (status === 'pending' && !Number.isNaN(t) && t < nowMs) return 'expired';
  return status as InviteStatus;
}

export function mapInvitation(i: Json, nowMs = Date.now()): Invitation {
  return {
    id: str(i.id),
    hrId: str(i.hr_id),
    candidateId: str(i.candidate_id),
    hrName: str(i.hr_name),
    hrCompany: str(i.hr_company),
    message: str(i.message),
    hrContact: str(i.hr_contact),
    status: liveStatus(str(i.status), str(i.expires_at), nowMs),
    responseReason: strOrNull(i.response_reason),
    createdAt: str(i.created_at),
    respondedAt: strOrNull(i.responded_at),
    expiresAt: str(i.expires_at),
  };
}

export function mapOffer(o: Json, nowMs = Date.now()): Offer {
  return {
    id: str(o.id),
    hrId: str(o.hr_id),
    candidateId: str(o.candidate_id),
    invitationId: str(o.invitation_id),
    hrName: str(o.hr_name),
    hrCompany: str(o.hr_company),
    position: str(o.position),
    package: str(o.package),
    message: strOrNull(o.message),
    hrShowCompany: o.hr_show_company === true,
    status: liveStatus(str(o.status), str(o.expires_at), nowMs),
    createdAt: str(o.created_at),
    expiresAt: str(o.expires_at),
  };
}

/** Row of `notifications` or the realtime payload `{id, type, payload, createdAt}` sent by `private.notify`. */
export function mapNotification(n: Json): AppNotification {
  return {
    id: String(n.id),
    type: n.type as NotificationType,
    payload: isObj(n.payload) ? n.payload : {},
    createdAt: str(n.createdAt ?? n.created_at),
    readAt: strOrNull(n.read_at ?? n.readAt),
  };
}

const actor = (a: Json) => ({ id: str(a.id), name: str(a.name), role: a.role, company: strOrNull(a.company) });
const candRef = (c: Json) => ({ id: str(c.id), name: str(c.name), zone: c.zone as ZoneId });

/** Broadcast payloads of `private.street(...)`. Unknown/malformed events return null and are ignored. */
export function mapStreetEvent(event: string, p: unknown): StreetEvent | null {
  if (!isObj(p)) return null;
  const at = str(p.at);
  try {
    switch (event) {
      case 'gift':
        return { type: 'gift', id: str(p.id), kind: p.kind, giver: actor(p.giver), candidate: candRef(p.candidate), at };
      case 'invite':
      case 'offer':
        return { type: event, id: str(p.id), giver: actor(p.giver), candidate: candRef(p.candidate), at };
      case 'placed':
        return {
          type: 'placed',
          candidate: { ...mapCardLight(p.candidate), decayed: { hr: 0, love: 0, invites: 0, accepted: 0 }, xuWeek: 0, xuToday: 0 },
          company: strOrNull(p.company),
          at,
        };
      case 'incense':
        return { type: 'incense', name: str(p.name), at };
      case 'candidate_upsert':
        return { type: 'candidate_upsert', candidate: mapCardLight(p.candidate), at };
      case 'candidate_remove':
        return { type: 'candidate_remove', id: str(p.id), at };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** CandidateInput -> the jsonb argument of `upsert_my_candidate`. */
export function candidateInputToRpc(i: CandidateInput): Obj {
  return {
    sign_text: i.signText,
    title: i.title,
    years_exp: i.yearsExp,
    skills: i.skills,
    salary_min: i.salaryMin ?? null,
    salary_max: i.salaryMax ?? null,
    salary_negotiable: i.salaryNegotiable,
    city: i.city ?? null,
    work_modes: i.workModes,
    bio: i.bio ?? null,
    hide_from_ticker: i.hideFromTicker,
    show_salary_on_card: i.showSalaryOnCard,
    zone: i.zone,
    contact_kind: i.contact.kind,
    contact_value: i.contact.value,
  };
}
