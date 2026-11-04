# ADR-0002: Supabase Realtime — broadcast-from-DB for events, zone-sharded client broadcast for movement
Status: Accepted
Date: 2026-11-04

## Context
Realtime needs: (1) a public ticker and world updates (gifts, invitations, offers, placements, incense, profile changes),
(2) private per-user notifications (persisted for offline users, AC-13.3), (3) walker positions for up to ~100 concurrent
users with ≤ 1 s latency (AC-7.1) and an online counter (AC-7.3). Events must not be spoofable (a fake "HR X thả 500k"
would hurt trust). Supabase offers Postgres Changes, Broadcast (client or DB-originated via `realtime.send`), and Presence;
private channels are authorized by RLS on `realtime.messages`. Message quotas are plan-dependent.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| A. `postgres_changes` on `gifts`/`notifications`/`candidates` | Zero extra code in RPCs | RLS checked per subscriber per change (scales poorly); full rows incl. private columns (messages, contacts) are sent; no control over payload shape; changes processed on a single thread |
| B. Client-side broadcast after a successful RPC | Simple | Spoofable (any client can broadcast anything); lost if the client disconnects after the RPC |
| C. **Broadcast from Database** (`realtime.send` inside RPCs) on private topics `street` and `inbox:<uid>`; clients can't write those topics | Unspoofable; payload curated (no messages/contacts on the ticker); atomic with the write; inbox also persisted in `notifications` | Each RPC must emit explicitly; depends on Supabase realtime schema |
| D. Positions via Presence state updates | Built-in join/leave | Presence is designed for low-frequency metadata; 5 Hz `track()` floods diffs |
| E. Positions via client Broadcast, one global channel | Simple | Fan-out O(n²): 100 walkers × 5 Hz to everyone exceeds quotas quickly |
| F. **Positions via client Broadcast sharded per zone** (`pos:<zone>`, subscribe current + nearest neighbour) | Fan-out bounded by local density; only nearby walkers matter visually | Channel switching logic; walkers in far zones invisible (desired anyway) |

## Decision
- Events: **C**. RPCs call `private.street(event, payload)` → `realtime.send(..., 'street', true)` and
  `private.notify(user, type, payload)` → insert into `notifications` + `realtime.send(..., 'inbox:<uid>', true)`.
- RLS on `realtime.messages`: authenticated users may read `street`, `pos:*`, and their own `inbox:<uid>`; may write only to
  `pos:*` (broadcast/presence) and presence on `street`.
- Online count: Presence on `street` with metadata re-tracked only on zone change.
- Movement: **F** with ≤ 5 Hz while moving (adaptive to 3/2 Hz when a zone channel is crowded), 0.5 Hz idle heartbeat,
  compact payloads, receiver-side clamping/interpolation, render cap 50 (mobile 25), expiry after 15 s.
- The demo backend reproduces the same topic names over `BroadcastChannel`.

## Consequences
- Ticker/notifications are trustworthy and carry only curated fields; offline users get notifications from the table.
- Movement is not server-validated (no game server) — accepted because positions are cosmetic; teleports are legitimate
  (zone menu), so receivers snap instead of rejecting.
- Missed street events during disconnects are not replayed; clients refetch `list_candidates`/`get_me` on resubscribe.
- Requires `supabase.realtime.setAuth()` after anonymous sign-in and `{ config: { private: true } }` on every channel.
- If concurrency grows beyond plan quotas, next steps are finer shards (`pos:<zone>:<n>`) or lowering rates via config.
