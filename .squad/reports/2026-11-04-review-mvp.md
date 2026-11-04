# Code review — MVP (1e49d33..HEAD) — REQUEST CHANGES

Blocker 0 · Major 4 · Minor 9 · Nit 3

## Major
- **M1** `SupabaseBackend.getMe()` returns null on transient error → `session.refreshMe` sets `me=null` → user kicked to onboarding. Fix: distinguish error vs no-profile; keep previous `me` on error.
- **M2** `report_candidate` / `admin_moderate` (SQL ~925, ~954) and `engine.ts:618` emit `candidate_upsert` for hidden candidates; `mapCardLight` maps `hidden`→`sitting`. Hidden candidates reappear on street. Fix: guard status in SQL + engine, mapper returns null for hidden.
- **M3** Demo bots go through quota → exhausted in ~7 min (persisted per VN day) → dead ticker, welcome xu fails. Fix: bot exemption / reserve.
- **M4** `list_candidates` `order by created_at ... limit 3000` includes placed forever and drops newest. Fix: bound placed to recent N days, order newest-first.

## Minor
1. `has_pii` false-positive on "ASP.NET" (pii.ts:4, SQL 115).
2. XFF leftmost entry spoofable; love_ip bucket UTC vs VN day.
3. `pos:*` broadcasts: forgeable u/n/ro/co, unbounded peers map, no validation of av/co.
4. placed→sitting gets no seat until 60 s recompute (world.ts:100).
5. Demo identity claim race (identity.ts:56-83); seed-on-read outside lock.
6. Demo presence heartbeat throttled in hidden tabs; `p.r` not coerced.
7. OG stamp "Bản demo" on real Supabase candidates (ogCards.tsx:33).
8. Gift toast always says "xu" for love gifts (notify.ts:30-41).
9. ImageResponse stream errors escape try/catch; ogFonts caches failed load forever.

## Nits
- Boolean casts in `upsert_my_candidate` outside exception block → NETWORK.
- `get_candidate_contact` ok with null on missing row (demo: NOT_FOUND).
- `world.setAll` can overwrite events received during load.

## Questions
- REQUIREMENTS: notify candidate when HR views contact — deferred?
- Accepted invitations never expire for `send_offer` — intended?
