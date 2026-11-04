// Mirrors private.clean / private.loose in the SQL migration.

// control chars (except \n), soft hyphen, zero-width, bidi marks/overrides/isolates, word joiner, BOM
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/** NFKC + strip control/zero-width/bidi chars, collapse spaces, trim. Empty -> null. */
export function clean(p: string | null | undefined): string | null {
  const s = (p ?? '')
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/^ +| +$/g, '');
  return s === '' ? null : s;
}

/** Lowercased NFKC text, diacritics kept, tokens separated by single spaces (leading/trailing space added). */
export function exactForm(p: string | null | undefined): string {
  const t = (p ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return ` ${t} `;
}

export function unaccent(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

/** Unaccented, leet-mapped, tokenised; single letters separated by spaces are joined ("d m" -> "dm"). */
export function looseForm(p: string | null | undefined): string {
  const un = unaccent((p ?? '').normalize('NFKC').toLowerCase()).replace(/[013457@$]/g, (c) => LEET[c] ?? c);
  const tokens = un.replace(/[^a-z0-9]+/g, ' ').trim();
  const joined = tokens.replace(/\b([a-z0-9]) (?=[a-z0-9]\b)/g, '$1');
  return ` ${joined} `;
}

export function compactForm(loose: string): string {
  return loose.replace(/ /g, '');
}
