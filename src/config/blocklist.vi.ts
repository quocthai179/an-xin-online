// DATA ONLY. One entry per line: `term|mode` (modes: exact | loose | compact).
// Mirrored by hand in supabase/migrations/0001_init.sql (BEGIN:BLOCKLIST_SQL); tests/parity keeps both in sync.
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
