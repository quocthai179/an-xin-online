/** BR-M4: URL / email / phone are not allowed in sign, bio, title. Mirrors private.has_pii. */
export function hasPii(p: string | null | undefined): boolean {
  const s = p ?? '';
  if (/(https?:\/\/|www\.|[a-z0-9-]+\.(com|vn|net|io|me|org|dev)\b)/i.test(s)) return true;
  if (/[^@\s]+@[^@\s]+\.[a-z]{2,}/i.test(s)) return true;
  return /(\+?84|0)[0-9]{8,10}/.test(s.replace(/[\s.\-()]/g, ''));
}
