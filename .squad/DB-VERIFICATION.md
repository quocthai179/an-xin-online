# DB verification: `supabase/migrations/0001_init.sql` + `0002_hardening.sql`

Engine: PostgreSQL 16.15 (local, throwaway cluster), target is hosted Supabase (PG 15/17) | Migration tool: Supabase CLI (`supabase db push`)
Affected tables: all new (initial schema, empty project), so there are no lock or backfill concerns for this release.
Date: 2026-11-04 (0001), 2026-11-04 (0002, section 9). Owner: database-engineer.

## 1. What was run

`pnpm test:db` (= `bash supabase/tests/run.sh`) does the following, and exits non-zero on any failure:

1. `initdb` a temp cluster (`-U supabase_admin`, UTF8, `C.UTF-8`, the same ctype as hosted Supabase) on a free loopback port. It uses `mktemp -d` under `$PXV_DB_TMP`/`$TMPDIR`/`/tmp`. When run as root it drops to the `postgres` OS user with `setpriv`.
2. `supabase/tests/00_supabase_stub.sql`, run as `supabase_admin`, creates what Supabase provides:
   - roles `postgres` (non-superuser, `bypassrls`), `anon`, `authenticated`, `service_role` (`bypassrls`), `authenticator`, `supabase_auth_admin`, `supabase_realtime_admin`
   - Supabase's default privileges: everything that `postgres` creates in `public` is auto-granted to anon/authenticated/service_role, so the migration's revokes are actually tested
   - schema `extensions` with pgcrypto and uuid-ossp
   - `auth.users` (with `is_anonymous`), plus `auth.uid()`, `auth.role()`, `auth.email()`, `auth.jwt()`. These read `request.jwt.claim(s)`, using upstream's definitions.
   - `realtime.messages`, plus `realtime.send()` (upstream body: sets `realtime.topic` and swallows errors as a WARNING) and `realtime.topic()`
   - publication `supabase_realtime`
3. The migrations run **as `postgres` (non-superuser)**, in file order, **one transaction per file** (`psql -1`), like `supabase db push`. The runner fails if any of them prints an ERROR or WARNING (all migration output is kept, not only the last file's).
4. The stub and the migration run again on a **second fresh database** in the same cluster, where the roles already exist. This must be clean.
5. **Locale guard:** a database with `LC_CTYPE=C` must make the migration fail.
6. `01_helpers.sql` adds the `tests` schema. It impersonates users the way PostgREST does (`role` plus `request.jwt.claims` plus `request.headers`) and provides assertion helpers. Since 0002, `tests.login(uid, ip)` sends `x-forwarded-for: 203.0.113.66, <ip>` (spoofed leftmost entry, real rightmost one; default `ip` = one per user), `tests.login_headers(uid, headers)` sends raw headers, and `tests.mk_profile(..., p_age default '2 hours')` backdates profiles so the account-age gates only apply where a test asks for a fresh profile.
7. The test files run. Each one is `begin … rollback`, and every failed assertion raises an exception.
8. `concurrency.sh` runs parallel psql clients, with committed fixtures that it cleans up afterwards.
9. Teardown: `pg_ctl stop` and `rm -rf` of the temp directory. Set `KEEP=1` to leave the cluster running for debugging.

## 2. Results (final run, 0001 + 0002)

```
== provision + migrate
   migrated postgres: 2 file(s) OK
   migrated fresh_again: 2 file(s) OK
   locale guard: LC_CTYPE=C database rejected as expected
== tests
   ok   10_profiles.sql                8 checks
   ok   20_candidates.sql              4 checks
   ok   30_gifts.sql                  10 checks
   ok   40_invites_offers.sql         12 checks
   ok   50_reports_temple.sql          6 checks
   ok   60_rls_privileges.sql          6 checks
   ok   70_realtime.sql                4 checks
   ok   80_contact_gate.sql            7 checks
   ok   81_moderation_lock.sql         6 checks
   ok   82_reports_admin.sql           5 checks
   ok   83_rate_ip.sql                 7 checks
   ok   84_reads_realtime.sql          7 checks
   ok   85_moderation_parity.sql       1 checks
== concurrency
   ok   concurrency.sh                 3 checks
== seed
   ok   seed.sql                      40 samples
== result: 87 passed check groups, 0 failed file(s)
```

(0001 alone: 54 groups.) The 0001 groups contain about 300 individual assertions (`tests.ok/err/eq/check`), plus loops over the blocklist cases, the table list and the RPC list.

Coverage by file:

| File | Covers |
|---|---|
| 10_profiles | `upsert_profile` for viewer/HR/candidate: validation, moderation of name/company, null role/avatar, first rename free then 24 h cooldown, FK to `auth.users`, role switch hides the candidate and emits `candidate_remove`, BR-SP3 (3 HR signups per IP per hour, hashed IP only), `get_me` |
| 20_candidates | SQL moderation using the same cases as `tests/lib/moderation.test.ts` (blocklist modes, allowlist, NFKC, zero-width, bidi, leet, PII). `upsert_my_candidate`: every validation field, banned words (sign/title/bio/skills), PII, `javascript:` contact, no quota burned on failure, zone cooldown, 10 edits per hour, 1 create per 10 min, delete. Hide/sit-again visibility (`sitting_since` reset). No `user_id`/contact in reads. |
| 30_gifts | anon denied; NO_PROFILE / WRONG_ROLE / SELF_ACTION / NOT_FOUND; 2 xu per candidate per day; 10 xu per day per HR; per-HR independence; VN-day rollover; 5 ops/s (`retryAfterSec: 1`); placed candidate gets CANDIDATE_UNAVAILABLE; love 5/day and 1 per candidate for every role; 30 love per IP per day; street and inbox emits; sample candidate gets no inbox message; anonymised ticker name |
| 40_invites_offers | Contact locked before a 500k and (since 0002) still locked while it is pending, and for other HRs; SAMPLE_CANDIDATE, validation, moderation, INVITE_ALREADY_OPEN, 3 per day, CANDIDATE_FULL at 5 open, lazy expiry, 7-day cooldown, EXPIRED / NOT_PENDING / foreign invite, decline with blocked reason. Invitation RLS per party. NEED_ACCEPTED_INVITE, offer validation, OFFER_ALREADY_OPEN, HR_OFFER_LIMIT. Accepting sets `placed` and closes other pending invites (with notifications and a street `placed` event); company shown only when both sides consent; expired offer; sit again. No direct UPDATE on invitations/offers. |
| 50_reports_temple | Report SELF_ACTION / NO_PROFILE / VALIDATION (incl. null) / ALREADY_REPORTED; auto-hide at 5 distinct (aged) reporters (3 before 0002) (`pending_review`, a single `sign_hidden`, sign nulled in public reads, edits keep the review); 20 reports per day; `admin_*` only for service_role; incense once per day plus an anonymous notification and temple stats; fortune is deterministic per user and day, follows the formula, varies across users, and anon is denied; notifications mark-read and RLS |
| 60_rls_privileges | anon gets INSUFFICIENT_PRIVILEGE on all 18 write/private RPCs and can call only `list_candidates`, `get_candidate`, `get_temple_stats`. anon and authenticated cannot SELECT hidden tables, cannot INSERT/UPDATE/DELETE any table, cannot use sequences, and cannot reach `private.*`. RLS row filtering. No hidden columns in RPC output. Every client-callable function is `security definer` with `search_path=""`. RLS is on for every table. Tables/functions created later get no client grants. |
| 70_realtime | A gift produces exactly two rows: `street`/`gift` (broadcast, private) and `inbox:<uid>`/`notification`, with the payload keys from `StreetEvent` and `AppNotification`. Read policy: `street`, `pos:*` and the user's own inbox are allowed; another user's inbox, unknown topics and anon are denied. Write policy: presence on `street` and broadcast/presence on `pos:*` are allowed; broadcast on `street`, anything on `inbox:*` (own or other), unknown topics, `postgres_changes` and anon are denied. |
| concurrency.sh | 8 parallel clients on the same HR and same candidate: exactly 2 accepted. Six waves of 8 parallel clients: exactly 10 per day, at most 2 per candidate, and `gifts` = `candidate_daily` = `xu_total`. 12 parallel love calls: at most 5 accepted, at most 1 per candidate. **Mutation check:** with the advisory lock (and rate limiter) removed from `drop_gift`, the first wave accepted 5 and the test failed as it should. |

TS side: `pnpm test` passes (15 files, 153 tests, including parity), and so do `pnpm typecheck` and eslint on the changed file.

## 3. Fixes made to `0001_init.sql`

It had never been run before. It applied cleanly on the first try; every fix below came from the tests.

| # | Problem found | Fix |
|---|---|---|
| 1 | `upsert_profile(p_role => null)` raised a NOT NULL violation, which the client would see as NETWORK | Return `VALIDATION`/`role` right after the name moderation check (the same order as `validateProfileInput`) |
| 2 | `respond_offer` with a reason over 200 characters raised a CHECK violation | `response_reason = left(private.clean(p_reason), 200)`, and `candidate_show_company = coalesce(p_show_company, false)`. The demo engine now truncates the same way (by code points). |
| 3 | `report_candidate(p_reason => null)` raised a NOT NULL violation | `p_reason is null or … not in (…)` now returns `VALIDATION`/`reason` |
| 4 | The identity sequences (`gifts_id_seq`, `notifications_id_seq`, `reports_id_seq`) were still granted `rwU` to anon/authenticated through Supabase's default privileges | `revoke all on all sequences in schema public from anon, authenticated` |
| 5 | The per-schema `alter default privileges … revoke execute … from public` cannot remove PostgreSQL's built-in EXECUTE-to-PUBLIC on new functions, so a future function in `public` would have been callable by anon | Added a global `alter default privileges revoke execute on functions from public`, plus per-schema revokes on future **tables and sequences** for anon/authenticated |
| 6 | `client_ip_hash()` did `current_setting('request.headers', true)::json`. On a pooled connection where the GUC was set before, the value is `''`, and that raises `invalid input syntax for type json`. | `nullif(…, '')::json`, the same pattern `auth.uid()` uses |
| 7 | Moderation depends on `lower()` and `[[:alnum:]]`. Under `LC_CTYPE=C` nothing Vietnamese matched (verified: `LỒN`, `Đ.M` and `ngu như chó` were all allowed). | A guard `DO` block at the top of the migration fails it unless the ctype handles Vietnamese. Hosted Supabase uses `C.UTF-8`, which passes. |

No constants or error codes changed, and the parity tests stay green.

## 4. Idempotency expectations

- `0001_init.sql` is **not re-runnable on the same database**: it uses plain `create table` and `create type`, and the `secrets` insert generates new salts. That is the normal contract for Supabase migrations, which `supabase_migrations.schema_migrations` tracks and applies once. **Never edit 0001 after it has been pushed anywhere.** Later changes go in `0002_*.sql`.
- It is clean on any fresh database, even when the cluster roles already exist. This is checked on every run, so `supabase db reset` and new environments work.
- `create extension if not exists` and `create schema if not exists` tolerate Supabase's preinstalled pgcrypto and `extensions` schema. The stub reproduces both.

## 5. What a local stub cannot verify (check after the first deploy)

1. **Real Realtime authorization.** The stub has the right shape (role, claims, `realtime.topic`, then SELECT/INSERT on `realtime.messages`), but the real Realtime server's join and send checks are not exercised. Verify with two browsers that `street` and `inbox:<uid>` deliver, and that `channel.send()` on `street` or `inbox:*` is rejected.
2. **`realtime.send` delivery.** Upstream swallows insert errors as WARNING, for example a missing daily partition of `realtime.messages` or a missing grant. A broken broadcast is therefore *silent*. After deploy, drop one gift and confirm the ticker event arrives. If it doesn't, check the Postgres logs for `ErrorSendingBroadcastMessage`.
3. **Creating policies on `realtime.messages` as `postgres`.** The stub makes `postgres` a member of the table owner role. Supabase documents creating these policies from the SQL editor and migrations, but if `db push` fails there, run the two `create policy` statements in the dashboard SQL editor.
4. **`request.headers` / client IP** (rewritten in 0002, see section 9.4). `private.client_ip()` trusts `cf-connecting-ip`, then `x-real-ip`, then the **rightmost** `x-forwarded-for` entry, and falls back to a shared `'unknown'` bucket (fail closed). Which of these hosted Supabase actually sends is **not verified**; do the header check in the first-deploy checklist (step 11) before relying on the IP limits.
5. **Anonymous sign-in JWTs** (`is_anonymous: true`, role `authenticated`): assumed to match the stub.
6. **Partitioned `realtime.messages` retention and cleanup:** managed by Supabase and not modelled.

Known behaviours, documented and not changed:

- *(fixed in 0002)* ~~`private.hit` 1-day buckets roll over at 07:00 VN~~: love-per-IP, reports per day and the daily re-create cap now use `private.hit_day` (VN midnight). Second/minute/hour windows stay epoch-aligned.
- *(fixed in 0002)* ~~`upsert_my_candidate` raises on malformed JSON~~: every malformed field now returns `VALIDATION` with the same field as `lib/validation/candidate.ts` (only JSON `true` counts as true; `years_exp`/salary must be integral JSON numbers, salary `""` = null).
- *(changed in 0002, product decision on sec H1/L5)* ~~contact unlocks on any invitation~~: only for a caller who is **currently HR** with an **accepted** invitation, max 20 reveals per HR per hour.

## 6. First deploy checklist (humans, in this order)

1. Back up: for a brand-new project there is nothing to back up. For an existing project, take a `pg_dump` or PITR snapshot first.
2. `supabase login` then `supabase link --project-ref <ref>`.
3. Confirm the locale: `select datctype from pg_database where datname = current_database();` should return `C.UTF-8` or `en_US.UTF-8`. If it returns `C`, the migration aborts by design.
4. Run `supabase db push --dry-run`, then `supabase db push`. Expect exactly one migration, `0001_init`.
5. Dashboard, Authentication, Providers: **enable Anonymous sign-ins**. Keep the anonymous sign-in IP rate limit.
5a. Dashboard, Authentication, Attack Protection: **enable CAPTCHA (Cloudflare Turnstile)** and set the secret. CAPTCHA is the real Sybil control behind sec H1/H2 (the DB gates only slow it down). The client must pass `options.captchaToken` to `signInAnonymously()` (developer/UI task) or sign-in will fail once CAPTCHA is on.
6. Dashboard, Realtime, Settings: **"Allow public access" = OFF** (private channels only; required, sec I1). Clients must create channels with `{ config: { private: true } }` and call `supabase.realtime.setAuth()` after sign-in. With public access on, the `rt_read`/`rt_write` policies (incl. the `pos:<zone>` allow-list) are bypassed.
7. Settings, API: the exposed schemas stay `public` (plus `graphql_public` if used). **Do not expose `private`.**
8. Smoke checks in the SQL editor:
   - `select count(*) from private.blocklist;` should return 43 (27 from 0001 + 16 from 0002).
   - `select count(*) from private.secrets;` should return 2.
   - `select has_function_privilege('anon','public.drop_gift(uuid,public.gift_kind)','execute');` should return false.
   - `select has_function_privilege('authenticated','public.admin_ban_user(uuid,boolean,text)','execute');` should return false.
   - `select private.cfg()->>'reportsToHideSign';` should return 5 (0002 applied).
9. App smoke test with two browsers: register HR and candidate, drop xu (ticker plus toast), send a 500k (contact unlocks), accept, send an offer, accept, and confirm the candidate shows as placed. Check the Postgres logs for `ErrorSendingBroadcastMessage`.
10. Server-only env: `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_KEY` (used by `/api/admin/moderate`). Only the anon key goes to the browser.
11. **Verify the client-IP headers (sec H2) — required before trusting the IP limits.** Temporarily create a probe in the SQL editor, call it once from a browser through the API, then drop it:

    ```sql
    create function public.debug_ip() returns jsonb language sql security definer set search_path = '' as $$
      select jsonb_build_object('headers', current_setting('request.headers', true)::jsonb - 'authorization' - 'apikey' - 'cookie',
                                'picked', private.client_ip()) $$;
    grant execute on function public.debug_ip() to anon;
    -- browser: await supabase.rpc('debug_ip')   (then:)
    drop function public.debug_ip();
    ```

    Expected: `picked` is your public IP. Then repeat with a forged header (`curl -H 'X-Forwarded-For: 1.2.3.4' -H 'X-Real-IP: 1.2.3.4' .../rest/v1/rpc/debug_ip`): `picked` must **not** become `1.2.3.4`. If it does (e.g. `x-real-ip` is passed through unmodified) or `picked` is `unknown` / a Supabase-internal address, adjust the precedence in a new migration (`create or replace function private.client_ip()`) before launch; with `unknown` every caller shares one IP bucket (3 HR signups per hour for the whole site).

## 7. Rollback

- **Application rollback:** set the Supabase env vars off and the app falls back to DemoBackend. The schema can stay; it has no side effects.
- **Schema rollback** (only for an environment with no real data; it is **destructive** and needs a verified backup and explicit approval):

  ```sql
  -- DESTRUCTIVE: drops all app data. Requires backup + explicit approval.
  drop policy if exists rt_read on realtime.messages;
  drop policy if exists rt_write on realtime.messages;
  drop schema private cascade;
  drop table if exists public.reports, public.notifications, public.incense, public.offers, public.invitations,
    public.candidate_daily, public.gifts, public.candidate_contacts, public.candidates, public.profiles cascade;
  drop function if exists public.my_candidate_id, public.upsert_profile, public.upsert_my_candidate,
    public.set_my_candidate_status, public.delete_my_candidate, public.list_candidates, public.get_candidate,
    public.get_candidate_contact, public.get_me, public.get_temple_stats, public.drop_gift, public.send_invitation,
    public.respond_invitation, public.send_offer, public.respond_offer, public.light_incense, public.get_fortune,
    public.report_candidate, public.mark_notifications_read, public.admin_moderate, public.admin_list_pending;
  drop type if exists public.user_role, public.candidate_status, public.sign_state, public.gift_kind,
    public.invite_status, public.offer_status, public.contact_kind;
  delete from supabase_migrations.schema_migrations where version like '0001%';
  -- default-privilege changes (optional to restore): re-grant per Supabase defaults if desired.
  ```

  On a non-production project, `supabase db reset --linked` is simpler, and also destructive.
- **Forward fixes** go in a new `0003_*.sql`, never edits to 0001/0002. Re-run `pnpm test:db` before every push.
- **0002 rollback**: see section 9.7.

## 8. Running locally

```
pnpm test:db                       # needs PostgreSQL 15+ server binaries (initdb/pg_ctl/psql); no Docker
PGBIN=/usr/lib/postgresql/16/bin PXV_DB_TMP=/some/dir KEEP=1 pnpm test:db   # keep the cluster for debugging
```

Add new SQL tests as `supabase/tests/NN_name.sql`. Use `begin … rollback`, a `DO` block, and the `tests.*` helpers, and call `tests.pass('label')` for each group.

## 9. `0002_hardening.sql` (review + security audit of 2026-11-04)

Engine/version: PostgreSQL 16.15 local (hosted Supabase 15/17; `split_part(..., -1)` needs PG 14+) | Migration tool: Supabase CLI | Affected tables (rows at first deploy): all empty or seed-only (`candidates` ~40 samples, `candidate_daily` a few hundred, `private.rate_hits` 0). 0001 has never been deployed, so 0002 ships together with it, but it is written as if 0001 were live.

### 9.1 Steps (each deployable on its own)

| # | Release | Migration / action | Lock & rewrite | Est. duration (first deploy / 100k candidates) | Compatible with app versions | Rollback |
|---|---|---|---|---|---|---|
| 1 | with this release | `0002_hardening.sql` (one transaction, `lock_timeout = 5s`) | `ADD COLUMN` nullable / constant default on `profiles`, `candidates`, `reports`: metadata only, ACCESS EXCLUSIVE for ms. `CREATE INDEX rate_hits_bucket_idx`: blocks writes on `private.rate_hits` while building (tiny table, purged every 25 h). `ALTER POLICY` on `realtime.messages`: ACCESS EXCLUSIVE for ms (fails fast on `lock_timeout`; retry the push). `UPDATE profiles set hr_since` backfill: 0 rows now, one statement over HR rows later (< 1 s at 100k). Everything else is `CREATE OR REPLACE FUNCTION` | < 1 s / < 2 s | Old clients keep working: every RPC keeps its signature (admin_list_pending gains defaulted params). New error codes appear (`MODERATION_LOCKED`, `BANNED`, `TOO_NEW`); a client that does not know them shows NETWORK until it is updated. | Section 9.7 |
| 2 | with this release | Dashboard: Realtime public access OFF, CAPTCHA on, header check (section 6, steps 5a, 6, 11) | none | minutes | needs the client to send `captchaToken` once CAPTCHA is on | toggle back |

If 0002 is ever re-applied to a big populated database: the index on `rate_hits(bucket)` should then be built by hand with `create index concurrently` before the push (the migration's `if not exists` skips it).

### 9.2 What changed (finding -> change)

| Finding | SQL (0002) | TS mirror |
|---|---|---|
| Review M2 | `private.emit_card(c)`: visible (`sitting`/`placed`) -> `candidate_upsert`, otherwise `candidate_remove`. Used by `report_candidate`, `admin_moderate`, `admin_ban_user`. | `engine.emitCard` (reportCandidate, adminModerate) |
| Review M4 / sec M5 | `list_candidates`: sitting + placed with `placed_at` within `placedVisibleDays` (30); the `listMax` (3000) cut orders sitting first, newest first; output order unchanged (created_at asc). `get_candidate`: uuid-shaped key -> PK lookup, else slug (both indexed), null/oversized key -> null. | `listCandidates` |
| Review minor 1 | `has_pii` ignores `asp/vb/ado/ml.net`, `socket.io`, `draw.io` (`.js` is not a TLD). | `pii.ts` |
| Review nits | `upsert_my_candidate` never raises on malformed JSON (booleans: only JSON `true`; integral JSON numbers; non-array skills/modes). `get_candidate_contact` missing row -> `NOT_FOUND`. | already in `validation/candidate.ts`; engine |
| Sec H1 + L5 | Contact (and `me.can_see_contact`) only for owner or a caller **currently HR** with an **accepted** invitation; `contact:<uid>` 20/h (RATE_LIMITED, 3600); `profiles.hr_since` + `send_invitation` -> `TOO_NEW` (retryAfterSec) within `hrInviteMinAgeMinutes` (10) of becoming HR; a switch to HR restarts the clock. `get_candidate_contact` is now VOLATILE. | `canSeeContact`, `getCandidateContact` (now a DemoBackend transaction), `checkInvite.hrAgeMs` |
| Sec H2 | `private.client_ip()`: `cf-connecting-ip` > `x-real-ip` > rightmost XFF > `'unknown'` (shared bucket, fail closed). Love per IP on the VN day (`hit_day`). | n/a (no IP in demo) |
| Sec H3 | `prof_upd` 5/min, `cand_status` 4/min (RATE_LIMITED, 60); `upsert_profile` / `set_my_candidate_status` / `upsert_my_candidate` / `delete_my_candidate` skip broadcasts when the card JSON (or visibility) is unchanged. | engine `cardKey` |
| Sec M1 | `candidates.mod_hidden_at` (admin `hide`/`ban`); `set_my_candidate_status('sitting')` -> `MODERATION_LOCKED` when admin-hidden or sign not `ok`; admin `unhide` lifts it (owner then sits). `private.bans` checked by `upsert_profile`, `upsert_my_candidate`, `send_invitation`, `report_candidate` -> `BANNED`; admin actions `ban`/`unban` + `admin_ban_user(uuid, boolean, text)` for users without a candidate row. `private.candidate_tombstones` on delete while not ok; the next create starts `pending_review` (and hidden + locked if it was admin-hidden; admin `delete` sets both). `candidateCreatesPerDay` = 3 (VN day). | engine (`adminModerate`, `adminBanUser` exported for parity tests; no demo UI) |
| Sec M2 | `reports.counted`: reporter profile < `reporterMinAgeMinutes` (60) old -> stored, not counted; `reportsToHideSign` 3 -> 5; `admin_list_pending(p_offset, p_limit)` (default 50, max 200, newest `updated_at` first; adds `user_id`, `mod_hidden_at`, `banned`). | rules.ts, engine |
| Sec M4 | Normalizer: fillers stripped from stored text (`clean`); moderation forms drop Default_Ignorable + U+2800, map Cyrillic/Greek homoglyphs on NFD, strip every leftover combining mark (\p{M}, ranges generated into `src/lib/moderation/unicodeData.ts` and embedded in SQL); exact mode adds a single-letter-joined pass and a repeated-letter-collapsed pass (collapse only for terms without doubled letters, so `cmm` never matches `180 cm`); loose/compact get a collapsed pass. Own unaccent (NFD + strip marks + đ->d) instead of the `unaccent` dictionary, so TS and SQL are identical. +16 blocklist terms. PII: spelled/bracketed obfuscations, `@gmail`, `at gmail`, more TLDs (`bit.ly`, `.co`, `.xyz`...), `_ / , *` phone separators, full-width digits (NFKC); `has_pii` on display_name and company. `hr_contact` must be email / http(s) URL / phone (VALIDATION) and pass `is_blocked` (BLOCKED_CONTENT). | `normalize.ts`, `blocklist.ts`, `pii.ts`, `unicode.ts`, `validation/profile.ts`, `limits.ts` |
| Sec L1 | `private.cand_ref`: `hide_from_ticker` -> `{name}` only in gift/invite/offer events; `placed` event gets a ticker-safe `name`. | `refOf` -> `{id: '', name, zone: null}`; `events.ts` uses `e.name` |
| Sec L4 | `private.purge_rate_hits()` from every hit, at most every 5 min (try-lock, never blocks): deletes buckets older than `rateRetentionHours` (25). pg_cron alternative in the function comment. | engine purges at 25 h |
| Sec I1 | `rt_read` / `rt_write`: `pos:` topics = `pos:plaza` + `pos:<zone>` allow-list (no `like 'pos:%'`). | parity test vs `ZONE_IDS` |
| Review M3 | none (demo only) | seeded bot HRs (`isBot`) skip the daily gift quotas |

### 9.3 Coverage of the new SQL tests

| File | Covers |
|---|---|
| 80_contact_gate | pending -> locked; accepted -> unlocked; declined / expired -> locked; other HR locked; role switch locks and switching back unlocks (and restarts TOO_NEW); missing contact row NOT_FOUND (owner + HR); 20/h cap global per HR with retryAfterSec, owner uncapped, locked attempts burn no quota; TOO_NEW at 0 / 9.5 / 10 min with retryAfterSec, gate before lookup/validation, hr_since set/cleared/kept; hr_contact free text / `javascript:` / `ftp:` / vague -> VALIDATION, blocked word -> BLOCKED_CONTENT, URL and phone ok |
| 81_moderation_lock | admin hide -> remove event, MODERATION_LOCKED survives edits and role round trips, hiding allowed, unhide does not seat; removed sign and pending sign lock; tombstones (pending, hidden + locked, admin delete = both, consumed on recreate, clean recreate unaffected, hidden recreate not broadcast); 3 creates per VN day (no retryAfterSec, VN-midnight bucket); ban via admin_moderate (hidden + locked + remove event) blocks upsert_profile / upsert_my_candidate / report / sit; HR ban via admin_ban_user blocks send_invitation; unban both ways; admin input validation; admin_ban_user denied to authenticated and anon |
| 82_reports_admin | 5 fresh reporters stored with `counted = false` and never hide; reporter counts once 1 h old; hide exactly at 5 aged reporters; hidden candidate reaching the threshold emits `candidate_remove`, never `candidate_upsert`; admin approve/remove on hidden -> remove, on visible -> upsert; report bucket = VN midnight; admin_list_pending pages, no overlap, clamping, no-arg default, old overload dropped, denied to authenticated |
| 83_rate_ip | client_ip precedence (cf > x-real-ip > rightmost XFF > unknown, trimming, lowercase, 64-char bound, pooled-connection `''`); rotating the leftmost XFF does not bypass BR-SP3; header-less callers share one bucket; cf-connecting-ip separates users behind one proxy; raw IPs never stored; love bucket = VN midnight; upsert_profile 5/min and set_my_candidate_status 4/min with retryAfterSec; null/placed status VALIDATION; no-op broadcast suppression for profile, status and candidate edits; 25 h purge, 5-min throttle, index exists |
| 84_reads_realtime | placed within 30 days listed, older placed and hidden not; 3001 extra sitting rows: 3000 returned, newest sitting kept, placed cut first, oldest dropped, created_at order; get_candidate by uuid / uppercase uuid / slug, unknown / null / oversized -> null; malformed JSON matrix for upsert_my_candidate; PII in display_name / company (blocklist checked first, ASP.NET ok); anonymous invite/offer refs and placed `name`; `pos:` allow-list read + write (zones, plaza; `pos:evil`, `pos:`, `pos:backend:x`, `pos:BACKEND` denied) |
| 85_moderation_parity | GENERATED by `tests/parity/moderation-sql.test.ts`: 178 distinct strings (`tests/parity/moderation-cases.ts`: ~90 must-block incl. bypasses, ~65 must-pass sentences, PII yes/no) through `is_blocked`, `has_pii`, `loose` and the exact form must equal the TS results. Mutation-checked: flipping one expectation fails the file. |

Mutation checks run during development (then reverted): leftmost-XFF `client_ip` fails 10/40/80/83; removing the MODERATION_LOCKED check fails 81.

Measured cost (PG16 local): `is_blocked` ~0.35 ms, `has_pii` ~0.1 ms per call, so about 2 ms of moderation per `upsert_my_candidate`.

### 9.4 Assumptions to verify on hosted Supabase

1. Client-IP headers: section 6, step 11. Until verified, treat the IP limits as unreliable; if every request lands in `unknown`, the 3 HR signups per hour becomes a site-wide limit.
2. `supabase db push` runs each file in one transaction (assumed; the file has no `CONCURRENTLY` and no explicit `BEGIN`, so it is also safe without one).
3. `ALTER POLICY` on `realtime.messages` as `postgres`: same privilege as the 0001 `CREATE POLICY`; if the push is refused, run the two `alter policy` statements in the SQL editor.
4. `normalize(text, NFD/NFKC)` uses the server's Unicode tables (PG 16: Unicode 15); the shared mark ranges come from Node (Unicode 17). Differences only affect code points newer than Unicode 15.

### 9.5 Monitoring during rollout

- Postgres logs: `lock timeout` during the push (retry), `ErrorSendingBroadcastMessage` (silent broadcast failures).
- Error-code rates in the client logs: a spike of `IP_LIMIT` right after launch means the header precedence is wrong (step 11); `TOO_NEW` and `MODERATION_LOCKED` are expected but rare.
- `select count(*), min(bucket) from private.rate_hits;` should never show buckets older than ~25 h.
- `select count(*) filter (where not counted), count(*) from public.reports;` shows how many reports come from fresh accounts (brigading signal).

### 9.6 Behaviour changes the app must reflect

New error codes `MODERATION_LOCKED`, `BANNED`, `TOO_NEW` (retryAfterSec); contact locked until the candidate **accepts**; 500k blocked for 10 min after becoming HR; 5 aged reporters to hide a sign; hr_contact must be an email / URL / phone; PII refused in display name and company; street gift/invite/offer events for `hide_from_ticker` candidates have no `candidate.id`/`zone`; `placed` events carry `name`; admin actions `unhide`, `ban`, `unban`, plus `admin_ban_user`; `admin_list_pending(p_offset, p_limit)`.

### 9.7 Rollback of 0002

- **Application rollback** (preferred): keep the schema; 0002 is backward compatible with 0001 clients. To relax a single rule, ship a new migration that `create or replace`s the function or changes `private.cfg()` (e.g. `reportsToHideSign`).
- **Schema rollback** (non-production only; it drops ban/tombstone/report-audit data, so it needs a verified backup and explicit approval): re-run the 0001 definitions of every function replaced here (copy them from `0001_init.sql`: `cfg`, `clean`, `loose`, `is_blocked`, `has_pii`, `hit`, `client_ip_hash`, and the RPCs `upsert_profile`, `upsert_my_candidate`, `set_my_candidate_status`, `delete_my_candidate`, `list_candidates`, `get_candidate`, `get_candidate_contact`, `drop_gift`, `send_invitation`, `send_offer`, `respond_offer`, `report_candidate`, `admin_moderate`), recreate `admin_list_pending()` without params, restore the `like 'pos:%'` policies, then:

  ```sql
  -- DESTRUCTIVE: requires backup + explicit approval
  drop function if exists public.admin_ban_user(uuid, boolean, text), public.admin_list_pending(int, int),
    private.emit_card(public.candidates), private.cand_ref(public.candidates), private.is_banned(uuid), private.client_ip(),
    private.hit_day(text, int), private.hit_at(text, timestamptz, int), private.purge_rate_hits(), private.contact_ok(text),
    private.pii_form(text), private.mod_collapse(text), private.mod_join(text), private.mod_base(text),
    private.mod_strip_ignorable(text), private.mod_strip_marks(text);
  drop table if exists private.bans, private.candidate_tombstones, private.maint;
  drop index if exists private.rate_hits_bucket_idx;
  alter table public.reports drop column if exists counted;
  alter table public.candidates drop column if exists mod_hidden_at;
  alter table public.profiles drop column if exists hr_since;
  delete from private.blocklist where term in ('loz','cak','cặk','djt','dkm','vcc','clgt','óc chó','buoi','fuck','fck','shit','bitch',
    'viecnheluongcao','congtacvienonline','naptiennhanviec');
  delete from supabase_migrations.schema_migrations where version like '0002%';
  ```
