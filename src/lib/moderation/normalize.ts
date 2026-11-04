// Mirrors private.clean / private.mod_base / private.loose / private.mod_join / private.mod_collapse in SQL
// (supabase/migrations/0002_hardening.sql). Change both together; tests/parity/moderation-*.test.ts checks them.
import { IGNORABLE_RE, MARKS_RE, translateHomoglyphs } from './unicode';

// Stored text: control chars (except \n), soft hyphen, CGJ, Arabic letter mark, Hangul fillers (U+115F, U+1160, U+3164,
// U+FFA0), Mongolian vowel separator, zero-width, bidi marks/overrides/isolates, word joiner/invisible operators,
// braille blank, BOM.
const INVISIBLE =
  /[\u0000-\u0008\u000B-\u001F\u007F­͏؜ᅟᅠ᠎​-‏‪-‮⁠-⁤⁦-⁩⠀ㅤ﻿ﾠ]/g;

/** NFKC + strip control/zero-width/bidi/filler chars, collapse spaces, trim. Empty -> null. */
export function clean(p: string | null | undefined): string | null {
  const s = (p ?? '')
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/^ +| +$/g, '');
  return s === '' ? null : s;
}

/**
 * Moderation base form: NFKC, lowercase, drop default-ignorable chars, map homoglyphs (on NFD so that a Cyrillic "о" +
 * combining marks recomposes into a Latin "ồ"), NFC, then strip every combining mark that is still left over.
 * Vietnamese diacritics survive (they are precomposed after NFC).
 */
export function modBase(p: string | null | undefined): string {
  const s = (p ?? '').normalize('NFKC').toLowerCase().replace(IGNORABLE_RE, '');
  return translateHomoglyphs(s.normalize('NFD')).normalize('NFC').replace(MARKS_RE, '');
}

/** Lowercased text, diacritics kept, tokens separated by single spaces (leading/trailing space added). */
export function exactForm(p: string | null | undefined): string {
  const t = modBase(p).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return ` ${t} `;
}

/** Joins runs of single-character tokens of a padded form: " l ồ n " -> " lồn ". */
export function joinSingles(padded: string): string {
  return padded.replace(/(?<= )(\S) (?=\S )/gu, '$1');
}

/** Collapses repeated letters: "lồnnnn" -> "lồn". Only used with collapse-invariant terms. */
export function collapseRepeats(s: string): string {
  return s.replace(/(\p{L})\1+/gu, '$1');
}

/** Removes Vietnamese (and any other) diacritics; đ -> d. */
export function unaccent(s: string): string {
  return s.normalize('NFD').replace(MARKS_RE, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

/** Unaccented, leet-mapped, tokenised; single letters separated by spaces are joined ("d m" -> "dm"). */
export function looseForm(p: string | null | undefined): string {
  const un = unaccent(modBase(p)).replace(/[013457@$]/g, (c) => LEET[c] ?? c);
  const tokens = un.replace(/[^a-z0-9]+/g, ' ').trim();
  const joined = tokens.replace(/\b([a-z0-9]) (?=[a-z0-9]\b)/g, '$1');
  return ` ${joined} `;
}

export function compactForm(loose: string): string {
  return loose.replace(/ /g, '');
}
