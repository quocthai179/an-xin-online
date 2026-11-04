import { isZoneId } from './zones';
import type { ZoneId } from './rules';
import { clean } from './moderation/normalize';
import { isBlocked } from './moderation/blocklist';
import { hasPii } from './moderation/pii';

export interface SharePayload {
  n: string; // display name
  s: string; // sign
  t: string; // title
  z: ZoneId;
  x: number; // xu total
}

const MAX_ENCODED = 600;

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function encodeShare(p: SharePayload): string | null {
  const enc = b64urlEncode(JSON.stringify({ n: p.n, s: p.s, t: p.t, z: p.z, x: p.x }));
  return enc.length <= MAX_ENCODED ? enc : null;
}

/** Decodes AND re-validates / moderates. Returns null for anything suspicious. */
export function decodeShare(raw: string | null | undefined): SharePayload | null {
  if (!raw || raw.length > MAX_ENCODED || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const o = JSON.parse(b64urlDecode(raw)) as Record<string, unknown>;
    if (typeof o.n !== 'string' || typeof o.s !== 'string' || typeof o.t !== 'string') return null;
    if (!isZoneId(o.z)) return null;
    const n = clean(o.n);
    const s = clean(o.s);
    const t = clean(o.t);
    if (!n || !s || !t) return null;
    if ([...n].length > 24 || [...s].length > 80 || [...t].length > 60) return null;
    for (const f of [n, s, t]) if (isBlocked(f) || hasPii(f)) return null;
    const x = typeof o.x === 'number' && Number.isFinite(o.x) ? Math.max(0, Math.min(1_000_000, Math.floor(o.x))) : 0;
    return { n, s, t, z: o.z, x };
  } catch {
    return null;
  }
}
