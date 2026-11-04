// Pure helpers behind /api/admin/moderate (kept free of Next/Supabase imports so they are unit-testable).
import { createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_ACTIONS = ['approve_sign', 'remove_sign', 'hide', 'unhide', 'delete', 'ban', 'unban'] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Constant-time comparison: both sides are hashed first so the length does not leak either. */
export function adminKeyMatches(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function parseModerateBody(body: unknown): { candidateId: string; action: AdminAction } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { candidateId, action } = body as Record<string, unknown>;
  if (typeof candidateId !== 'string' || !UUID_RE.test(candidateId)) return null;
  if (typeof action !== 'string' || !(ADMIN_ACTIONS as readonly string[]).includes(action)) return null;
  return { candidateId, action: action as AdminAction };
}

/** ADMIN_KEY shorter than this is rejected with 503 (a guessable key on an internet-facing route is worse than no route). */
export const ADMIN_KEY_MIN_LENGTH = 32;

/** One structured JSON line per admin action / failure (picked up by the platform log drain). Never logs the key. */
export function auditLog(entry: Record<string, unknown>): void {
  console.info(JSON.stringify({ scope: 'admin_audit', at: new Date().toISOString(), ...entry }));
}

/** `POST {userId, action: 'ban_user' | 'unban_user', reason?}` -> admin_ban_user (also bans a user that has no candidate row). */
export function parseBanBody(body: unknown): { userId: string; banned: boolean; reason: string | null } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { userId, action, reason } = body as Record<string, unknown>;
  if (typeof userId !== 'string' || !UUID_RE.test(userId)) return null;
  if (action !== 'ban_user' && action !== 'unban_user') return null;
  if (reason !== undefined && reason !== null && typeof reason !== 'string') return null;
  return { userId, banned: action === 'ban_user', reason: typeof reason === 'string' ? reason.slice(0, 200) : null };
}

/** `?offset=&limit=` for the pending list (matches admin_list_pending: limit 1..200, default 50). */
export function parsePaging(params: URLSearchParams): { offset: number; limit: number } {
  const int = (v: string | null, d: number) => (v !== null && /^\d{1,6}$/.test(v) ? Number(v) : d);
  return { offset: int(params.get('offset'), 0), limit: Math.min(200, Math.max(1, int(params.get('limit'), 50))) };
}
