// Pure helpers behind /api/admin/moderate (kept free of Next/Supabase imports so they are unit-testable).
import { createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_ACTIONS = ['approve_sign', 'remove_sign', 'hide', 'delete'] as const;
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
