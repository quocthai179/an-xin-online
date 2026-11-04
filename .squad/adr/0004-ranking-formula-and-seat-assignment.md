# ADR-0004: Ranking formula computation and client-side seat assignment
Status: Accepted
Date: 2026-11-04

## Context
BR-Rank fixes the formula: `3·HR_coins + 0.3·love (≤ 20/day) + 20·invites + 10·accepted` (all with 7-day half-life decay)
`+ 2·min(sitDays, 30) + 1·completeness (0..5) + newcomer boost (5 → 0 over 24 h)`; ties by sitting time, created_at, id;
30 seats per zone (odd left, even right, seat 1 nearest the street head); a candidate must not change seat more than once
per minute; recompute every ≤ 5 min or on events; deterministic tests. We need the same behaviour in Supabase and demo mode
and we want to avoid duplicating the weights in SQL and TS.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| A. Compute full score + seats in SQL (view or cron job writing `seat` columns) | Single authoritative ranking | Needs scheduler (pg_cron) or heavy view; weights duplicated in TS for demo; seat churn broadcasts to everyone |
| B. Exact per-event decay in TS from the raw gift log | Precise | Ships every gift row to clients; doesn't scale |
| C. **SQL returns decayed sums from daily buckets (`candidate_daily`, 60-day window, day-granular age); TS applies weights, sitting/newcomer terms and assigns seats on a 60 s client tick** | Weights only in TS (`src/lib/ranking.ts`); cheap query (≤ 60 rows/candidate); demo computes the same sums with `decayedSums()`; stability rule falls out of the tick | Clients may differ momentarily (clock, fetch time) — cosmetic; decay uses whole VN days (approximation of BR-Rank's continuous age) |

## Decision
Option C.
- `list_candidates()` returns `hr_decayed`, `love_decayed` (love capped at 20/day before decay), `invite_decayed`,
  `accepted_decayed` (acceptances bucketed on the response day), `completeness`, `sitting_since`, `created_at`.
- `rankingScore(input, now)` (pure) applies BR-Rank weights; `compareRanked` applies the tie-break chain.
- `assignSeats(ranked, 30)` (pure) groups by zone, sorts, assigns seats 1..30, rest to a queue. The client recomputes on a
  60 s tick only; between ticks `appendNewcomer` puts a new candidate on the last free seat (AC-2.1) and removals leave a gap
  until the next tick. Avatars glide 1.5 s to new seats. Own-seat improvements trigger "Bạn được lên ghế số N".
- Incense and fortune never affect score.

## Consequences
- Ranking is identical in demo and production for the same data, and fully unit-testable with fixed fixtures and a fixed `now`.
- Seats are not stored server-side, so "Hạng #N trong zone" on the share page (server) is computed by running the same pure
  functions over `list_candidates()` if needed (MVP: not shown on OG).
- Day-granular decay means scores change in steps at VN midnight — acceptable and even helps stability.
- Anti-sybil strength relies on quotas (BR-C2, BR-L*) more than on the formula; BR-SP4 anomaly flags are deferred to v2.
