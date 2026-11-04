# QA report: Phố Xin Việc 3D (MVP) — 2026-11-04

Scope: MVP stories US-1..US-18, US-20 and the business rules in REQUIREMENTS.md section 5, against the demo backend
(default mode, no Supabase env). The SQL/Supabase path is covered by `pnpm test:db` and `tests/backend/supabase.test.ts`
(not re-derived here). E2E ran against a copy of the production build on port 3201, because other agents rebuilt `.next` during the session.

## Traceability matrix

Legend: UT = Vitest (tests/), E2E = Playwright (e2e/), DB = supabase/tests. "NEW" = added in this QA pass.

| Req | Existing tests | New tests (this pass) | Remaining gap |
|---|---|---|---|
| US-1 AC-1.1 guest login + persistence | demo.test (register), demo-flow e2e | onboarding-and-views: session survives reload | none |
| AC-1.2 empty / blocked name | validation.test, demo.test | UT 'rejects empty, 1-char, 25-char, whitespace, zero-width, blocked'; E2E empty/short/blocked shows field error, no session | none |
| AC-1.3 HR needs company + "Chưa xác minh" | validation.test | UT company 2..40; E2E company required + label | none |
| AC-1.4 restore identity | none in UI | E2E reload keeps identity/quota | multi-browser restore not tested |
| AC-1.5 viewer blocked from HR coin / 500k | demo.test WRONG_ROLE | E2E disabled with "Đăng ký HR" reason | none |
| US-2 AC-2.1/2.2 create profile | demo-flow e2e, validation.test | NEW smoke "Bạn" row | field boundary matrix only in validation.test |
| AC-2.3 banned sign rejected | demo.test, validation.test | E2E banned sign / phone / URL / too short rejected next to field, input kept | none |
| AC-2.4 errors next to field, data kept | none | E2E (same tests) | none |
| US-3 sign suggestions | signTemplates.test | E2E Gợi ý fills editable sign | none |
| US-4 edit/hide/delete | demo.test lifecycle | exploratory: double submit makes one profile | AC-4.3 share URL 404 after delete (UI) untested |
| AC-4.4 only owner | demo.test (wrong role) | - | 403 on foreign edit not asserted explicitly |
| US-5 zones, counts (AC-5.1..5.4) | seed.test | E2E >= 8 zone chips with counts | AC-5.3 teleport on zone select in 3D not tested |
| US-6 AC-6.1 WASD | street-3d e2e | - | movement result not asserted |
| AC-6.2 mobile / joystick | scene-math (joystick maths) | E2E iPhone 13: 3D loads, joystick visible, in viewport, knob moves/resets, no overflow | tap-to-walk not tested |
| AC-6.3/6.4 collision, speed limits | scene-math | - | server-side speed check is untested |
| US-7 presence | presence.test, peers.test | - | AC-7.2 15 s timeout, AC-7.4 50-avatar cap not tested |
| US-8 CV panel, AC-8.2 contact hidden | demo.test (engine) | UT contact never in payloads, xu/love don't unlock; E2E hidden for HR and other HR, DOM free of the value | unlock only after accept (UT + E2E) |
| AC-8.3 Esc closes | used implicitly everywhere | - | none |
| US-9 AC-9.1 xu | demo-flow, demo.test | - | none |
| AC-9.2 quota exhausted messaging | demo.test (engine) | E2E: 11th xu disabled, title and list show "Hết xu hôm nay, mai quay lại" | error toast path when forced is untested |
| AC-9.3 per-candidate cap | demo.test | E2E: 3rd xu disabled with reason | none |
| AC-9.4 self gift | demo.test | - | none |
| US-10 500k, AC-10.4 expiry, 10.5 duplicates | demo.test, limits.test | UT exact 14-day boundary, expired not acceptable, expiry frees one of 5 slots | AC-10.2 doc still says unlock-on-invite |
| US-11 offers | demo.test | - | none |
| US-12 love coin | demo.test (1 per candidate) | UT 5/day then LIMIT_DAILY, reset next day, doesn't touch HR xu, blocked for hidden candidate; E2E viewer 5/5 -> 0/5, separate counters, per-candidate and daily reasons | per-IP cap (BR-L3) only in DB tests |
| US-13/14 notifications, ticker | notify.test, demo.test | - | AC-13.3 offline unread list, AC-14.1 ticker latency not tested in UI |
| US-15 ranking/seat | ranking.test, seats.test | UT coins raise rank, incense doesn't, hiding closes gaps; E2E 10 xu from 5 HR move the seat up on the 60 s tick and the "lên ghế" toast shows | AC-15.5 "Đầu phố" top 10 only checked indirectly |
| US-16 fortune | fortune.test, demo.test | UT VN day boundary 16:59:59Z/17:00Z, cross-device equality, variety across days; E2E same text on repeat and after reload | none |
| US-17 incense | demo.test | E2E second incense shows "Mai thắp tiếp nhé" | AC-17.4 anonymous toast not UI-tested |
| US-18 share/OG | share.spec, shareData.test | E2E hostile OG inputs (5000 chars, emoji, RTL, script tags, SQL, path traversal, NUL, bidi, garbage ?d=) all return 200 image/png; /c/<hostile> never 5xx; deep link ?c= (valid, unknown, hostile) | AC-18.2 download/copy buttons untested |
| US-20 reports | demo.test | UT same reporter x3 never hides, concurrent idempotence; E2E 3 distinct users hide the sign, list shows "Biển đang chờ duyệt" | none |
| BR-C5 atomicity | demo.test (20 parallel) | E2E double-click spends one xu | DB concurrency.sh covers SQL |
| BR-SP5 honeypot | none | - | untested |
| BR-SP6 / BR-M2 normalisation | moderation.test | UT zero-width and "D.M" names rejected | none |
| 2D fallback | street-3d 2D test | E2E no WebGL (getContext stubbed) with ?view=3d falls back to list; ?view=2d never creates a canvas | none |

## Tests added

| File | Count | Notes |
|---|---|---|
| tests/backend/qa-gaps.test.ts | 17 | clock-aware (ripens accounts for TOO_NEW and reporter age) |
| e2e/rules-ui.spec.ts | 9 | uses Playwright `context.clock` to age HR and reporter accounts |
| e2e/onboarding-and-views.spec.ts | 26 | onboarding, form moderation, views, mobile, no-WebGL, OG hostile |
| e2e/exploratory.spec.ts | 5 | 1 is `test.fixme` (DEF-2) |
| e2e/helpers.ts | helpers | registerHr, registerAs, sitCandidate, openCv |

## Exploratory session

Production build, port 3200/3201, Chromium with Playwright scripts.

| Probe | Result |
|---|---|
| Double-click (and 5 rapid clicks) on Thả xu | one xu per drop; the busy guard works. OK |
| Two HR tabs drop on the same candidate simultaneously | both counted, totals converge after the broadcast. OK |
| Reload mid-flow (half-filled candidate form) | identity kept, draft lost (acceptable, noted) |
| Double-click "Vào phố" / "Ra ngồi" | one user, one profile. OK |
| Name `<b>x</b><i>y</i>`, emoji-only name | rendered as text. OK |
| Sign of 3 lines / over 80 chars | rejected with generic message (see DEF-3) |
| 80 x "W" sign, no overflow | accepted, no horizontal overflow |
| Duplicated tab (copied sessionStorage) | onboarding for a new user, no identity clash. OK |
| `?view=bogus&c=%00&t=zzz` | no crash, no page errors |
| "Đổi người (demo)" | does not switch user (DEF-2) |

## Defects

### DEF-1: contact unlocked on 500k SEND instead of candidate ACCEPT — Severity: major — FIXED in the working tree
- Was: the demo engine unlocked the contact as soon as the invitation existed. The engine now requires an accepted invitation.
- Verified by: `tests/backend/qa-gaps.test.ts` "contact unlocks for that HR only after the candidate accepts..." and `e2e/rules-ui.spec.ts` "contact unlocks only after the candidate ACCEPTS the 500k (UI)" (both green).
- Doc follow-up: REQUIREMENTS BR-Privacy and AC-10.2 still describe unlock-on-invite.

### DEF-5: existing tests broken by the in-flight hardening rules — Severity: major (suite red), owner: developer
- New rules in `src/lib/rules.ts` / demo engine: new HR accounts cannot send 500k for 10 min (TOO_NEW), reports from profiles younger than 60 min are not counted, `reportsToHideSign` is 5 (requirements say 3), contact unlocks on accept.
- Result: 8 pre-existing tests in `tests/backend/demo.test.ts` (contact lock, invitation validation, 5-open cap, full flow, BR-O4, offer expiry, HR 3 offers, 3 reports hide sign) and `e2e/demo-flow.spec.ts` fail. Fix by advancing the test clock (`w.advance(61 * 60_000)` after creating users; in e2e `context.clock.install()` + `fastForward`, as `e2e/rules-ui.spec.ts` does) and using `LIMITS.reportsToHideSign`. QA did not edit those files.
- REQUIREMENTS AC-20.2 (3 reports) and BR-M5 need updating to match.

### DEF-2: "Đổi người (demo)" does not switch identity — Severity: minor
- Steps: open two tabs, register "Alpha" and "Beta"; in tab 2 click "Đổi người (demo)".
- Expected: tab 2 reloads as a brand-new user (onboarding).
- Actual: tab 2 comes back as "Beta Hai" (same user). With only one user it returns the same user too.
- Cause: `claimIdentity` adopts the first stored user whose lock is free; the reloading tab's own lock is free again.
- Evidence: e2e/exploratory.spec.ts fixme '"Đổi người (demo)" switches to a different user'.

### DEF-3: generic validation message for over-long / 3-line signs — Severity: minor (UX)
- Steps: candidate form, sign with 3 lines (or > 80 chars), submit.
- Expected: message naming the rule (max 2 lines / 80 chars), AC-2.3 asks for a specific message.
- Actual: "Thông tin chưa hợp lệ, kiểm tra lại giúp mình nhé. (Biển carton)". No test marked; observed only.

### DEF-4: OG route 500s when vendored fonts are missing — Severity: minor (deployment hazard)
- Seen on a partial copy of the build without `src/assets/fonts`: `/api/og/c/<slug>` returned 500 ("No fonts are loaded"); `fallbackCard()` fails the same way, so the try/catch cannot save it. Not reproducible in the normal tree.

### Flake note
`e2e/exploratory.spec.ts` "double-clicking Vào phố / Ra ngồi" failed once on the first cold-server full run, then passed 3/3 alone and in the next two full runs. Cause not identified.

### Observations (not defects)
- Seat order only re-sorts on a 60 s tick (BR-Rank stability); the rank number in a freshly opened CV can lag up to a minute behind the xu count.
- Closed tabs free their demo identity; the next new tab in the same browser adopts it instead of showing onboarding (by design, AC-1.4), but it makes multi-user e2e scripts order-dependent. Tests keep pages open for this reason.
- `/api/og/*` with a query string over about 16 KB returns 431 from the Node HTTP layer before the app runs (not an app issue).
- tests/parity/sql-config "SQL blocklist rows equal src/config/blocklist.vi.ts" fails at the moment of writing: blocklist/SQL are being edited by the database engineer and developer in parallel. Not caused by QA tests.

## Suite results

Engine rules were still changing during the session; counts are from the last run.

| Command | Result |
|---|---|
| `pnpm test` | 27 files, 436 tests: 428 passed, 8 failed, all 8 in pre-existing `tests/backend/demo.test.ts` (DEF-5). All 17 tests in `qa-gaps.test.ts` pass. Baseline before QA: ~196. |
| `pnpm test:db` | 54 check groups passed, 0 failed (run before the 0002 migration tests landed) |
| `pnpm test:e2e` (fresh production build of the working tree via `E2E_BASE_URL`) | 48 passed, 3 skipped (QA fixme DEF-2 + pre-existing), 1 failed: pre-existing `e2e/demo-flow.spec.ts` (DEF-5) |

## Remaining coverage gaps
AC-4.3 (share URL after delete), AC-6.1 movement result, AC-6.3/6.4 collision and server speed limit, AC-7.2/7.4 presence timeout and 50-avatar cap,
AC-13.3 offline unread list, AC-14.1 ticker latency, AC-17.4 anonymous incense toast, AC-18.2 download/copy buttons, BR-SP5 honeypot,
real Supabase mode end to end (only DB-level tests), 3D tap-to-walk, multi-browser identity restore, TOO_NEW and reporter-age messaging in the UI.
