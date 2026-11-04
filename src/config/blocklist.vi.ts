// DATA ONLY. One entry per line: `term|mode` (modes: exact | loose | compact).
// Mirrored by hand in supabase/migrations/*.sql (every BEGIN:BLOCKLIST_SQL block, unioned); tests/parity keeps both in sync.
// Modes: exact = diacritic-sensitive token (use for words whose unaccented form is a normal word: cặc/các, lồn/lớn, buồi/buổi),
//        loose = unaccented/leet token, compact = substring of the loose form without spaces (long distinctive terms only).
export type BlockMode = 'exact' | 'loose' | 'compact';

export const BLOCKLIST = String.raw`
dm|loose
dcm|loose
dmm|loose
vcl|loose
vkl|loose
vl|loose
cmm|loose
clm|loose
dit|loose
dit me|loose
du ma|loose
cho chet|loose
lồn|exact
buồi|exact
cặc|exact
đĩ|exact
đéo|exact
địt|exact
ngu như chó|exact
đa cấp|exact
ditconme|compact
dumamay|compact
chuyenkhoan|compact
stk ngan hang|loose
casino|loose
nhacai|compact
kiemtienonline|compact
# 0002_hardening: common variants and scam phrases
loz|loose
cak|loose
cặk|exact
djt|loose
dkm|loose
vcc|loose
clgt|loose
óc chó|exact
buoi|exact
fuck|loose
fck|loose
shit|loose
bitch|loose
viecnheluongcao|compact
congtacvienonline|compact
naptiennhanviec|compact
`;

export function parseBlocklist(raw: string): { term: string; mode: BlockMode }[] {
  const out: { term: string; mode: BlockMode }[] = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.lastIndexOf('|');
    const term = t.slice(0, i).normalize('NFKC');
    const mode = t.slice(i + 1) as BlockMode;
    if (mode !== 'exact' && mode !== 'loose' && mode !== 'compact') throw new Error(`bad blocklist line: ${line}`);
    out.push({ term, mode });
  }
  return out;
}
