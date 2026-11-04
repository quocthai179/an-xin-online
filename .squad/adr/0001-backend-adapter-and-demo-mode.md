# ADR-0001: Backend adapter interface with Supabase and Demo implementations
Status: Accepted
Date: 2026-11-04

## Context
Production runs on Supabase (Postgres, anonymous auth, Realtime, RLS). The development environment has **no Supabase
credentials**, yet the app must fully work with `pnpm dev`, including multi-user behaviour (presence, ticker, notifications)
so the developer and QA can exercise every story. Business rules (quotas, cooldowns, moderation) must be enforced server-side
in production (Postgres RPCs) and must behave identically in demo so QA results carry over.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| A. Single `Backend` interface; `SupabaseBackend` + `DemoBackend` (localStorage + Web Locks + BroadcastChannel), shared pure rule engine in `src/lib` | Works offline with zero setup; multi-tab = multi-user; UI only knows one contract; pure rules unit-testable | Rules exist twice (SQL + TS) → drift risk; demo is per-browser only |
| B. Local Supabase via Docker (`supabase start`) for dev | One implementation, real RLS | Requires Docker + CLI not available here; heavy for one dev agent; still no creds for QA envs |
| C. Next.js API routes + in-memory/SQLite server as the "demo backend" | Shared across browsers; one server-side rules impl in TS | Diverges from production architecture (Supabase RPC); needs a WebSocket server; state lost on dev reload; more code |
| D. Mock Service Worker intercepting Supabase REST/WS | Exercises real SupabaseBackend code | Re-implementing PostgREST + Realtime protocols is far more work than option A |

## Decision
Option A. `src/backend/types.ts` defines `Backend` (identity, candidates, gifts, invitations, offers, temple, reports,
notifications, street events, presence). `createBackend()` picks `SupabaseBackend` when `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (and `NEXT_PUBLIC_FORCE_DEMO` is not `1`), else `DemoBackend`.
DemoBackend's `engine.ts` implements each RPC in TS **with the same check order and error codes** as the SQL, built on
`src/lib/limits.ts`. Constants live in `src/lib/rules.ts`; the migration embeds the same JSON between
`BEGIN:LIMITS_JSON`/`END:LIMITS_JSON` markers and a Vitest parity test enforces equality (same for the blocklist).
Demo identity is per tab (sessionStorage + Web Locks), so two tabs are two users; dependencies (store, bus, locks, clock)
are injected so two DemoBackends can be tested in Node.

## Consequences
- The whole product (except cross-device sharing of user-created demo candidates) is demoable offline.
- Rule drift between SQL and TS is the main risk: mitigated by parity tests for constants and by mirroring check order;
  the SQL itself cannot be executed in this environment and must be smoke-tested on first deploy.
- Server components (share pages, OG) also need a mode switch: in demo they resolve seed candidates from `src/lib/seed.ts`
  and a validated `?d=` payload for user-created ones.
- New features must be added to the interface, both implementations, and (if a rule) both SQL and TS.
