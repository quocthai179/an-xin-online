import type { ErrorCode, Role } from '@/backend/types';
import { FIELD_LIMITS } from '../rules';
import { clean } from '../moderation/normalize';
import { isBlocked } from '../moderation/blocklist';
import { hasPii } from '../moderation/pii';

const len = (s: string) => [...s].length;

export interface ProfileInput {
  displayName: string;
  role: Role;
  company: string | null;
}

export function validateProfileInput(raw: {
  displayName?: unknown;
  role?: unknown;
  company?: unknown;
}): { ok: true; value: ProfileInput } | { ok: false; error: ErrorCode; field: string } {
  const name = clean(typeof raw.displayName === 'string' ? raw.displayName : '');
  const role = raw.role;
  if (!name || len(name) < FIELD_LIMITS.nameMin || len(name) > FIELD_LIMITS.nameMax) {
    return { ok: false, error: 'VALIDATION', field: 'display_name' };
  }
  if (isBlocked(name)) return { ok: false, error: 'BLOCKED_CONTENT', field: 'display_name' };
  if (hasPii(name)) return { ok: false, error: 'PII_NOT_ALLOWED', field: 'display_name' };
  if (role !== 'hr' && role !== 'candidate' && role !== 'viewer') return { ok: false, error: 'VALIDATION', field: 'role' };
  let company: string | null = null;
  if (role === 'hr') {
    company = clean(typeof raw.company === 'string' ? raw.company : '');
    if (!company || len(company) < FIELD_LIMITS.companyMin || len(company) > FIELD_LIMITS.companyMax) {
      return { ok: false, error: 'VALIDATION', field: 'company' };
    }
    if (isBlocked(company)) return { ok: false, error: 'BLOCKED_CONTENT', field: 'company' };
    if (hasPii(company)) return { ok: false, error: 'PII_NOT_ALLOWED', field: 'company' };
  }
  return { ok: true, value: { displayName: name, role, company } };
}
