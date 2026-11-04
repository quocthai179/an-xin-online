// Pure helpers behind /c/[slug], /q/[id] and the OG images: validate and moderate everything that came from a URL.
import type { CandidateCard } from '@/backend/types';
import { getFortuneById, type Fortune } from './fortune';
import { isBlocked } from './moderation/blocklist';
import { clean } from './moderation/normalize';
import { hasPii } from './moderation/pii';
import { findSeedBySlug } from './seed';
import { decodeShare, encodeShare } from './shareCodec';
import { vnDay } from './time';
import type { ZoneId } from './rules';

export const ANONYMOUS_NAME = 'Một người qua đường';
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface PublicCandidate {
  slug: string;
  name: string;
  sign: string;
  title: string;
  zone: ZoneId;
  xu: number;
  /** sample candidate shipped with the app */
  sample: boolean;
  /** came from a `?d=` payload created in someone's browser (demo mode) */
  demo: boolean;
  /** already hired (Supabase mode only) */
  placed?: boolean;
}

/** Name coming from a query string: cleaned, <= 24 chars, never blocked or PII-like, otherwise a neutral fallback. */
export function sanitizeShareName(raw: string | null | undefined): string {
  const s = clean(raw ?? '');
  if (!s || [...s].length > 24 || isBlocked(s) || hasPii(s)) return ANONYMOUS_NAME;
  return s;
}

/** `YYYY-MM-DD` that is a real calendar day, otherwise null. */
export function sanitizeShareDay(raw: string | null | undefined): string | null {
  if (!raw || !DAY_RE.test(raw)) return null;
  const t = Date.parse(`${raw}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== raw) return null;
  return raw;
}

/** Seed slugs resolve from the shipped sample data; other slugs need a validated `d` payload (demo mode). */
export function resolvePublicCandidate(slug: string, d: string | null | undefined, nowMs: number): PublicCandidate | null {
  if (!SLUG_RE.test(slug)) return null;
  const seed = findSeedBySlug(slug, nowMs);
  if (seed) {
    return { slug, name: seed.displayName, sign: seed.signText, title: seed.title, zone: seed.zone, xu: seed.xuTotal, sample: true, demo: false };
  }
  const p = decodeShare(d);
  if (!p) return null;
  return { slug, name: p.n, sign: p.s, title: p.t, zone: p.z, xu: p.x, sample: false, demo: true };
}

/** Path to share for a candidate. Non-sample demo candidates carry their sign in `?d=` because the server cannot read localStorage. */
export function candidateSharePath(c: Pick<CandidateCard, 'slug' | 'isSample' | 'displayName' | 'signText' | 'title' | 'zone' | 'totals'>): string {
  const base = `/c/${c.slug}`;
  if (c.isSample) return base;
  const enc = encodeShare({ n: c.displayName, s: c.signText ?? '', t: c.title, z: c.zone, x: c.totals.xu });
  return enc ? `${base}?d=${enc}` : base;
}

/** `sig` comes from /api/share/sign; without it the server ignores the name (anonymous card). */
export function fortuneSharePath(fortuneId: string, name: string, day: string, sig?: string | null): string {
  return `/q/${fortuneId}?n=${encodeURIComponent(name)}&d=${day}${sig ? `&s=${sig}` : ''}`;
}

export interface PublicFortune {
  fortune: Fortune;
  name: string;
  day: string;
}

export function resolvePublicFortune(id: string, n: string | null | undefined, d: string | null | undefined, nowMs: number): PublicFortune | null {
  const fortune = getFortuneById(id);
  if (!fortune) return null;
  return { fortune, name: sanitizeShareName(n), day: sanitizeShareDay(d) ?? vnDay(nowMs) };
}

/** Fit a long sign into the OG card: pick a font size from the text length (satori has no auto-shrink). */
export function ogSignFontSize(text: string): number {
  const n = [...text].length;
  if (n <= 24) return 84;
  if (n <= 40) return 68;
  if (n <= 60) return 56;
  return 46;
}

/** Label in the top-right corner of a candidate OG card: only sample/demo/placed cards get one, real signs none. */
export function ogStamp(c: Pick<PublicCandidate, 'demo' | 'sample' | 'placed'>): string {
  if (c.demo) return 'Bản demo';
  if (c.sample) return 'Ứng viên mẫu';
  if (c.placed) return 'Đã được bao trọn';
  return '';
}
