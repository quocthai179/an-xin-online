import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/lib/seed';
import { DAY_MS } from '@/lib/rules';

// supabase/seed.sql is generated from src/lib/seed.ts so the hosted street starts with the same "Mẫu" candidates as demo mode.
// Regenerate with:  GEN_SEED=1 pnpm vitest run tests/parity/seed-sql.test.ts
const FILE = path.resolve(__dirname, '../../supabase/seed.sql');
const BASE = Date.UTC(2026, 0, 1);

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (a: string[]) => `array[${a.map(q).join(', ')}]::text[]`;
const days = (ms: number) => Math.max(0, Math.round(ms / DAY_MS));

function build(): string {
  const rows = buildSeed(BASE);
  const lines: string[] = [
    '-- GENERATED from src/lib/seed.ts by tests/parity/seed-sql.test.ts (GEN_SEED=1). Do not edit by hand.',
    '-- Sample candidates ("Mẫu"): fictional, no owner (user_id null), cannot receive real 500k invitations (SAMPLE_CANDIDATE).',
    '-- Dates are relative to the moment the seed runs, so ranking decay and sitting time stay realistic.',
    '-- Safe to run more than once (on conflict do nothing).',
    '',
    'begin;',
  ];
  for (const s of rows) {
    lines.push(
      `insert into public.candidates (slug, is_sample, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,`,
      `  salary_negotiable, city, work_modes, bio, avatar, sitting_since, created_at, xu_total, love_total)`,
      `values (${q(s.slug)}, true, ${q(s.displayName)}, ${q(s.zone)}, ${q(s.signText)}, ${q(s.title)}, ${s.yearsExp}, ${arr(s.skills)},`,
      `  ${s.salaryMin ?? 'null'}, ${s.salaryMax ?? 'null'}, ${s.salaryNegotiable}, ${q(s.city)}, ${arr(s.workModes)},`,
      `  ${s.bio ? q(s.bio) : 'null'}, ${q(JSON.stringify(s.avatar))}::jsonb,`,
      `  now() - interval '${days(BASE - s.sittingSince)} days', now() - interval '${days(BASE - s.createdAt)} days', ${s.xuTotal}, ${s.loveTotal})`,
      `on conflict (slug) do nothing;`,
    );
    for (const d of s.daily) {
      const ago = days(BASE - Date.parse(`${d.day}T00:00:00Z`));
      lines.push(
        `insert into public.candidate_daily (candidate_id, day, xu, love)`,
        `select id, private.vn_today() - ${ago}, ${d.xu}, ${d.love} from public.candidates where slug = ${q(s.slug)}`,
        `on conflict (candidate_id, day) do nothing;`,
      );
    }
    lines.push('');
  }
  lines.push('commit;', '');
  return lines.join('\n');
}

describe('supabase/seed.sql', () => {
  if (process.env.GEN_SEED) writeFileSync(FILE, build());

  it('is up to date with src/lib/seed.ts', () => {
    expect(readFileSync(FILE, 'utf8')).toBe(build());
  });

  it('covers every sample slug', () => {
    const sql = readFileSync(FILE, 'utf8');
    for (const s of buildSeed(BASE)) expect(sql).toContain(`'${s.slug}'`);
  });
});
