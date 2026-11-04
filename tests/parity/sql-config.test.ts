import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIMITS, RANK } from '@/lib/rules';
import { BLOCKLIST, parseBlocklist } from '@/config/blocklist.vi';

const sql = readFileSync(path.join(__dirname, '../../supabase/migrations/0001_init.sql'), 'utf8');

function between(start: string, end: string): string {
  const a = sql.indexOf(start);
  const b = sql.indexOf(end);
  expect(a, `${start} marker`).toBeGreaterThan(-1);
  expect(b, `${end} marker`).toBeGreaterThan(a);
  return sql.slice(a + start.length, b);
}

describe('SQL parity', () => {
  it('private.cfg() JSON equals LIMITS', () => {
    const body = between('-- BEGIN:LIMITS_JSON', '-- END:LIMITS_JSON').trim();
    expect(body.startsWith("'")).toBe(true);
    expect(body.endsWith("'")).toBe(true);
    const json = JSON.parse(body.slice(1, -1));
    expect(json).toEqual(JSON.parse(JSON.stringify(LIMITS)));
  });

  it('rank weights used by SQL decay match RANK', () => {
    const json = JSON.parse(between('-- BEGIN:LIMITS_JSON', '-- END:LIMITS_JSON').trim().slice(1, -1));
    expect(json.rank).toEqual({ halfLifeDays: RANK.halfLifeDays, windowDays: RANK.windowDays, loveDailyCap: RANK.loveDailyCap });
  });

  it('SQL blocklist rows equal src/config/blocklist.vi.ts', () => {
    const body = between('-- BEGIN:BLOCKLIST_SQL', '-- END:BLOCKLIST_SQL');
    const rows = [...body.matchAll(/\('([^']+)','(exact|loose|compact)'\)/g)].map((m) => `${m[1].normalize('NFKC')}|${m[2]}`);
    const ts = parseBlocklist(BLOCKLIST).map((t) => `${t.term}|${t.mode}`);
    expect(new Set(rows).size).toBe(rows.length);
    expect([...rows].sort()).toEqual([...ts].sort());
  });

  it('every RPC granted to clients uses security definer with an empty search_path', () => {
    const fns = sql.match(/create or replace function public\.[a-z_]+\([\s\S]*?\$\$;/g) ?? [];
    expect(fns.length).toBeGreaterThan(15);
    for (const f of fns) {
      const name = /function (public\.[a-z_]+)/.exec(f)![1];
      expect(f, name).toMatch(/security definer set search_path = ''/);
    }
  });

  it('does not allow direct table writes for clients', () => {
    expect(sql).toMatch(/revoke all on all tables in schema public from anon, authenticated/);
    expect(sql).not.toMatch(/grant (insert|update|delete)/i);
  });
});
