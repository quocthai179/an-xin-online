import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIMITS, RANK, ZONE_IDS } from '@/lib/rules';
import { BLOCKLIST, parseBlocklist } from '@/config/blocklist.vi';
import { HOMOGLYPH_FROM, HOMOGLYPH_TO, sqlClass } from '@/lib/moderation/unicode';
import { IGNORABLE_RANGES, MARK_RANGES } from '@/lib/moderation/unicodeData';
import { PII_TECH_RE, PII_TLDS } from '@/lib/moderation/pii';

// Migrations apply in file-name order; the effective definition of a function / config is the LAST one.
const DIR = path.join(__dirname, '../../supabase/migrations');
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const migrations = files.map((f) => ({ name: f, sql: readFileSync(path.join(DIR, f), 'utf8') }));
const all = migrations.map((m) => m.sql).join('\n');

function blocks(sql: string, start: string, end: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const a = sql.indexOf(start, from);
    if (a < 0) return out;
    const b = sql.indexOf(end, a);
    expect(b, `${end} marker after ${start}`).toBeGreaterThan(a);
    out.push(sql.slice(a + start.length, b));
    from = b + end.length;
  }
}

/** body between markers in the last migration that has them */
function latest(start: string, end: string): string {
  for (const m of [...migrations].reverse()) {
    const b = blocks(m.sql, start, end);
    if (b.length) return b[b.length - 1];
  }
  throw new Error(`no ${start} marker in any migration`);
}

const cfgJson = () => {
  const body = latest('-- BEGIN:LIMITS_JSON', '-- END:LIMITS_JSON').trim();
  expect(body.startsWith("'")).toBe(true);
  expect(body.endsWith("'")).toBe(true);
  return JSON.parse(body.slice(1, -1));
};

describe('SQL parity', () => {
  it('migrations are ordered 0001_init, 0002_hardening, ...', () => {
    expect(files.slice(0, 2)).toEqual(['0001_init.sql', '0002_hardening.sql']);
  });

  it('private.cfg() JSON (latest migration) equals LIMITS', () => {
    expect(cfgJson()).toEqual(JSON.parse(JSON.stringify(LIMITS)));
  });

  it('rank weights used by SQL decay match RANK', () => {
    expect(cfgJson().rank).toEqual({ halfLifeDays: RANK.halfLifeDays, windowDays: RANK.windowDays, loveDailyCap: RANK.loveDailyCap });
  });

  it('SQL blocklist rows (all migrations) equal src/config/blocklist.vi.ts', () => {
    const body = blocks(all, '-- BEGIN:BLOCKLIST_SQL', '-- END:BLOCKLIST_SQL').join('\n');
    const rows = [...body.matchAll(/\('([^']+)','(exact|loose|compact)'\)/g)].map((m) => `${m[1].normalize('NFKC')}|${m[2]}`);
    const ts = parseBlocklist(BLOCKLIST).map((t) => `${t.term}|${t.mode}`);
    expect(new Set(rows).size).toBe(rows.length);
    expect([...rows].sort()).toEqual([...ts].sort());
  });

  it('SQL moderation classes are generated from the shared Unicode ranges', () => {
    const body = latest('-- BEGIN:MOD_CLASSES', '-- END:MOD_CLASSES');
    expect(body).toContain(`regexp_replace(p, '[${sqlClass(MARK_RANGES)}]', '', 'g')`);
    expect(body).toContain(`regexp_replace(p, '[${sqlClass(IGNORABLE_RANGES)}]', '', 'g')`);
  });

  it('SQL homoglyph table equals the TS one', () => {
    const body = latest('-- BEGIN:HOMOGLYPHS', '-- END:HOMOGLYPHS');
    const lits = [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    expect(lits).toEqual([HOMOGLYPH_FROM, HOMOGLYPH_TO]);
  });

  it('SQL has_pii uses the same TLD list and tech-name exceptions', () => {
    expect(all).toContain(`[a-z0-9-]+\\.(${PII_TLDS})\\y)`);
    expect(all).toContain(PII_TECH_RE.source.replace(/\\b/g, '\\y'));
  });

  it('realtime pos: topics are exactly pos:<zone> + pos:plaza', () => {
    const body = latest('-- BEGIN:POS_TOPICS', '-- END:POS_TOPICS');
    const topics = [...body.matchAll(/'(pos:[a-z_]+)'/g)].map((m) => m[1]);
    expect([...topics].sort()).toEqual(['pos:plaza', ...ZONE_IDS.map((z) => `pos:${z}`)].sort());
    // the write policy repeats the same array literal
    const arr = /array\[[^\]]*'pos:plaza'[^\]]*\]/.exec(body)![0];
    expect(all.split(arr).length - 1).toBeGreaterThanOrEqual(2);
    expect(all).not.toMatch(/alter policy rt_(read|write)[\s\S]{0,200}like 'pos:%'/);
  });

  it('every RPC defined in any migration uses security definer with an empty search_path', () => {
    const fns = all.match(/create or replace function public\.[a-z_]+\([\s\S]*?\$\$;/g) ?? [];
    expect(fns.length).toBeGreaterThan(30);
    for (const f of fns) {
      const name = /function (public\.[a-z_]+)/.exec(f)![1];
      expect(f, name).toMatch(/security definer set search_path = ''/);
    }
  });

  it('does not allow direct table writes for clients', () => {
    expect(all).toMatch(/revoke all on all tables in schema public from anon, authenticated/);
    expect(all).not.toMatch(/grant (insert|update|delete)/i);
  });

  it('0002 never redefines a 0001 table or edits 0001 history', () => {
    const m2 = migrations[1].sql;
    expect(m2).not.toMatch(/create table (public\.)?(profiles|candidates|reports|invitations|offers|gifts)\b/);
    expect(m2).not.toMatch(/\bdrop table\b|\btruncate\b/i);
  });
});
