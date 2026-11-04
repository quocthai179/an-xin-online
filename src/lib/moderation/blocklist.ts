import { BLOCKLIST, parseBlocklist, type BlockMode } from '@/config/blocklist.vi';
import { ALLOWLIST, parseAllowlist } from '@/config/allowlist.vi';
import { clean, compactForm, exactForm, looseForm } from './normalize';

export interface ModerationConfig {
  terms: { term: string; mode: BlockMode }[];
  allow: string[];
}

export const DEFAULT_CONFIG: ModerationConfig = {
  terms: parseBlocklist(BLOCKLIST),
  allow: parseAllowlist(ALLOWLIST),
};

export function isBlocked(text: string | null | undefined, cfg: ModerationConfig = DEFAULT_CONFIG): boolean {
  const c = clean(text);
  if (!c) return false;
  const exact = exactForm(c);
  let loose = looseForm(c);
  for (const a of cfg.allow) loose = loose.split(` ${a} `).join(' ');
  const compact = compactForm(loose);
  return cfg.terms.some(({ term, mode }) => {
    if (mode === 'exact') return exact.includes(` ${term} `);
    if (mode === 'loose') return loose.includes(` ${term} `);
    return compact.includes(term);
  });
}
