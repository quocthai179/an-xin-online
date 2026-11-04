// DATA ONLY. Loose-form phrases (unaccented, lowercase, space separated) removed before blocklist matching,
// to rescue harmless text that collides with a blocked term. One phrase per line.
export const ALLOWLIST = String.raw`
`;

export function parseAllowlist(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}
