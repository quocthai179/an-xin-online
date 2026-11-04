import { BLOCKLIST, parseBlocklist, type BlockMode } from '@/config/blocklist.vi';
import { ALLOWLIST, parseAllowlist } from '@/config/allowlist.vi';
import { clean, collapseRepeats, compactForm, exactForm, joinSingles, looseForm } from './normalize';

export interface ModerationConfig {
  terms: { term: string; mode: BlockMode }[];
  allow: string[];
}

export const DEFAULT_CONFIG: ModerationConfig = {
  terms: parseBlocklist(BLOCKLIST),
  allow: parseAllowlist(ALLOWLIST),
};

/**
 * Mirrors private.is_blocked. Passes (any hit blocks):
 *  - exact   : token match on the diacritic-sensitive form, its single-letter-joined form, and (for terms without
 *              doubled letters) its repeated-letter-collapsed form ("l ồ n", "lồnnnn")
 *  - loose   : token match on the unaccented/leet/joined form and (collapse-invariant terms) its collapsed form
 *  - compact : substring match on the loose form without spaces (and its collapsed variant)
 */
export function isBlocked(text: string | null | undefined, cfg: ModerationConfig = DEFAULT_CONFIG): boolean {
  const c = clean(text);
  if (!c) return false;
  const exact = exactForm(c);
  const exactJ = joinSingles(exact);
  const exactC = collapseRepeats(exactJ);
  let loose = looseForm(c);
  for (const a of cfg.allow) loose = loose.split(` ${a} `).join(' ');
  const looseC = collapseRepeats(loose);
  const compact = compactForm(loose);
  const compactC = compactForm(looseC);
  return cfg.terms.some(({ term, mode }) => {
    const inv = collapseRepeats(term) === term;
    const tok = ` ${term} `;
    if (mode === 'exact') return exact.includes(tok) || exactJ.includes(tok) || (inv && exactC.includes(tok));
    if (mode === 'loose') return loose.includes(tok) || (inv && looseC.includes(tok));
    return compact.includes(term) || (inv && compactC.includes(term));
  });
}
