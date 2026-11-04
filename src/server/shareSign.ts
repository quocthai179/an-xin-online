// L6: the fortune share link carries a player name (`/q/<id>?n=&d=&s=`). Without a signature anybody could put arbitrary text
// on the brand domain and in the OG image, so the name is only honoured when it carries a valid HMAC issued by /api/share/sign.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sanitizeShareName, ANONYMOUS_NAME } from '@/lib/shareData';

const SIG_LEN = 22;

function sigOf(secret: string, id: string, name: string, day: string): string {
  return createHmac('sha256', secret).update(`${id}\n${name}\n${day}`).digest('base64url').slice(0, SIG_LEN);
}

/** Signature for an already-moderated name, or null when no secret is configured or the name would be replaced by the sanitiser. */
export function signShareName(id: string, name: string, day: string, secret = process.env.SHARE_SECRET): string | null {
  if (!secret || secret.length < 16) return null;
  if (sanitizeShareName(name) !== name || name === ANONYMOUS_NAME) return null;
  return sigOf(secret, id, name, day);
}

/** The name to show: the supplied one when its signature is valid, otherwise null (callers then use the anonymous name). */
export function verifiedShareName(
  id: string,
  name: string | null | undefined,
  day: string | null | undefined,
  sig: string | null | undefined,
  secret = process.env.SHARE_SECRET,
): string | null {
  if (!secret || secret.length < 16 || !name || !day || !sig) return null;
  const expected = Buffer.from(sigOf(secret, id, name, day));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return name;
}
