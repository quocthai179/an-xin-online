// Regex character classes built from the shared Unicode ranges, in JS and in PostgreSQL ARE syntax.
// The SQL migration embeds sqlClass(...) output literally (BEGIN:MOD_CLASSES); tests/parity checks they match.
import { IGNORABLE_RANGES, MARK_RANGES } from './unicodeData';

type Ranges = readonly (readonly [number, number])[];

const hex = (n: number, w: number) => n.toString(16).toUpperCase().padStart(w, '0');

/** Body of a JS bracket expression (use with the `u` flag). */
export function jsClass(r: Ranges): string {
  return r.map(([a, b]) => (a === b ? `\\u{${hex(a, 1)}}` : `\\u{${hex(a, 1)}}-\\u{${hex(b, 1)}}`)).join('');
}

/** Body of a PostgreSQL ARE bracket expression (\uXXXX for the BMP, \UXXXXXXXX above it). */
export function sqlClass(r: Ranges): string {
  const e = (n: number) => (n <= 0xffff ? `\\u${hex(n, 4)}` : `\\U${hex(n, 8)}`);
  return r.map(([a, b]) => (a === b ? e(a) : `${e(a)}-${e(b)}`)).join('');
}

export const MARKS_RE = new RegExp(`[${jsClass(MARK_RANGES)}]`, 'gu');
export const IGNORABLE_RE = new RegExp(`[${jsClass(IGNORABLE_RANGES)}]`, 'gu');

/**
 * Homoglyphs (after lowercasing + NFD) mapped to Latin before matching: Cyrillic, Greek and a few Latin look-alikes.
 * Pairs are positional: HOMOGLYPH_FROM[i] -> HOMOGLYPH_TO[i]. SQL uses translate() with the same two strings.
 */
export const HOMOGLYPH_FROM = 'авекмнопрстухьѕіјԁӏһԛԝүαβγεηικνορτυχωμϲϳıɑɡøł';
export const HOMOGLYPH_TO = 'abekmhonpctyxbsijdlhqwyabyenikvoptuxwucjiagol';

const HOMO = new Map<string, string>();
{
  const f = [...HOMOGLYPH_FROM];
  const t = [...HOMOGLYPH_TO];
  if (f.length !== t.length) throw new Error('homoglyph table length mismatch');
  f.forEach((c, i) => HOMO.set(c, t[i]));
}

export function translateHomoglyphs(s: string): string {
  let out = '';
  for (const ch of s) out += HOMO.get(ch) ?? ch;
  return out;
}
