# DB verification: `supabase/migrations/0001_init.sql`

Engine: PostgreSQL 16.15 (local, throwaway cluster), target is hosted Supabase (PG 15/17) | Migration tool: Supabase CLI (`supabase db push`)
Affected tables: all new (initial schema, empty project), so there are no lock or backfill concerns for this release.
Date: 2026-11-04. Owner: database-engineer.

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
3. The migration runs **as `postgres` (non-superuser)**, like `supabase db push`. The runner fails if it prints any ERROR or WARNING.
4. The stub and the migration run again on a **second fresh database** in the same cluster, where the roles already exist. This must be clean.
5. **Locale guard:** a database with `LC_CTYPE=C` must make the migration fail.
6. `01_helpers.sql` adds the `tests` schema. It impersonates users the way PostgREST does (`role` plus `request.jwt.claims` plus `request.headers`) and provides assertion helpers.
7. The test files run. Each one is `begin … rollback`, and every failed assertion raises an exception.
8. `concurrency.sh` runs parallel psql clients, with committed fixtures that it cleans up afterwards.
9. Teardown: `pg_ctl stop` and `rm -rf` of the temp directory. Set `KEEP=1` to leave the cluster running for debugging.

## 2. Results (final run)

```
== provision + migrate
   migrated postgres: 1 file(s) OK
   migrated fresh_again: 1 file(s) OK
   locale guard: LC_CTYPE=C database rejected as expected
== tests
   ok   10_profiles.sql                8 checks
   ok   20_candidates.sql              4 checks
   ok   30_gifts.sql                  10 checks
   ok   40_invites_offers.sql         12 checks
   ok   50_reports_temple.sql          6 checks
   ok   60_rls_privileges.sql          6 checks
   ok   70_realtime.sql                4 checks
== concurrency
   ok   concurrency.sh                 3 checks
== result: 53 passed check groups, 0 failed file(s)
```

The 53 groups contain about 300 individual assertions (`tests.ok/err/eq/check`), plus loops over the blocklist cases, the table list and the RPC list.

Coverage by file:

| File | Covers |
|---|---|
| 10_profiles | `upsert_profile` for viewer/HR/candidate: validation, moderation of name/company, null role/avatar, first rename free then 24 h cooldown, FK to `auth.users`, role switch hides the candidate and emits `candidate_remove`, BR-SP3 (3 HR signups per IP per hour, hashed IP only), `get_me` |
| 20_candidates | SQL moderation using the same cases as `tests/lib/moderation.test.ts` (blocklist modes, allowlist, NFKC, zero-width, bidi, leet, PII). `upsert_my_candidate`: every validation field, banned words (sign/title/bio/skills), PII, `javascript:` contact, no quota burned on failure, zone cooldown, 10 edits per hour, 1 create per 10 min, delete. Hide/sit-again visibility (`sitting_since` reset). No `user_id`/contact in reads. |
| 30_gifts | anon denied; NO_PROFILE / WRONG_ROLE / SELF_ACTION / NOT_FOUND; 2 xu per candidate per day; 10 xu per day per HR; per-HR independence; VN-day rollover; 5 ops/s (`retryAfterSec: 1`); placed candidate gets CANDIDATE_UNAVAILABLE; love 5/day and 1 per candidate for every role; 30 love per IP per day; street and inbox emits; sample candidate gets no inbox message; anonymised ticker name |
| 40_invites_offers | Contact locked until the HR has sent a 500k (and stays locked for other HRs); SAMPLE_CANDIDATE, validation, moderation, INVITE_ALREADY_OPEN, 3 per day, CANDIDATE_FULL at 5 open, lazy expiry, 7-day cooldown, EXPIRED / NOT_PENDING / foreign invite, decline with blocked reason. Invitation RLS per party. NEED_ACCEPTED_INVITE, offer validation, OFFER_ALREADY_OPEN, HR_OFFER_LIMIT. Accepting sets `placed` and closes other pending invites (with notifications and a street `placed` event); company shown only when both sides consent; expired offer; sit again. No direct UPDATE on invitations/offers. |
| 50_reports_temple | Report SELF_ACTION / NO_PROFILE / VALIDATION (incl. null) / ALREADY_REPORTED; auto-hide at 3 distinct reporters (`pending_review`, a single `sign_hidden`, sign nulled in public reads, edits keep the review); 20 reports per day; `admin_*` only for service_role; incense once per day plus an anonymous notification and temple stats; fortune is deterministic per user and day, follows the formula, varies across users, and anon is denied; notifications mark-read and RLS |
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
4. **`request.headers` / `x-forwarded-for`.** We assume PostgREST puts the client IP first. If it doesn't, the IP limits (BR-SP3, BR-L3) apply to a proxy IP or fail open. Check with `select private.client_ip_hash()` through an RPC wrapper if you need to.
5. **Anonymous sign-in JWTs** (`is_anonymous: true`, role `authenticated`): assumed to match the stub.
6. **Partitioned `realtime.messages` retention and cleanup:** managed by Supabase and not modelled.

Known behaviours, documented and not changed:

- `private.hit` buckets are aligned to UTC epoch. The 1-day IP love limit and the 20 reports per day therefore roll over at 07:00 VN time, not at midnight. Quotas that use `gifts.day`/`invitations.day` do use the VN day.
- `upsert_my_candidate` still raises (which the client sees as NETWORK) on malformed JSON types, such as `skills` not being an array or `salary_negotiable` = `"abc"`. The TS client always sends well-typed input.
- `get_candidate_contact` unlocks the contact for an HR with *any* invitation to the candidate, including declined or expired ones. This matches the design ("đã thả 500k hợp lệ"), and the quota of 3 per day limits scraping.

## 6. First deploy checklist (humans, in this order)

1. Back up: for a brand-new project there is nothing to back up. For an existing project, take a `pg_dump` or PITR snapshot first.
2. `supabase login` then `supabase link --project-ref <ref>`.
3. Confirm the locale: `select datctype from pg_database where datname = current_database();` should return `C.UTF-8` or `en_US.UTF-8`. If it returns `C`, the migration aborts by design.
4. Run `supabase db push --dry-run`, then `supabase db push`. Expect exactly one migration, `0001_init`.
5. Dashboard, Authentication, Providers: **enable Anonymous sign-ins**. Keep the anonymous sign-in IP rate limit, and consider Turnstile CAPTCHA.
6. Dashboard, Realtime, Settings: private channels must be enforceable. Optionally turn on "Allow public access" = **off** (private-only). Clients must create channels with `{ config: { private: true } }` and call `supabase.realtime.setAuth()` after sign-in.
7. Settings, API: the exposed schemas stay `public` (plus `graphql_public` if used). **Do not expose `private`.**
8. Smoke checks in the SQL editor:
   - `select count(*) from private.blocklist;` should return 27.
   - `select count(*) from private.secrets;` should return 2.
   - `select has_function_privilege('anon','public.drop_gift(uuid,public.gift_kind)','execute');` should return false.
9. App smoke test with two browsers: register HR and candidate, drop xu (ticker plus toast), send a 500k (contact unlocks), accept, send an offer, accept, and confirm the candidate shows as placed. Check the Postgres logs for `ErrorSendingBroadcastMessage`.
10. Server-only env: `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_KEY` (used by `/api/admin/moderate`). Only the anon key goes to the browser.

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
- **Forward fixes** go in a new `0002_*.sql`, never edits to 0001. Re-run `pnpm test:db` before every push.

## 8. Running locally

```
pnpm test:db                       # needs PostgreSQL 15+ server binaries (initdb/pg_ctl/psql); no Docker
PGBIN=/usr/lib/postgresql/16/bin PXV_DB_TMP=/some/dir KEEP=1 pnpm test:db   # keep the cluster for debugging
```

Add new SQL tests as `supabase/tests/NN_name.sql`. Use `begin … rollback`, a `DO` block, and the `tests.*` helpers, and call `tests.pass('label')` for each group.
