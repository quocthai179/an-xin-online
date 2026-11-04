import type { CandidateInput, WorkMode } from '@/backend/types';
import { FIELD_LIMITS } from '../rules';
import { isZoneId } from '../zones';
import { clean } from '../moderation/normalize';
import { isBlocked } from '../moderation/blocklist';
import { hasPii } from '../moderation/pii';
import { validateContact } from './contact';
import type { ErrorCode } from '@/backend/types';

export type ValidationFailure = { ok: false; error: ErrorCode; field: string; errors: Record<string, ErrorCode> };
export type ValidationSuccess<T> = { ok: true; value: T };

const len = (s: string) => [...s].length;
const MODES: readonly string[] = ['remote', 'hybrid', 'onsite'];

function fail(error: ErrorCode, field: string): ValidationFailure {
  return { ok: false, error, field, errors: { [field]: error } };
}

/**
 * Same field order and error codes as public.upsert_my_candidate (SQL). Returns the first error.
 * `errors` contains exactly that single error (kept as a map so forms can render it next to the field).
 */
export function validateCandidateInput(raw: unknown): ValidationSuccess<CandidateInput> | ValidationFailure {
  const r = (raw ?? {}) as Record<string, unknown>;
  const sign = clean(str(r.signText));
  const title = clean(str(r.title));
  const bio = clean(str(r.bio));
  const city = clean(str(r.city));
  const zone = r.zone;
  const contactRaw = (r.contact ?? {}) as Record<string, unknown>;
  const ckind = str(contactRaw.kind);
  const cval = clean(str(contactRaw.value));

  if (!sign || len(sign) < FIELD_LIMITS.signMin || len(sign) > FIELD_LIMITS.signMax || sign.split('\n').length - 1 > 1) {
    return fail('VALIDATION', 'sign_text');
  }
  if (!isZoneId(zone)) return fail('VALIDATION', 'zone');
  if (!title || len(title) > FIELD_LIMITS.titleMax) return fail('VALIDATION', 'title');

  const years = r.yearsExp;
  if (typeof years !== 'number' || !Number.isInteger(years) || years < 0 || years > FIELD_LIMITS.yearsMax) {
    return fail('VALIDATION', 'years_exp');
  }

  const skills = (Array.isArray(r.skills) ? r.skills : [])
    .map((s) => clean(str(s)))
    .filter((s): s is string => s !== null);
  if (skills.length < FIELD_LIMITS.skillsMin || skills.length > FIELD_LIMITS.skillsMax || skills.some((s) => len(s) > FIELD_LIMITS.skillLen)) {
    return fail('VALIDATION', 'skills');
  }

  const smin = numOrNull(r.salaryMin);
  const smax = numOrNull(r.salaryMax);
  if (smin === undefined || smax === undefined) return fail('VALIDATION', 'salary');
  for (const s of [smin, smax]) {
    if (s !== null && (!Number.isInteger(s) || s < 0 || s > FIELD_LIMITS.salaryMax)) return fail('VALIDATION', 'salary');
  }
  if (smin !== null && smax !== null && smin > smax) return fail('VALIDATION', 'salary');

  const modesIn = Array.isArray(r.workModes) ? r.workModes : [];
  if (!modesIn.every((m) => typeof m === 'string' && MODES.includes(m))) return fail('VALIDATION', 'work_modes');
  const modes = [...new Set(modesIn as WorkMode[])];

  if (bio && len(bio) > FIELD_LIMITS.bioMax) return fail('VALIDATION', 'bio');
  if (city && len(city) > FIELD_LIMITS.cityMax) return fail('VALIDATION', 'city');
  if (!cval || !validateContact(ckind, cval) || len(cval) > FIELD_LIMITS.contactMax) return fail('VALIDATION', 'contact');

  if (isBlocked(sign)) return fail('BLOCKED_CONTENT', 'sign_text');
  if (isBlocked(title)) return fail('BLOCKED_CONTENT', 'title');
  if (isBlocked(bio)) return fail('BLOCKED_CONTENT', 'bio');
  if (isBlocked(skills.join(' , '))) return fail('BLOCKED_CONTENT', 'skills');
  if (isBlocked(city)) return fail('BLOCKED_CONTENT', 'city');
  if (hasPii(sign)) return fail('PII_NOT_ALLOWED', 'sign_text');
  if (hasPii(bio)) return fail('PII_NOT_ALLOWED', 'bio');
  if (hasPii(title)) return fail('PII_NOT_ALLOWED', 'title');

  return {
    ok: true,
    value: {
      signText: sign,
      title,
      yearsExp: years,
      skills,
      salaryMin: smin,
      salaryMax: smax,
      salaryNegotiable: r.salaryNegotiable === true,
      city,
      workModes: modes,
      bio,
      zone,
      hideFromTicker: r.hideFromTicker === true,
      showSalaryOnCard: r.showSalaryOnCard === true,
      contact: { kind: ckind as 'email' | 'url' | 'phone', value: cval },
    },
  };
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** null for empty/absent, undefined for invalid. */
function numOrNull(v: unknown): number | null | undefined {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}
