import type { Contact } from '@/backend/types';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RE = /^https?:\/\/[^\s<>"]+$/i;
const PHONE = /^\+?[0-9][0-9 .-]{7,14}$/;

export function validateContact(kind: string, value: string): boolean {
  if (value.length < 3 || value.length > 120) return false;
  if (kind === 'email') return EMAIL.test(value);
  if (kind === 'url') return URL_RE.test(value);
  if (kind === 'phone') return PHONE.test(value);
  return false;
}

/** Only http(s), mailto and tel hrefs are ever rendered as links. Returns null otherwise. */
export function toSafeHref(raw: string): string | null {
  const v = raw.trim();
  if (/^https?:\/\/[^\s<>"]+$/i.test(v)) {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
    } catch {
      return null;
    }
  }
  if (/^mailto:[^\s<>"]+$/i.test(v)) return v;
  if (/^tel:\+?[0-9 .-]+$/i.test(v)) return v;
  return null;
}

export function contactHref(c: Contact): string | null {
  if (c.kind === 'email') return toSafeHref(`mailto:${c.value}`);
  if (c.kind === 'phone') return toSafeHref(`tel:${c.value.replace(/\s/g, '')}`);
  return toSafeHref(c.value);
}

/** HR contact in invitations (0002): must look like an email, an http(s) URL or a phone number. Mirrors private.contact_ok. */
export function looksLikeContact(v: string): boolean {
  return EMAIL.test(v) || URL_RE.test(v) || PHONE.test(v);
}

/** Heuristic for HR contact in invitations: free text email / link / phone. */
export function guessContactKind(v: string): Contact['kind'] {
  if (v.includes('@') && !/^https?:/i.test(v)) return 'email';
  if (/^https?:/i.test(v)) return 'url';
  return 'phone';
}
