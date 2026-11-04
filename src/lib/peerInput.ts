// Receiver-side validation of `pos:*` broadcasts. Anything on the wire is attacker controlled (any signed-in user can broadcast
// anything on a pos channel), so only {u,x,z,r,m} are trusted for movement; the display meta is moderated and allowlisted.
import type { AvatarSpec, PeerMeta, Pose, ReactionEmoji, Role } from '@/backend/types';
import { clampToBounds } from '@/lib/layout';
import { isBlocked } from '@/lib/moderation/blocklist';
import { hasPii } from '@/lib/moderation/pii';

export const REACTION_EMOJIS: readonly ReactionEmoji[] = ['heart', 'fire', 'cry', 'laugh', 'clap', 'pray'];
export const ROLES: readonly Role[] = ['hr', 'candidate', 'viewer'];
export const MAX_PEERS = 200;
/** minimum gap between two accepted messages of one uid (the honest sender emits at most 5 Hz) */
export const MIN_POSE_GAP_MS = 80;
export const MIN_REACT_GAP_MS = 1000;
const MAX_UID = 64;
const MAX_NAME = 24;
const MAX_COMPANY = 40;
const HATS = ['non_la', 'cap', 'beanie', 'none'] as const;
const BOWLS = ['bowl', 'hat', 'box'] as const;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const idx = (v: unknown): number => (finite(v) ? Math.min(31, Math.max(0, Math.trunc(v))) : 0);

function safeText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  if (!t || isBlocked(t) || hasPii(t)) return null;
  return t;
}

function safeAvatar(v: unknown): AvatarSpec {
  const a = isObj(v) ? v : {};
  return {
    skin: idx(a.skin),
    shirt: idx(a.shirt),
    pants: idx(a.pants),
    hat: (HATS as readonly unknown[]).includes(a.hat) ? (a.hat as AvatarSpec['hat']) : 'none',
    bowl: (BOWLS as readonly unknown[]).includes(a.bowl) ? (a.bowl as AvatarSpec['bowl']) : 'bowl',
  };
}

/** Name/role/company/avatar of a pose payload, or null when the name is missing, blocked, PII or the role is unknown. */
export function parsePeerMeta(p: Record<string, unknown>, uid: string): PeerMeta | null {
  if (p.n === undefined || p.ro === undefined || p.av === undefined) return null;
  const name = safeText(p.n, MAX_NAME);
  if (!name || typeof p.ro !== 'string' || !(ROLES as readonly string[]).includes(p.ro)) return null;
  return { uid, name, role: p.ro as Role, company: safeText(p.co, MAX_COMPANY), avatar: safeAvatar(p.av) };
}

export interface ParsedPose {
  u: string;
  pose: Pose;
  meta: PeerMeta | null;
}

export function parsePose(payload: unknown, selfUid: string | null): ParsedPose | null {
  if (!isObj(payload)) return null;
  const u = payload.u;
  if (typeof u !== 'string' || !u || u.length > MAX_UID || u === selfUid) return null;
  if (!finite(payload.x) || !finite(payload.z)) return null;
  const c = clampToBounds(payload.x, payload.z);
  return { u, pose: { x: c.x, z: c.z, ry: finite(payload.r) ? payload.r % (Math.PI * 4) : 0, moving: payload.m === 1 }, meta: parsePeerMeta(payload, u) };
}

export function parseReaction(payload: unknown, selfUid: string | null): { u: string; e: ReactionEmoji; x: number; z: number } | null {
  if (!isObj(payload)) return null;
  const u = payload.u;
  if (typeof u !== 'string' || !u || u.length > MAX_UID || u === selfUid) return null;
  if (typeof payload.e !== 'string' || !(REACTION_EMOJIS as readonly string[]).includes(payload.e)) return null;
  if (!finite(payload.x) || !finite(payload.z)) return null;
  const c = clampToBounds(payload.x, payload.z);
  return { u, e: payload.e as ReactionEmoji, x: c.x, z: c.z };
}

/** Per-uid receive rate limiter (bounded: stale entries are dropped when the map grows). */
export class UidGate {
  private last = new Map<string, number>();
  constructor(private minGapMs: number) {}

  accept(uid: string, now: number): boolean {
    const prev = this.last.get(uid);
    if (prev !== undefined && now - prev < this.minGapMs) return false;
    if (this.last.size >= MAX_PEERS * 4) {
      for (const [k, t] of this.last) if (now - t > 60_000) this.last.delete(k);
      if (this.last.size >= MAX_PEERS * 4) return false;
    }
    this.last.set(uid, now);
    return true;
  }

  clear(): void {
    this.last.clear();
  }
}
