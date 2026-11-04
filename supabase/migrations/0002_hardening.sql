-- =====================================================================
-- supabase/migrations/0002_hardening.sql — Phố Xin Việc 3D: launch hardening
-- (review 2026-11-04 M2/M4/minors/nits, security audit 2026-11-04 H1-H3, M1, M2, M4, M5, L1, L4, L5, I1)
--
-- Treat 0001 as shipped: this file only adds columns/tables/indexes and CREATE OR REPLACEs functions/policies.
-- Every change is additive and backward compatible with the 0001 client RPC signatures, except
-- admin_list_pending() which gains (p_offset, p_limit) params WITH defaults (old no-arg calls keep working).
--
-- Lock / rewrite notes (all tables are empty or tiny at first deploy; see .squad/DB-VERIFICATION.md section 9):
--   * ADD COLUMN nullable / constant default        -> metadata only, ACCESS EXCLUSIVE for milliseconds
--   * CREATE INDEX on private.rate_hits             -> blocks writes on that table while building (tiny, purged every 25 h)
--   * ALTER POLICY on realtime.messages             -> ACCESS EXCLUSIVE for milliseconds; lock_timeout below makes it
--                                                      fail fast (retry the push) instead of queueing behind Realtime
-- Mirrors: src/lib/rules.ts (cfg), src/config/blocklist.vi.ts (blocklist), src/lib/moderation/** (normalizer, PII),
--          src/backend/demo/engine.ts + src/lib/limits.ts (check order, error codes). tests/parity/** keeps them in sync.
-- =====================================================================
set lock_timeout = '5s';
set statement_timeout = '120s';

-- ---------- Config: MUST mirror src/lib/rules.ts LIMITS (parity test reads the LAST migration with these markers) ----------
create or replace function private.cfg() returns jsonb
language sql immutable as $fn$
select
-- BEGIN:LIMITS_JSON
'{"zones":["backend","frontend","design","mobile","data_ai","qa","pm_ba","devops","fresher","other"],
  "xu":{"perDay":10,"perCandidatePerDay":2},
  "love":{"perDay":5,"perCandidatePerDay":1,"perIpPerDay":30},
  "invite":{"perDay":3,"cooldownDays":7,"maxOpenPerCandidate":5,"expireDays":14,"messageMin":10,"messageMax":200,"contactMin":3,"contactMax":120},
  "offer":{"maxOpenPerHr":3,"expireDays":7,"positionMax":60,"packageMax":100,"messageMax":300},
  "giftOpsPerSecond":5,"profileCreatePer10Min":1,"signEditsPerHour":10,"zoneChangeHours":24,"nameChangeHours":24,
  "hrSignupsPerIpPerHour":3,"reportsToHideSign":5,"reportsPerDay":20,"seatsPerZone":30,
  "rank":{"halfLifeDays":7,"windowDays":60,"loveDailyCap":20},
  "reporterMinAgeMinutes":60,"hrInviteMinAgeMinutes":10,"contactViewsPerHour":20,
  "profileUpdatesPerMinute":5,"statusChangesPerMinute":4,"candidateCreatesPerDay":3,
  "placedVisibleDays":30,"listMax":3000,"rateRetentionHours":25}'
-- END:LIMITS_JSON
::jsonb
$fn$;

-- =====================================================================
-- Schema additions
-- =====================================================================
-- when the profile (last) became HR: account-age gate for send_invitation (H1). Reset by every switch to HR.
alter table public.profiles add column if not exists hr_since timestamptz;
update public.profiles set hr_since = created_at where role = 'hr' and hr_since is null;   -- empty at first deploy

-- admin hide = moderation lock: the owner cannot sit again until an admin 'unhide's (M1)
alter table public.candidates add column if not exists mod_hidden_at timestamptz;

-- false = reporter profile younger than reporterMinAgeMinutes: stored for audit, not counted toward auto-hide (M2)
alter table public.reports add column if not exists counted boolean not null default true;

-- user-level ban (admin action 'ban' / admin_ban_user): checked by every content-creating RPC (M1)
create table if not exists private.bans (
  user_id    uuid primary key,              -- no FK: a ban outlives the auth user row
  reason     text,
  created_at timestamptz not null default now()
);

-- moderation state of a deleted candidate, re-applied when the same user creates a new one (M1)
create table if not exists private.candidate_tombstones (
  user_id     uuid primary key,
  sign_locked boolean not null default false,   -- recreate starts sign_state = 'pending_review'
  hide_locked boolean not null default false,   -- recreate starts status = 'hidden' + mod_hidden_at
  created_at  timestamptz not null default now()
);

-- deterministic rate_hits retention (L4): one row, last purge time
create table if not exists private.maint (name text primary key, at timestamptz not null);
insert into private.maint(name, at) values ('rate_purge', '-infinity') on conflict do nothing;
create index if not exists rate_hits_bucket_idx on private.rate_hits (bucket);

alter table private.bans                 enable row level security;
alter table private.candidate_tombstones enable row level security;
alter table private.maint                enable row level security;
revoke all on private.bans, private.candidate_tombstones, private.maint from public, anon, authenticated;

-- =====================================================================
-- Moderation (mirrors src/lib/moderation/*). Three modes as in 0001, each matched on several forms:
--   exact   : diacritic-sensitive tokens; + single-letter-joined pass; + repeated-letter-collapsed pass
--   loose   : unaccented + leet + joined tokens; + collapsed pass
--   compact : substring of loose without spaces; + collapsed pass
-- Collapsed passes only use terms that contain no doubled letter ("cmm"/"dmm"/"vcc" never match a collapsed "cm").
-- =====================================================================
-- BEGIN:MOD_CLASSES  (generated from src/lib/moderation/unicodeData.ts; parity test compares)
create or replace function private.mod_strip_marks(p text) returns text
language sql immutable parallel safe as $$
  select regexp_replace(p, '[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u0897-\u089F\u08CA-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962-\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7-\u09C8\u09CB-\u09CD\u09D7\u09E2-\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47-\u0A48\u0A4B-\u0A4D\u0A51\u0A70-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2-\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47-\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B62-\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3C\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55-\u0C56\u0C62-\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5-\u0CD6\u0CE2-\u0CE3\u0CF3\u0D00-\u0D03\u0D3B-\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62-\u0D63\u0D81-\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2-\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECE\u0F18-\u0F19\u0F35\u0F37\u0F39\u0F3E-\u0F3F\u0F71-\u0F84\u0F86-\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1715\u1732-\u1734\u1752-\u1753\u1772-\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u180F\u1885-\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ADD\u1AE0-\u1AEB\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099-\u309A\uA66F-\uA672\uA674-\uA67D\uA69E-\uA69F\uA6F0-\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA82C\uA880-\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C-\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7-\uAAB8\uAABE-\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5-\uAAF6\uABE3-\uABEA\uABEC-\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F\U000101FD\U000102E0\U00010376-\U0001037A\U00010A01-\U00010A03\U00010A05-\U00010A06\U00010A0C-\U00010A0F\U00010A38-\U00010A3A\U00010A3F\U00010AE5-\U00010AE6\U00010D24-\U00010D27\U00010D69-\U00010D6D\U00010EAB-\U00010EAC\U00010EFA-\U00010EFF\U00010F46-\U00010F50\U00010F82-\U00010F85\U00011000-\U00011002\U00011038-\U00011046\U00011070\U00011073-\U00011074\U0001107F-\U00011082\U000110B0-\U000110BA\U000110C2\U00011100-\U00011102\U00011127-\U00011134\U00011145-\U00011146\U00011173\U00011180-\U00011182\U000111B3-\U000111C0\U000111C9-\U000111CC\U000111CE-\U000111CF\U0001122C-\U00011237\U0001123E\U00011241\U000112DF-\U000112EA\U00011300-\U00011303\U0001133B-\U0001133C\U0001133E-\U00011344\U00011347-\U00011348\U0001134B-\U0001134D\U00011357\U00011362-\U00011363\U00011366-\U0001136C\U00011370-\U00011374\U000113B8-\U000113C0\U000113C2\U000113C5\U000113C7-\U000113CA\U000113CC-\U000113D0\U000113D2\U000113E1-\U000113E2\U00011435-\U00011446\U0001145E\U000114B0-\U000114C3\U000115AF-\U000115B5\U000115B8-\U000115C0\U000115DC-\U000115DD\U00011630-\U00011640\U000116AB-\U000116B7\U0001171D-\U0001172B\U0001182C-\U0001183A\U00011930-\U00011935\U00011937-\U00011938\U0001193B-\U0001193E\U00011940\U00011942-\U00011943\U000119D1-\U000119D7\U000119DA-\U000119E0\U000119E4\U00011A01-\U00011A0A\U00011A33-\U00011A39\U00011A3B-\U00011A3E\U00011A47\U00011A51-\U00011A5B\U00011A8A-\U00011A99\U00011B60-\U00011B67\U00011C2F-\U00011C36\U00011C38-\U00011C3F\U00011C92-\U00011CA7\U00011CA9-\U00011CB6\U00011D31-\U00011D36\U00011D3A\U00011D3C-\U00011D3D\U00011D3F-\U00011D45\U00011D47\U00011D8A-\U00011D8E\U00011D90-\U00011D91\U00011D93-\U00011D97\U00011EF3-\U00011EF6\U00011F00-\U00011F01\U00011F03\U00011F34-\U00011F3A\U00011F3E-\U00011F42\U00011F5A\U00013440\U00013447-\U00013455\U0001611E-\U0001612F\U00016AF0-\U00016AF4\U00016B30-\U00016B36\U00016F4F\U00016F51-\U00016F87\U00016F8F-\U00016F92\U00016FE4\U00016FF0-\U00016FF1\U0001BC9D-\U0001BC9E\U0001CF00-\U0001CF2D\U0001CF30-\U0001CF46\U0001D165-\U0001D169\U0001D16D-\U0001D172\U0001D17B-\U0001D182\U0001D185-\U0001D18B\U0001D1AA-\U0001D1AD\U0001D242-\U0001D244\U0001DA00-\U0001DA36\U0001DA3B-\U0001DA6C\U0001DA75\U0001DA84\U0001DA9B-\U0001DA9F\U0001DAA1-\U0001DAAF\U0001E000-\U0001E006\U0001E008-\U0001E018\U0001E01B-\U0001E021\U0001E023-\U0001E024\U0001E026-\U0001E02A\U0001E08F\U0001E130-\U0001E136\U0001E2AE\U0001E2EC-\U0001E2EF\U0001E4EC-\U0001E4EF\U0001E5EE-\U0001E5EF\U0001E6E3\U0001E6E6\U0001E6EE-\U0001E6EF\U0001E6F5\U0001E8D0-\U0001E8D6\U0001E944-\U0001E94A\U000E0100-\U000E01EF]', '', 'g')
$$;
create or replace function private.mod_strip_ignorable(p text) returns text
language sql immutable parallel safe as $$
  select regexp_replace(p, '[\u00AD\u034F\u061C\u115F-\u1160\u17B4-\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF0-\uFFF8\U0001BCA0-\U0001BCA3\U0001D173-\U0001D17A\U000E0000-\U000E0FFF\u2800]', '', 'g')
$$;
-- END:MOD_CLASSES

-- Stored text: NFKC + strip control / zero-width / bidi / filler chars, collapse spaces, trim. Mirrors normalize.ts clean()
create or replace function private.clean(p text) returns text
language sql immutable as $$
  select nullif(btrim(regexp_replace(regexp_replace(
           normalize(coalesce(p, ''), NFKC),
           '[\u0001-\u0008\u000B-\u001F\u007F­͏؜ᅟᅠ᠎​-‏‪-‮⁠-⁤⁦-⁩⠀ㅤ﻿ﾠ]', '', 'g'),
         '[ \t]+', ' ', 'g')), '')
$$;

-- NFKC, lower, drop ignorables, homoglyphs -> Latin (on NFD), NFC, strip leftover combining marks. Mirrors modBase()
create or replace function private.mod_base(p text) returns text
language sql immutable as $$
  select private.mod_strip_marks(normalize(translate(
           normalize(private.mod_strip_ignorable(lower(normalize(coalesce(p, ''), NFKC))), NFD),
-- BEGIN:HOMOGLYPHS
           'авекмнопрстухьѕіјԁӏһԛԝүαβγεηικνορτυχωμϲϳıɑɡøł',
           'abekmhonpctyxbsijdlhqwyabyenikvoptuxwucjiagol'
-- END:HOMOGLYPHS
         ), NFC))
$$;

-- " l ồ n " -> " lồn " (padded input). Mirrors joinSingles()
create or replace function private.mod_join(p text) returns text
language sql immutable as $$ select regexp_replace(p, '(?<= )(\S) (?=\S )', '\1', 'g') $$;

-- "lồnnnn" -> "lồn". Mirrors collapseRepeats()
create or replace function private.mod_collapse(p text) returns text
language sql immutable as $$ select regexp_replace(p, '([[:alpha:]])\1+', '\1', 'g') $$;

-- unpadded loose form (0001 contract kept). Mirrors looseForm() without the padding
create or replace function private.loose(p text) returns text
language sql immutable as $$
  select regexp_replace(
           btrim(regexp_replace(
             translate(private.mod_strip_marks(normalize(private.mod_base(p), NFD)), 'đ013457@$', 'doieastas'),
             '[^a-z0-9]+', ' ', 'g')),
           '\m([a-z0-9]) (?=[a-z0-9]\M)', '\1', 'g')
$$;

create or replace function private.is_blocked(p text) returns boolean
language plpgsql stable as $$
declare
  v_c text := private.clean(p);
  v_exact text; v_exact_j text; v_exact_c text; v_loose text; v_loose_c text; v_compact text; v_compact_c text;
  a record;
begin
  if v_c is null then return false; end if;
  v_exact   := ' ' || btrim(regexp_replace(private.mod_base(v_c), '[^[:alnum:]]+', ' ', 'g')) || ' ';
  v_exact_j := private.mod_join(v_exact);
  v_exact_c := private.mod_collapse(v_exact_j);
  v_loose   := ' ' || private.loose(v_c) || ' ';
  for a in select phrase from private.allowlist loop
    v_loose := replace(v_loose, ' ' || a.phrase || ' ', ' ');
  end loop;
  v_loose_c   := private.mod_collapse(v_loose);
  v_compact   := replace(v_loose, ' ', '');
  v_compact_c := replace(v_loose_c, ' ', '');
  return exists (
    select 1 from private.blocklist b
    cross join lateral (select ' ' || b.term || ' ' as tok, private.mod_collapse(b.term) = b.term as inv) t
    where case b.mode
      when 'exact' then position(t.tok in v_exact) > 0 or position(t.tok in v_exact_j) > 0
                        or (t.inv and position(t.tok in v_exact_c) > 0)
      when 'loose' then position(t.tok in v_loose) > 0 or (t.inv and position(t.tok in v_loose_c) > 0)
      else position(b.term in v_compact) > 0 or (t.inv and position(b.term in v_compact_c) > 0)
    end);
end $$;

-- BEGIN:BLOCKLIST_SQL  (0002 additions; parity test unions every BLOCKLIST_SQL block and compares with blocklist.vi.ts)
insert into private.blocklist(term, mode) values
  ('loz','loose'), ('cak','loose'), ('cặk','exact'), ('djt','loose'), ('dkm','loose'), ('vcc','loose'), ('clgt','loose'),
  ('óc chó','exact'), ('buoi','exact'), ('fuck','loose'), ('fck','loose'), ('shit','loose'), ('bitch','loose'),
  ('viecnheluongcao','compact'), ('congtacvienonline','compact'), ('naptiennhanviec','compact')
on conflict do nothing;
-- END:BLOCKLIST_SQL

-- PII form: NFKC, ignorables dropped, lower, unaccented (đ -> d), non-ASCII -> space, dotted tech names removed. Mirrors piiForm()
create or replace function private.pii_form(p text) returns text
language sql immutable as $$
  select regexp_replace(regexp_replace(
           translate(private.mod_strip_marks(normalize(lower(private.mod_strip_ignorable(normalize(coalesce(p, ''), NFKC))), NFD)), 'đ', 'd'),
           '[^\u0001-\u007F]', ' ', 'g'),
         '\y(asp|vb|ado|ml)\.net\y|\y(socket|draw)\.io\y', ' ', 'g')
$$;

-- BR-M4 (+ M4): URL / email / obfuscated email / phone. Mirrors hasPii()
create or replace function private.has_pii(p text) returns boolean
language sql immutable as $$
  select s ~ '(https?://|www\.|[a-z0-9-]+\.(com|vn|net|io|me|org|dev|ly|co|xyz|info|biz|app|link|site|online|top|gg|cc|to|ai|tv|asia|us|gl)\y)'
      or s ~ '[^@\s]+@[^@\s]+\.[a-z]{2,}'
      or s ~ '[\[({]\s*(at|dot|cham|a cong)\s*[\])}]'
      or s ~ '\y(cham|dot)\s*(com|vn|org|io)\y'
      or s ~ '(\y(at|a cong)\s*|@\s*)(gmail|yahoo|hotmail|outlook|icloud|proton)\y'
      or regexp_replace(s, '[\s.\-()_/,*]', '', 'g') ~ '(\+?84|0)[0-9]{8,10}'
  from (select private.pii_form(p) as s) x
$$;

-- email / http(s) URL / phone (same regexes as candidate contact, lib/validation/contact.ts)
create or replace function private.contact_ok(p text) returns boolean
language sql immutable as $$
  select coalesce(p ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or p ~* '^https?://[^\s<>"]+$' or p ~ '^\+?[0-9][0-9 .-]{7,14}$', false)
$$;

-- =====================================================================
-- Rate limiting (L4: deterministic 25 h retention; H2: VN-day buckets, fail-closed IP)
-- =====================================================================
-- Purges rows older than rateRetentionHours at most every 5 minutes, piggybacking on hits; never blocks (try-lock).
-- Alternative on hosted Supabase: enable pg_cron and schedule
--   select cron.schedule('pxv-rate-purge', '*/10 * * * *', $c$delete from private.rate_hits where bucket < now() - interval '25 hours'$c$);
create or replace function private.purge_rate_hits() returns void
language plpgsql as $$
begin
  if (select at from private.maint where name = 'rate_purge') < now() - interval '5 minutes'
     and pg_try_advisory_xact_lock(hashtextextended('pxv:rate_purge', 0)) then
    update private.maint set at = now() where name = 'rate_purge';
    delete from private.rate_hits
     where bucket < now() - make_interval(hours => (private.cfg()->>'rateRetentionHours')::int);
  end if;
end $$;

create or replace function private.hit_at(p_key text, p_bucket timestamptz, p_max int) returns boolean
language plpgsql as $$
declare v_n int;
begin
  insert into private.rate_hits(key, bucket, n) values (p_key, p_bucket, 1)
  on conflict (key, bucket) do update set n = private.rate_hits.n + 1
  returning n into v_n;
  perform private.purge_rate_hits();
  return v_n <= p_max;
end $$;

-- fixed window aligned to the UTC epoch (seconds / minutes / hours)
create or replace function private.hit(p_key text, p_window interval, p_max int) returns boolean
language sql as $$
  select private.hit_at(p_key,
    to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window)), p_max)
$$;

-- one window per Vietnam calendar day (00:00 Asia/Ho_Chi_Minh), like gifts.day / invitations.day
create or replace function private.hit_day(p_key text, p_max int) returns boolean
language sql as $$
  select private.hit_at(p_key, private.vn_today()::timestamp at time zone 'Asia/Ho_Chi_Minh', p_max)
$$;

-- Client IP (H2). Never the LEFTMOST X-Forwarded-For entry (client-controlled). Order:
--   cf-connecting-ip (set by Cloudflare in front of hosted Supabase) > x-real-ip > RIGHTMOST x-forwarded-for entry
--   (appended by the closest proxy) > 'unknown' (fail CLOSED: every header-less caller shares one bucket).
-- MUST be verified on the hosted project after deploy (DB-VERIFICATION.md section 9, step "verify headers").
create or replace function private.client_ip() returns text
language sql stable as $$
  select left(lower(coalesce(
           nullif(btrim(h ->> 'cf-connecting-ip'), ''),
           nullif(btrim(h ->> 'x-real-ip'), ''),
           nullif(btrim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', -1)), ''),
           'unknown')), 64)
  from (select coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json) as h) s
$$;

create or replace function private.client_ip_hash() returns text
language sql stable as $$
  select encode(extensions.digest(private.client_ip() || (select value from private.secrets where name = 'ip_salt'), 'sha256'), 'hex')
$$;

-- =====================================================================
-- Helpers
-- =====================================================================
create or replace function private.is_banned(p_user uuid) returns boolean
language sql stable as $$ select exists (select 1 from private.bans where user_id = p_user) $$;

-- street reference to a candidate in gift/invite/offer events. hide_from_ticker -> name only, no id/zone (L1)
create or replace function private.cand_ref(c public.candidates) returns jsonb
language sql immutable as $$
  select case when c.hide_from_ticker then jsonb_build_object('name', private.ticker_name(c))
              else jsonb_build_object('id', c.id, 'name', private.ticker_name(c), 'zone', c.zone) end
$$;

-- visible (sitting / placed) -> candidate_upsert, otherwise candidate_remove: a hidden row is never re-broadcast (review M2)
create or replace function private.emit_card(c public.candidates) returns void
language plpgsql as $$
begin
  if c.status in ('sitting', 'placed') then
    perform private.street('candidate_upsert', jsonb_build_object('candidate', private.card_json(c)));
  else
    perform private.street('candidate_remove', jsonb_build_object('id', c.id));
  end if;
end $$;

-- =====================================================================
-- RPCs (signatures unchanged unless noted)
-- =====================================================================

-- ----- Profile (US-1) + H3 rate limit + M1 ban + M4 PII on name/company + H1 hr_since -----
create or replace function public.upsert_profile(p_display_name text, p_role public.user_role,
                                                 p_company text default null, p_avatar jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_cfg jsonb := private.cfg();
  v_name text := private.clean(p_display_name);
  v_company text := private.clean(p_company);
  v_old public.profiles%rowtype; v_new public.profiles%rowtype; v_ip text;
  v_cold public.candidates%rowtype; v_cand public.candidates%rowtype;
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  if private.is_banned(v_uid) then return private.err('BANNED'); end if;
  -- same order as validateProfileInput
  if v_name is null or char_length(v_name) not between 2 and 24 then return private.err('VALIDATION', 'display_name'); end if;
  if private.is_blocked(v_name) then return private.err('BLOCKED_CONTENT', 'display_name'); end if;
  if private.has_pii(v_name) then return private.err('PII_NOT_ALLOWED', 'display_name'); end if;
  if p_role is null then return private.err('VALIDATION', 'role'); end if;
  if p_role = 'hr' then
    if v_company is null or char_length(v_company) not between 2 and 40 then return private.err('VALIDATION', 'company'); end if;
    if private.is_blocked(v_company) then return private.err('BLOCKED_CONTENT', 'company'); end if;
    if private.has_pii(v_company) then return private.err('PII_NOT_ALLOWED', 'company'); end if;
  else v_company := null; end if;
  if p_avatar is null or pg_column_size(p_avatar) >= 1024 then return private.err('VALIDATION', 'avatar'); end if;

  select * into v_old from public.profiles where id = v_uid for update;
  if found and v_old.display_name <> v_name and v_old.name_changed_at is not null
     and v_old.name_changed_at > now() - make_interval(hours => (v_cfg->>'nameChangeHours')::int) then
    return private.err('NAME_CHANGE_COOLDOWN', 'display_name');
  end if;
  if not private.hit('prof_upd:' || v_uid, interval '1 minute', (v_cfg->>'profileUpdatesPerMinute')::int) then   -- H3
    return private.err('RATE_LIMITED', null, 60);
  end if;
  if p_role = 'hr' and (v_old.id is null or v_old.role <> 'hr') then           -- BR-SP3
    v_ip := private.client_ip_hash();
    if not private.hit('hr_ip:' || v_ip, interval '1 hour', (v_cfg->>'hrSignupsPerIpPerHour')::int) then
      return private.err('IP_LIMIT');
    end if;
  end if;

  insert into public.profiles(id, display_name, role, company, avatar, hr_since)
  values (v_uid, v_name, p_role, v_company, p_avatar, case when p_role = 'hr' then now() end)
  on conflict (id) do update set
    display_name = excluded.display_name, role = excluded.role, company = excluded.company, avatar = excluded.avatar,
    name_changed_at = case when public.profiles.display_name <> excluded.display_name then now() else public.profiles.name_changed_at end,
    hr_since = case when excluded.role <> 'hr' then null
                    when public.profiles.role = 'hr' then coalesce(public.profiles.hr_since, public.profiles.created_at)
                    else now() end,
    updated_at = now()
  returning * into v_new;

  select * into v_cold from public.candidates where user_id = v_uid for update;
  if v_cold.id is not null then
    update public.candidates set display_name = v_name, avatar = p_avatar, updated_at = now()
     where id = v_cold.id returning * into v_cand;
    if v_new.role <> 'candidate' and v_cand.status = 'sitting' then  -- A3: role switch hides profile
      update public.candidates set status = 'hidden' where id = v_cand.id;
      perform private.street('candidate_remove', jsonb_build_object('id', v_cand.id));
    elsif v_cand.status = 'sitting' and private.card_json(v_cand) is distinct from private.card_json(v_cold) then   -- H3: no no-op broadcast
      perform private.street('candidate_upsert', jsonb_build_object('candidate', private.card_json(v_cand)));
    end if;
  end if;
  return private.ok(to_jsonb(v_new));
end $$;

-- ----- Candidate profile (US-2, US-4) + M1 ban / tombstone / daily re-create cap + nits -----
create or replace function public.upsert_my_candidate(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_cfg jsonb := private.cfg();
  v_prof public.profiles%rowtype; v_old public.candidates%rowtype; v_new public.candidates%rowtype;
  v_sign text := private.clean(p->>'sign_text');
  v_title text := private.clean(p->>'title');
  v_bio text := private.clean(p->>'bio');
  v_city text := private.clean(p->>'city');
  v_zone text := p->>'zone';
  v_ckind text := p->>'contact_kind';
  v_cval text := private.clean(p->>'contact_value');
  -- booleans: only JSON true counts (same as `=== true` in lib/validation/candidate.ts); never raises
  v_neg boolean := coalesce(p->'salary_negotiable' = 'true'::jsonb, false);
  v_hide boolean := coalesce(p->'hide_from_ticker' = 'true'::jsonb, false);
  v_show boolean := coalesce(p->'show_salary_on_card' = 'true'::jsonb, false);
  v_years int; v_smin int; v_smax int; v_skills text[]; v_modes text[]; v_tomb private.candidate_tombstones%rowtype;
  v_num numeric; v_k text; v_j jsonb;
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  if private.is_banned(v_uid) then return private.err('BANNED'); end if;
  select * into v_prof from public.profiles where id = v_uid;
  if not found then return private.err('NO_PROFILE'); end if;
  if v_prof.role <> 'candidate' then return private.err('WRONG_ROLE'); end if;
  perform pg_advisory_xact_lock(hashtextextended('cand:' || v_uid::text, 0));

  -- validation: same order/fields as lib/validation/candidate.ts
  if v_sign is null or char_length(v_sign) not between 5 and 80
     or char_length(v_sign) - char_length(replace(v_sign, E'\n', '')) > 1 then return private.err('VALIDATION', 'sign_text'); end if;
  if v_zone is null or not (v_cfg->'zones') ? v_zone then return private.err('VALIDATION', 'zone'); end if;
  if v_title is null or char_length(v_title) > 60 then return private.err('VALIDATION', 'title'); end if;
  -- numbers must be JSON numbers with an integral value (lib/validation/candidate.ts); never raises (review nit)
  if jsonb_typeof(p->'years_exp') is distinct from 'number' then return private.err('VALIDATION', 'years_exp'); end if;
  v_num := (p->>'years_exp')::numeric;
  if v_num <> trunc(v_num) or v_num not between 0 and 50 then return private.err('VALIDATION', 'years_exp'); end if;
  v_years := v_num::int;
  select coalesce(array_agg(s), '{}') into v_skills
    from (select private.clean(x #>> '{}') s
            from jsonb_array_elements(case when jsonb_typeof(p->'skills') = 'array' then p->'skills' else '[]'::jsonb end) x
           where jsonb_typeof(x) = 'string') t
   where s is not null;
  if cardinality(v_skills) not between 1 and 10 or exists (select 1 from unnest(v_skills) s where char_length(s) > 20) then
    return private.err('VALIDATION', 'skills'); end if;
  -- salary: absent / null / "" -> null; any other non-number -> VALIDATION (numOrNull in candidate.ts)
  for v_k in select unnest(array['salary_min', 'salary_max']) loop
    v_j := p->v_k;
    if v_j is null or jsonb_typeof(v_j) = 'null' or v_j = '""'::jsonb then v_num := null;
    elsif jsonb_typeof(v_j) <> 'number' then return private.err('VALIDATION', 'salary');
    else
      v_num := (v_j #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num not between 0 and 1000 then return private.err('VALIDATION', 'salary'); end if;
    end if;
    if v_k = 'salary_min' then v_smin := v_num::int; else v_smax := v_num::int; end if;
  end loop;
  if (v_smin is not null and v_smin not between 0 and 1000) or (v_smax is not null and v_smax not between 0 and 1000)
     or (v_smin is not null and v_smax is not null and v_smin > v_smax) then return private.err('VALIDATION', 'salary'); end if;
  if exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p->'work_modes') = 'array' then p->'work_modes' else '[]'::jsonb end) x
              where jsonb_typeof(x) <> 'string' or x #>> '{}' not in ('remote','hybrid','onsite')) then
    return private.err('VALIDATION', 'work_modes'); end if;
  select coalesce(array_agg(distinct x), '{}') into v_modes
    from jsonb_array_elements_text(case when jsonb_typeof(p->'work_modes') = 'array' then p->'work_modes' else '[]'::jsonb end) x;
  if v_bio is not null and char_length(v_bio) > 280 then return private.err('VALIDATION', 'bio'); end if;
  if v_city is not null and char_length(v_city) > 40 then return private.err('VALIDATION', 'city'); end if;
  if v_ckind is null or v_ckind not in ('email','url','phone') or v_cval is null or char_length(v_cval) > 120
     or (v_ckind = 'email' and v_cval !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
     or (v_ckind = 'url'   and v_cval !~* '^https?://[^\s<>"]+$')
     or (v_ckind = 'phone' and v_cval !~ '^\+?[0-9][0-9 .-]{7,14}$') then return private.err('VALIDATION', 'contact'); end if;
  -- moderation (BR-M1, BR-M4)
  if private.is_blocked(v_sign) then return private.err('BLOCKED_CONTENT', 'sign_text'); end if;
  if private.is_blocked(v_title) then return private.err('BLOCKED_CONTENT', 'title'); end if;
  if private.is_blocked(v_bio) then return private.err('BLOCKED_CONTENT', 'bio'); end if;
  if private.is_blocked(array_to_string(v_skills, ' , ')) then return private.err('BLOCKED_CONTENT', 'skills'); end if;
  if private.is_blocked(v_city) then return private.err('BLOCKED_CONTENT', 'city'); end if;
  if private.has_pii(v_sign) then return private.err('PII_NOT_ALLOWED', 'sign_text'); end if;
  if private.has_pii(v_bio) then return private.err('PII_NOT_ALLOWED', 'bio'); end if;
  if private.has_pii(v_title) then return private.err('PII_NOT_ALLOWED', 'title'); end if;

  select * into v_old from public.candidates where user_id = v_uid for update;
  if v_old.id is not null and v_old.zone <> v_zone and v_old.zone_changed_at is not null
     and v_old.zone_changed_at > now() - make_interval(hours => (v_cfg->>'zoneChangeHours')::int) then
    return private.err('ZONE_CHANGE_COOLDOWN', 'zone');
  end if;
  -- rate limits last so validation failures don't burn quota
  if v_old.id is null then
    if not private.hit('cand_create:' || v_uid, interval '10 minutes', (v_cfg->>'profileCreatePer10Min')::int) then
      return private.err('RATE_LIMITED', null, 600); end if;
    if not private.hit_day('cand_create_day:' || v_uid, (v_cfg->>'candidateCreatesPerDay')::int) then   -- M1: re-create cap
      return private.err('RATE_LIMITED'); end if;
  elsif not private.hit('cand_edit:' || v_uid, interval '1 hour', (v_cfg->>'signEditsPerHour')::int) then
    return private.err('RATE_LIMITED', null, 3600);
  end if;

  if v_old.id is null then
    delete from private.candidate_tombstones where user_id = v_uid returning * into v_tomb;   -- M1: moderation survives delete
    insert into public.candidates(user_id, display_name, zone, sign_text, title, years_exp, skills, salary_min, salary_max,
      salary_negotiable, city, work_modes, bio, avatar, hide_from_ticker, show_salary_on_card, sign_state, status, mod_hidden_at)
    values (v_uid, v_prof.display_name, v_zone, v_sign, v_title, v_years, v_skills, v_smin, v_smax,
      v_neg, v_city, v_modes, v_bio, v_prof.avatar, v_hide, v_show,
      case when v_tomb.sign_locked then 'pending_review'::public.sign_state else 'ok' end,
      case when v_tomb.hide_locked then 'hidden'::public.candidate_status else 'sitting' end,
      case when v_tomb.hide_locked then now() end)
    returning * into v_new;
  else
    update public.candidates set
      zone_changed_at = case when zone <> v_zone then now() else zone_changed_at end,
      zone = v_zone, sign_text = v_sign, title = v_title, years_exp = v_years, skills = v_skills,
      salary_min = v_smin, salary_max = v_smax, salary_negotiable = v_neg,
      city = v_city, work_modes = v_modes, bio = v_bio, hide_from_ticker = v_hide, show_salary_on_card = v_show,
      updated_at = now()                                  -- sign_state unchanged: edits don't lift a pending review
    where id = v_old.id returning * into v_new;
  end if;
  insert into public.candidate_contacts(candidate_id, kind, value) values (v_new.id, v_ckind::public.contact_kind, v_cval)
  on conflict (candidate_id) do update set kind = excluded.kind, value = excluded.value;

  if v_new.status = 'sitting' and (v_old.id is null or private.card_json(v_new) is distinct from private.card_json(v_old)) then
    perform private.street('candidate_upsert', jsonb_build_object('candidate', private.card_json(v_new)));
  end if;
  return private.ok(jsonb_build_object('id', v_new.id, 'slug', v_new.slug));
end $$;

-- ----- Sit / hide (M1 moderation lock, H3 rate limit + no-op broadcasts) -----
create or replace function public.set_my_candidate_status(p_status public.candidate_status) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_old public.candidates%rowtype; v_c public.candidates%rowtype;
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  if p_status is null or p_status = 'placed' then return private.err('VALIDATION', 'status'); end if;
  select * into v_old from public.candidates where user_id = v_uid for update;
  if not found then return private.err('NOT_FOUND'); end if;
  if p_status = 'sitting' and (v_old.mod_hidden_at is not null or v_old.sign_state <> 'ok') then
    return private.err('MODERATION_LOCKED');                       -- admin hide / removed sign / sign under review
  end if;
  if not private.hit('cand_status:' || v_uid, interval '1 minute', (private.cfg()->>'statusChangesPerMinute')::int) then
    return private.err('RATE_LIMITED', null, 60);
  end if;
  update public.candidates set
    status = p_status,
    sitting_since = case when p_status = 'sitting' and status <> 'sitting' then now() else sitting_since end,  -- "ngồi lì" reset
    placed_at = case when p_status = 'sitting' then null else placed_at end,
    placed_company = case when p_status = 'sitting' then null else placed_company end,
    updated_at = now()
  where id = v_old.id returning * into v_c;
  if p_status = 'sitting' then
    if v_old.status <> 'sitting' or private.card_json(v_c) is distinct from private.card_json(v_old) then
      perform private.street('candidate_upsert', jsonb_build_object('candidate', private.card_json(v_c)));
    end if;
  elsif v_old.status <> 'hidden' then
    perform private.street('candidate_remove', jsonb_build_object('id', v_c.id));
  end if;
  return private.ok(jsonb_build_object('status', v_c.status));
end $$;

-- ----- Delete (M1 tombstone) -----
create or replace function public.delete_my_candidate() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_c public.candidates%rowtype;
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  delete from public.candidates where user_id = v_uid returning * into v_c;   -- cascades gifts/daily/invites/offers/reports
  if v_c.id is null then return private.err('NOT_FOUND'); end if;
  if v_c.sign_state <> 'ok' or v_c.mod_hidden_at is not null then
    insert into private.candidate_tombstones(user_id, sign_locked, hide_locked)
    values (v_uid, v_c.sign_state <> 'ok', v_c.mod_hidden_at is not null)
    on conflict (user_id) do update set sign_locked = private.candidate_tombstones.sign_locked or excluded.sign_locked,
                                        hide_locked = private.candidate_tombstones.hide_locked or excluded.hide_locked,
                                        created_at = now();
  end if;
  if v_c.status <> 'hidden' then perform private.street('candidate_remove', jsonb_build_object('id', v_c.id)); end if;
  return private.ok();
end $$;

-- ----- Reads (review M4 / sec M5) -----
-- sitting + placed within placedVisibleDays; the listMax cut keeps sitting first and newest first (never drops a
-- newcomer); output order stays created_at ascending like 0001.
create or replace function public.list_candidates()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  with t as (select private.vn_today() as d, private.cfg() as cfg, private.cfg()->'rank' as r),
  pick as (
    select c.id from public.candidates c cross join t
    where c.status = 'sitting'
       or (c.status = 'placed' and coalesce(c.placed_at, c.updated_at) >= now() - make_interval(days => (t.cfg->>'placedVisibleDays')::int))
    order by (c.status = 'sitting') desc, c.created_at desc, c.id
    limit (select (cfg->>'listMax')::int from t)
  )
  select private.card_json(c) || jsonb_build_object(
           'hr_decayed',       coalesce(s.hr, 0),
           'love_decayed',     coalesce(s.love, 0),
           'invite_decayed',   coalesce(s.inv, 0),
           'accepted_decayed', coalesce(s.acc, 0),
           'xu_week',          coalesce(s.xu_week, 0),
           'xu_today',         coalesce(s.xu_today, 0),
           'today',            t.d)
  from pick p join public.candidates c on c.id = p.id cross join t
  left join lateral (
    select sum(d.xu * power(0.5, (t.d - d.day) / (t.r->>'halfLifeDays')::numeric))::float8 as hr,
           sum(least(d.love, (t.r->>'loveDailyCap')::int) * power(0.5, (t.d - d.day) / (t.r->>'halfLifeDays')::numeric))::float8 as love,
           sum(d.invites * power(0.5, (t.d - d.day) / (t.r->>'halfLifeDays')::numeric))::float8 as inv,
           sum(d.invites_accepted * power(0.5, (t.d - d.day) / (t.r->>'halfLifeDays')::numeric))::float8 as acc,
           sum(d.xu) filter (where d.day >= t.d - (extract(isodow from t.d)::int - 1)) as xu_week,
           sum(d.xu) filter (where d.day = t.d) as xu_today
    from public.candidate_daily d
    where d.candidate_id = c.id and d.day > t.d - (t.r->>'windowDays')::int
  ) s on true
  order by c.created_at, c.id
$$;

-- Full public CV + the caller's own usage. Lookup: uuid-shaped key -> primary key, otherwise slug (both indexed).
create or replace function public.get_candidate(p_key text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_c public.candidates%rowtype; v_uid uuid := auth.uid(); v_today date := private.vn_today(); v_me jsonb := null;
        v_role public.user_role;
begin
  if p_key is null or char_length(p_key) > 64 then return null; end if;
  if p_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into v_c from public.candidates where id = p_key::uuid;
  end if;
  if v_c.id is null then select * into v_c from public.candidates where slug = p_key; end if;
  if v_c.id is null or (v_c.status = 'hidden' and v_c.user_id is distinct from v_uid) then return null; end if;
  if v_uid is not null then
    select role into v_role from public.profiles where id = v_uid;
    v_me := jsonb_build_object(
      'is_mine', v_c.user_id = v_uid,
      'xu_today',   (select count(*) from public.gifts g where g.giver_id = v_uid and g.candidate_id = v_c.id and g.kind = 'xu' and g.day = v_today),
      'love_today', (select count(*) from public.gifts g where g.giver_id = v_uid and g.candidate_id = v_c.id and g.kind = 'love' and g.day = v_today),
      'last_invite_at', (select max(created_at) from public.invitations i where i.hr_id = v_uid and i.candidate_id = v_c.id),
      'open_invite',    exists (select 1 from public.invitations i where i.hr_id = v_uid and i.candidate_id = v_c.id and i.status = 'pending' and i.expires_at > now()),
      'accepted_invite_id', (select id from public.invitations i where i.hr_id = v_uid and i.candidate_id = v_c.id and i.status = 'accepted' order by created_at desc limit 1),
      -- H1/L5: owner, or a caller who is (still) HR with an ACCEPTED invitation
      'can_see_contact', v_c.user_id = v_uid or (v_role is not distinct from 'hr' and exists (
                           select 1 from public.invitations i where i.hr_id = v_uid and i.candidate_id = v_c.id and i.status = 'accepted')),
      'reported', exists (select 1 from public.reports r where r.reporter_id = v_uid and r.candidate_id = v_c.id));
  end if;
  return private.card_json(v_c) || jsonb_build_object(
    'salary_min', v_c.salary_min, 'salary_max', v_c.salary_max, 'salary_negotiable', v_c.salary_negotiable,
    'show_salary_on_card', v_c.show_salary_on_card, 'hide_from_ticker', v_c.hide_from_ticker,
    'city', v_c.city, 'work_modes', to_jsonb(v_c.work_modes), 'bio', v_c.bio,
    'open_offer', exists (select 1 from public.offers o where o.candidate_id = v_c.id and o.status = 'pending' and o.expires_at > now()),
    'open_invites', (select count(*) from public.invitations i where i.candidate_id = v_c.id and i.status = 'pending' and i.expires_at > now()),
    'me', v_me);
end $$;

-- H1 + L5: accepted invitation + caller still HR; global hourly cap per HR. Now VOLATILE (it writes rate_hits).
create or replace function public.get_candidate_contact(p_candidate_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_k public.contact_kind; v_v text;
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  select user_id into v_owner from public.candidates where id = p_candidate_id;
  if not found then return private.err('NOT_FOUND'); end if;
  if v_owner is distinct from v_uid then
    if not exists (select 1 from public.profiles p where p.id = v_uid and p.role = 'hr')
       or not exists (select 1 from public.invitations i
                       where i.hr_id = v_uid and i.candidate_id = p_candidate_id and i.status = 'accepted') then
      return private.err('CONTACT_LOCKED');                                -- BR-Privacy
    end if;
    if not private.hit('contact:' || v_uid, interval '1 hour', (private.cfg()->>'contactViewsPerHour')::int) then
      return private.err('RATE_LIMITED', null, 3600);
    end if;
  end if;
  select kind, value into v_k, v_v from public.candidate_contacts where candidate_id = p_candidate_id;
  if not found then return private.err('NOT_FOUND'); end if;               -- review nit: same as demo
  return private.ok(jsonb_build_object('kind', v_k, 'value', v_v));
end $$;

-- ----- Gifts: love-per-IP on the VN day (H2), anonymous candidate ref (L1) -----
create or replace function public.drop_gift(p_candidate_id uuid, p_kind public.gift_kind) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_cfg jsonb := private.cfg(); v_rule jsonb := private.cfg()->(p_kind::text);
  v_today date := private.vn_today(); v_prof public.profiles%rowtype; v_cand public.candidates%rowtype;
  v_pair int; v_day int; v_gift_id bigint;
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  perform pg_advisory_xact_lock(hashtextextended('gift:' || v_uid::text, 0));   -- BR-C5 atomic per giver
  select * into v_prof from public.profiles where id = v_uid;
  if not found then return private.err('NO_PROFILE'); end if;
  if p_kind = 'xu' and v_prof.role <> 'hr' then return private.err('WRONG_ROLE'); end if;      -- AC-1.5, BR-C3
  select * into v_cand from public.candidates where id = p_candidate_id;
  if not found then return private.err('NOT_FOUND'); end if;
  if v_cand.status <> 'sitting' then return private.err('CANDIDATE_UNAVAILABLE'); end if;     -- BR-C4
  if v_cand.user_id = v_uid then return private.err('SELF_ACTION'); end if;                    -- AC-9.4
  if not private.hit('gift_s:' || v_uid, interval '1 second', (v_cfg->>'giftOpsPerSecond')::int) then
    return private.err('RATE_LIMITED', null, 1); end if;
  select count(*) filter (where candidate_id = p_candidate_id), count(*) into v_pair, v_day
    from public.gifts where giver_id = v_uid and kind = p_kind and day = v_today;
  if v_pair >= (v_rule->>'perCandidatePerDay')::int then return private.err('LIMIT_PER_CANDIDATE_DAY'); end if;
  if v_day  >= (v_rule->>'perDay')::int then return private.err('LIMIT_DAILY'); end if;
  if p_kind = 'love' and not private.hit_day('love_ip:' || private.client_ip_hash(), (v_rule->>'perIpPerDay')::int) then
    return private.err('IP_LIMIT'); end if;

  insert into public.gifts(giver_id, candidate_id, kind, day) values (v_uid, p_candidate_id, p_kind, v_today)
  returning id into v_gift_id;
  perform private.bump_daily(p_candidate_id, p_kind::text);
  update public.candidates set xu_total = xu_total + (p_kind = 'xu')::int, love_total = love_total + (p_kind = 'love')::int
   where id = p_candidate_id;

  perform private.street('gift', jsonb_build_object('id', v_gift_id::text, 'kind', p_kind,
    'giver', jsonb_build_object('id', v_uid, 'name', v_prof.display_name, 'role', v_prof.role, 'company', v_prof.company),
    'candidate', private.cand_ref(v_cand)));
  perform private.notify(v_cand.user_id, 'gift', jsonb_build_object('kind', p_kind, 'candidateId', v_cand.id,
    'giverName', v_prof.display_name, 'giverRole', v_prof.role, 'giverCompany', v_prof.company));
  return private.ok(jsonb_build_object('giftId', v_gift_id::text,
    'remainingToday', (v_rule->>'perDay')::int - v_day - 1,
    'remainingForCandidate', (v_rule->>'perCandidatePerDay')::int - v_pair - 1));
end $$;

-- ----- Invitation "thả 500k": ban, HR account-age gate (H1), hr_contact moderation (sec M4/M6), L1 -----
create or replace function public.send_invitation(p_candidate_id uuid, p_message text, p_hr_contact text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_r jsonb := private.cfg()->'invite'; v_today date := private.vn_today();
  v_prof public.profiles%rowtype; v_cand public.candidates%rowtype; v_inv public.invitations%rowtype;
  v_msg text := private.clean(p_message); v_contact text := private.clean(p_hr_contact);
  v_ready timestamptz;
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  if private.is_banned(v_uid) then return private.err('BANNED'); end if;
  perform pg_advisory_xact_lock(hashtextextended('invite:' || v_uid::text, 0));
  select * into v_prof from public.profiles where id = v_uid;
  if not found then return private.err('NO_PROFILE'); end if;
  if v_prof.role <> 'hr' then return private.err('WRONG_ROLE'); end if;
  v_ready := coalesce(v_prof.hr_since, v_prof.created_at) + make_interval(mins => (private.cfg()->>'hrInviteMinAgeMinutes')::int);
  if v_ready > now() then return private.err('TOO_NEW', null, ceil(extract(epoch from v_ready - now()))::int); end if;
  select * into v_cand from public.candidates where id = p_candidate_id for update;   -- serializes per candidate (BR-5-3)
  if not found then return private.err('NOT_FOUND'); end if;
  if v_cand.status <> 'sitting' then return private.err('CANDIDATE_UNAVAILABLE'); end if;
  if v_cand.is_sample then return private.err('SAMPLE_CANDIDATE'); end if;
  if v_msg is null or char_length(v_msg) not between (v_r->>'messageMin')::int and (v_r->>'messageMax')::int then
    return private.err('VALIDATION', 'message'); end if;
  if private.is_blocked(v_msg) then return private.err('BLOCKED_CONTENT', 'message'); end if;
  if v_contact is null or char_length(v_contact) not between (v_r->>'contactMin')::int and (v_r->>'contactMax')::int
     or not private.contact_ok(v_contact) then
    return private.err('VALIDATION', 'hr_contact'); end if;
  if private.is_blocked(v_contact) then return private.err('BLOCKED_CONTENT', 'hr_contact'); end if;
  perform private.expire_stale(p_candidate_id, v_uid);
  if exists (select 1 from public.invitations where hr_id = v_uid and candidate_id = p_candidate_id and status = 'pending') then
    return private.err('INVITE_ALREADY_OPEN'); end if;
  if exists (select 1 from public.invitations where hr_id = v_uid and candidate_id = p_candidate_id
             and created_at > now() - make_interval(days => (v_r->>'cooldownDays')::int)) then
    return private.err('INVITE_COOLDOWN'); end if;
  if (select count(*) from public.invitations where hr_id = v_uid and day = v_today) >= (v_r->>'perDay')::int then
    return private.err('LIMIT_DAILY'); end if;
  if (select count(*) from public.invitations where candidate_id = p_candidate_id and status = 'pending')
     >= (v_r->>'maxOpenPerCandidate')::int then return private.err('CANDIDATE_FULL'); end if;

  insert into public.invitations(hr_id, candidate_id, hr_name, hr_company, message, hr_contact, day, expires_at)
  values (v_uid, p_candidate_id, v_prof.display_name, v_prof.company, v_msg, v_contact, v_today,
          now() + make_interval(days => (v_r->>'expireDays')::int))
  returning * into v_inv;
  perform private.bump_daily(p_candidate_id, 'invites');
  update public.candidates set invite_total = invite_total + 1 where id = p_candidate_id;
  perform private.street('invite', jsonb_build_object('id', v_inv.id,
    'giver', jsonb_build_object('id', v_uid, 'name', v_prof.display_name, 'role', 'hr', 'company', v_prof.company),
    'candidate', private.cand_ref(v_cand)));
  perform private.notify(v_cand.user_id, 'invite_received', jsonb_build_object('invitationId', v_inv.id,
    'hrName', v_prof.display_name, 'hrCompany', v_prof.company, 'message', v_msg, 'hrContact', v_contact));
  return private.ok(to_jsonb(v_inv));
end $$;

-- ----- Offer "bao trọn": only the street candidate ref changes (L1) -----
create or replace function public.send_offer(p_candidate_id uuid, p_position text, p_package text,
                                             p_message text default null, p_show_company boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_r jsonb := private.cfg()->'offer';
  v_prof public.profiles%rowtype; v_cand public.candidates%rowtype; v_inv_id uuid; v_o public.offers%rowtype;
  v_pos text := private.clean(p_position); v_pkg text := private.clean(p_package); v_msg text := private.clean(p_message);
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  perform pg_advisory_xact_lock(hashtextextended('offer:' || v_uid::text, 0));
  select * into v_prof from public.profiles where id = v_uid;
  if not found or v_prof.role <> 'hr' then return private.err('WRONG_ROLE'); end if;
  select * into v_cand from public.candidates where id = p_candidate_id for update;
  if not found then return private.err('NOT_FOUND'); end if;
  if v_cand.status <> 'sitting' then return private.err('CANDIDATE_UNAVAILABLE'); end if;
  perform private.expire_stale(p_candidate_id, v_uid);
  select id into v_inv_id from public.invitations
   where hr_id = v_uid and candidate_id = p_candidate_id and status = 'accepted' order by created_at desc limit 1;
  if v_inv_id is null then return private.err('NEED_ACCEPTED_INVITE'); end if;               -- BR-O1 / Q3
  if v_pos is null or char_length(v_pos) > (v_r->>'positionMax')::int or private.is_blocked(v_pos) then return private.err('VALIDATION', 'position'); end if;
  if v_pkg is null or char_length(v_pkg) > (v_r->>'packageMax')::int or private.is_blocked(v_pkg) then return private.err('VALIDATION', 'package'); end if;
  if v_msg is not null and (char_length(v_msg) > (v_r->>'messageMax')::int or private.is_blocked(v_msg)) then return private.err('VALIDATION', 'message'); end if;
  if exists (select 1 from public.offers where candidate_id = p_candidate_id and status = 'pending') then
    return private.err('OFFER_ALREADY_OPEN'); end if;                                         -- AC-11.5
  if (select count(*) from public.offers where hr_id = v_uid and status = 'pending') >= (v_r->>'maxOpenPerHr')::int then
    return private.err('HR_OFFER_LIMIT'); end if;
  insert into public.offers(hr_id, candidate_id, invitation_id, hr_name, hr_company, position, package, message, hr_show_company, expires_at)
  values (v_uid, p_candidate_id, v_inv_id, v_prof.display_name, v_prof.company, v_pos, v_pkg, v_msg, coalesce(p_show_company, false),
          now() + make_interval(days => (v_r->>'expireDays')::int))
  returning * into v_o;
  perform private.street('offer', jsonb_build_object('id', v_o.id,
    'giver', jsonb_build_object('id', v_uid, 'name', v_prof.display_name, 'role', 'hr', 'company', v_prof.company),
    'candidate', private.cand_ref(v_cand)));
  perform private.notify(v_cand.user_id, 'offer_received', jsonb_build_object('offerId', v_o.id, 'hrName', v_prof.display_name,
    'hrCompany', v_prof.company, 'position', v_pos, 'package', v_pkg, 'message', v_msg));
  return private.ok(to_jsonb(v_o));
end $$;

-- ----- respond_offer: 'placed' street event also carries the ticker-safe name (hide_from_ticker) -----
create or replace function public.respond_offer(p_offer_id uuid, p_accept boolean, p_show_company boolean default false,
                                                p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_o public.offers%rowtype; v_cand public.candidates%rowtype; r record; v_company text;
begin
  if auth.uid() is null then return private.err('UNAUTHENTICATED'); end if;
  select * into v_cand from public.candidates where user_id = auth.uid() for update;
  select * into v_o from public.offers where id = p_offer_id and candidate_id = v_cand.id for update;
  if not found then return private.err('NOT_FOUND'); end if;
  if v_o.status = 'pending' and v_o.expires_at < now() then
    update public.offers set status = 'expired' where id = v_o.id; return private.err('EXPIRED'); end if;
  if v_o.status <> 'pending' then return private.err('NOT_PENDING'); end if;
  update public.offers set status = case when p_accept then 'accepted'::public.offer_status else 'declined' end,
         responded_at = now(), candidate_show_company = coalesce(p_show_company, false),
         response_reason = left(private.clean(p_reason), 200)
   where id = v_o.id returning * into v_o;
  if p_accept then                                                                           -- BR-O3
    v_company := case when v_o.hr_show_company and p_show_company then v_o.hr_company end;
    update public.candidates set status = 'placed', placed_at = now(), placed_company = v_company, updated_at = now()
     where id = v_cand.id returning * into v_cand;
    for r in with u as (update public.invitations set status = 'closed', responded_at = now()
                        where candidate_id = v_cand.id and status = 'pending' returning id, hr_id) select * from u loop
      perform private.notify(r.hr_id, 'invite_closed', jsonb_build_object('invitationId', r.id, 'candidateName', v_cand.display_name));
    end loop;
    perform private.street('placed', jsonb_build_object('candidate', private.card_json(v_cand), 'company', v_company,
                                                        'name', private.ticker_name(v_cand)));
  end if;
  perform private.notify(v_o.hr_id, 'offer_responded', jsonb_build_object('offerId', v_o.id, 'candidateName', v_cand.display_name,
    'accepted', p_accept));
  return private.ok(to_jsonb(v_o));
end $$;

-- ----- Reports (US-20) + sec M2 (aged reporters only, threshold 5) + review M2 (no upsert for hidden) -----
create or replace function public.report_candidate(p_candidate_id uuid, p_reason text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_cfg jsonb := private.cfg(); v_c public.candidates%rowtype; v_created timestamptz; v_counted boolean;
begin
  if v_uid is null then return private.err('UNAUTHENTICATED'); end if;
  if private.is_banned(v_uid) then return private.err('BANNED'); end if;
  select created_at into v_created from public.profiles where id = v_uid;
  if not found then return private.err('NO_PROFILE'); end if;
  select * into v_c from public.candidates where id = p_candidate_id for update;
  if not found then return private.err('NOT_FOUND'); end if;
  if v_c.user_id = v_uid then return private.err('SELF_ACTION'); end if;
  if p_reason is null or p_reason not in ('obscene','harassment','spam','personal_info','other') then return private.err('VALIDATION', 'reason'); end if;
  if not private.hit_day('report:' || v_uid, (v_cfg->>'reportsPerDay')::int) then return private.err('RATE_LIMITED'); end if;
  v_counted := v_created <= now() - make_interval(mins => (v_cfg->>'reporterMinAgeMinutes')::int);
  insert into public.reports(reporter_id, candidate_id, reason, note, counted)
  values (v_uid, p_candidate_id, p_reason, left(private.clean(p_note), 200), v_counted)
  on conflict (reporter_id, candidate_id) do nothing;
  if not found then return private.err('ALREADY_REPORTED'); end if;
  if v_counted then
    update public.candidates set report_count = report_count + 1 where id = p_candidate_id returning * into v_c;
  end if;
  if v_c.report_count >= (v_cfg->>'reportsToHideSign')::int and v_c.sign_state = 'ok' then   -- AC-20.2
    update public.candidates set sign_state = 'pending_review', updated_at = now() where id = v_c.id returning * into v_c;
    perform private.notify(v_c.user_id, 'sign_hidden', '{}'::jsonb);
    perform private.emit_card(v_c);
  end if;
  return private.ok();
end $$;

-- ----- Admin (BR-M6) — service_role only -----
-- actions: approve_sign | remove_sign | hide (moderation lock) | unhide (lift the lock; owner decides when to sit) |
--          delete (tombstoned) | ban (owner banned + hidden + locked) | unban
create or replace function public.admin_moderate(p_candidate_id uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_c public.candidates%rowtype;
begin
  if p_action is null or p_action not in ('approve_sign','remove_sign','hide','unhide','delete','ban','unban') then
    return private.err('VALIDATION', 'action'); end if;
  select * into v_c from public.candidates where id = p_candidate_id for update;
  if not found then return private.err('NOT_FOUND'); end if;
  if p_action in ('ban', 'unban') and v_c.user_id is null then return private.err('VALIDATION', 'action'); end if;
  case p_action
    when 'approve_sign' then update public.candidates set sign_state = 'ok', report_count = 0, updated_at = now() where id = v_c.id returning * into v_c;
    when 'remove_sign'  then update public.candidates set sign_state = 'removed', updated_at = now() where id = v_c.id returning * into v_c;
    when 'hide'         then update public.candidates set status = 'hidden', mod_hidden_at = now(), updated_at = now() where id = v_c.id returning * into v_c;
    when 'unhide'       then update public.candidates set mod_hidden_at = null, updated_at = now() where id = v_c.id returning * into v_c;
    when 'ban' then
      insert into private.bans(user_id, reason) values (v_c.user_id, 'admin_moderate') on conflict (user_id) do nothing;
      update public.candidates set status = 'hidden', mod_hidden_at = now(), updated_at = now() where id = v_c.id returning * into v_c;
    when 'unban' then
      delete from private.bans where user_id = v_c.user_id;
      return private.ok();
    when 'delete' then
      if v_c.user_id is not null then
        insert into private.candidate_tombstones(user_id, sign_locked, hide_locked) values (v_c.user_id, true, true)
        on conflict (user_id) do update set sign_locked = true, hide_locked = true, created_at = now();
      end if;
      delete from public.candidates where id = v_c.id;
      perform private.street('candidate_remove', jsonb_build_object('id', v_c.id));
      return private.ok();
  end case;
  perform private.emit_card(v_c);
  return private.ok();
end $$;

-- ban / unban any user (e.g. a scam HR without a candidate row). service_role only.
create or replace function public.admin_ban_user(p_user_id uuid, p_banned boolean default true, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_c public.candidates%rowtype;
begin
  if p_user_id is null then return private.err('VALIDATION', 'user'); end if;
  if coalesce(p_banned, true) then
    insert into private.bans(user_id, reason) values (p_user_id, left(private.clean(p_reason), 200))
    on conflict (user_id) do update set reason = excluded.reason;
    update public.candidates set status = 'hidden', mod_hidden_at = now(), updated_at = now()
     where user_id = p_user_id returning * into v_c;
    if v_c.id is not null then perform private.emit_card(v_c); end if;
  else
    delete from private.bans where user_id = p_user_id;
  end if;
  return private.ok();
end $$;

-- paginated (sec M2). Replaces the 0001 no-arg version; calls without arguments keep working through the defaults.
drop function if exists public.admin_list_pending();
create or replace function public.admin_list_pending(p_offset int default 0, p_limit int default 50) returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select private.card_json(c) || jsonb_build_object('raw_sign', c.sign_text, 'report_count', c.report_count,
                                                    'mod_hidden_at', c.mod_hidden_at, 'user_id', c.user_id,
                                                    'banned', c.user_id is not null and private.is_banned(c.user_id))
  from public.candidates c where c.sign_state = 'pending_review'
  order by c.updated_at desc, c.id
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;

-- =====================================================================
-- Realtime authorization (I1): 'pos:' topics restricted to known zones + plaza
-- =====================================================================
alter policy rt_read on realtime.messages using (
  (select realtime.topic()) = 'street'
  or (select realtime.topic()) = any (
-- BEGIN:POS_TOPICS
    array['pos:plaza','pos:backend','pos:frontend','pos:design','pos:mobile','pos:data_ai','pos:qa','pos:pm_ba','pos:devops','pos:fresher','pos:other']
-- END:POS_TOPICS
  )
  or (select realtime.topic()) = 'inbox:' || (select auth.uid())::text
);
alter policy rt_write on realtime.messages with check (
  ((select realtime.topic()) = any (
    array['pos:plaza','pos:backend','pos:frontend','pos:design','pos:mobile','pos:data_ai','pos:qa','pos:pm_ba','pos:devops','pos:fresher','pos:other'])
   and realtime.messages.extension in ('broadcast', 'presence'))
  or ((select realtime.topic()) = 'street' and realtime.messages.extension = 'presence')
  -- clients can NEVER broadcast on 'street' or 'inbox:*' => ticker/notifications cannot be spoofed
);

-- =====================================================================
-- Privileges (functions replaced with CREATE OR REPLACE keep their grants; new ones are opt-in)
-- =====================================================================
revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.admin_list_pending(int, int), public.admin_ban_user(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_list_pending(int, int), public.admin_ban_user(uuid, boolean, text) to service_role;

reset lock_timeout;
reset statement_timeout;
