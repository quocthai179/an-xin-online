// BR-M4: no URL / email / phone in sign, bio, title, display name, company. Mirrors private.has_pii (0002_hardening.sql).
import { IGNORABLE_RE, MARKS_RE } from './unicode';

/** Dotted technology names that look like domains but are skills ("ASP.NET", "Socket.IO"). Same list in SQL. */
export const PII_TECH_RE = /\b(asp|vb|ado|ml)\.net\b|\b(socket|draw)\.io\b/g;
export const PII_TLDS = 'com|vn|net|io|me|org|dev|ly|co|xyz|info|biz|app|link|site|online|top|gg|cc|to|ai|tv|asia|us|gl';
const DOMAIN_RE = new RegExp(`(https?://|www\\.|[a-z0-9-]+\\.(${PII_TLDS})\\b)`);
const EMAIL_RE = /[^@\s]+@[^@\s]+\.[a-z]{2,}/;
const OBFUSCATED_RE = /[[({]\s*(at|dot|cham|a cong)\s*[\])}]/;
const SPELLED_TLD_RE = /\b(cham|dot)\s*(com|vn|org|io)\b/;
const AT_PROVIDER_RE = /(\b(at|a cong)\s*|@\s*)(gmail|yahoo|hotmail|outlook|icloud|proton)\b/;
const PHONE_RE = /(\+?84|0)[0-9]{8,10}/;

/** NFKC, ignorable chars dropped, lowercase, unaccented (đ -> d), non-ASCII -> space, tech names removed. */
export function piiForm(p: string | null | undefined): string {
  return (p ?? '')
    .normalize('NFKC')
    .replace(IGNORABLE_RE, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(MARKS_RE, '')
    .replace(/đ/g, 'd')
    .replace(/[^\u0001-\u007F]/g, ' ')
    .replace(PII_TECH_RE, ' ');
}

export function hasPii(p: string | null | undefined): boolean {
  const s = piiForm(p);
  if (DOMAIN_RE.test(s) || EMAIL_RE.test(s) || OBFUSCATED_RE.test(s) || SPELLED_TLD_RE.test(s) || AT_PROVIDER_RE.test(s)) return true;
  return PHONE_RE.test(s.replace(/[\s.\-()_/,*]/g, ''));
}
