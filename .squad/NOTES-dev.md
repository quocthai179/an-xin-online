# Developer notes (phases P0-P4)

Status: all phases P0-P9 are done (P8 SupabaseBackend and P9 hardening: see "P8-P9 notes" at the end).
Still open: things that need a real Supabase project or a real device (see "P8-P9 notes, remaining gaps").

## Deviations from DESIGN.md (all pragmatic)

1. **Versions**: Next 16.4.5, React 19.3.1, R3F 9.8.2, drei 10.7.9, three 0.187.0, zustand 5.0.16, supabase-js 2.118.0, Vitest 5.1.0.
   Pinned **TypeScript 5.9.3** and **ESLint 9.39.5** (not the newest 7.x / 10.x) because Next's lint/type plugins target them.
   `@playwright/test` 1.63.0 is pinned (same as the preinstalled Chromium build 1243); the old `e2e/demo-flow.cjs` was converted to `e2e/demo-flow.spec.ts`.
2. **Fonts**: no `next/font/google` (the build must never need the network). CSS uses a system font stack with `Be Vietnam Pro` as an
   optional first choice, and the sign font stack `Patrick Hand, Segoe Print, ... cursive`. When P7 vendors the TTFs, add them with
   `next/font/local` and the canvas will pick them up (`SignCanvas` redraws after `document.fonts.ready`).
3. **`createBackend()` is async** (returns `Promise<Backend>`) because the demo identity is claimed through Web Locks. With Supabase env
   vars set it returns the SupabaseBackend (P8).
4. **SQL**: `private.clean()` regex range changed from `\u0000-\u0009` to `\u0001-\u0008` (and the TS twin strips `\u0000-\u0008`).
   Reason: PostgreSQL text cannot contain NUL, and stripping tab (`\u0009`) before the "collapse spaces/tabs" step would glue words
   together ("a<TAB>b" -> "ab"). Everything else in `0001_init.sql` is the DESIGN section 4 text verbatim (extracted by script).
   **The SQL has never been executed** (no Postgres here). Parity tests only cover constants, blocklist and function hygiene.
5. **Allowlist** is an empty data file (`src/config/allowlist.vi.ts`); the mechanism is unit-tested with an injected config. The SQL
   `private.allowlist` table is created but not populated (as in the design).
6. **Bots**: only "welcome xu ~20 s after you sit" and "random xu on sample candidates every 8-20 s" (leader-elected via
   `pxv:demo:leader`). Walking bots belong to the 3D phase. Disable with `NEXT_PUBLIC_DEMO_BOTS=0`.
7. **Name change rule** mirrors SQL: the first rename is free (`name_changed_at` is null on insert); later renames need 24 h.
8. **Share link** in the candidate panel copies `/?c=<slug>` (deep link opens the panel). `/c/<slug>` landing + OG are P7.
9. **Presence** is wired (`DemoPresence` over the bus, online counter in the HUD) but joins zone `plaza` only; poses are not published until the 3D scene exists.
10. ESLint `react/no-danger` is enforced through `no-restricted-syntax` on `dangerouslySetInnerHTML` (the `react` plugin is not addressable from our own flat-config block).

## Mount points

- `src/components/app/StreetApp.tsx` renders `<Scene>` (dynamic, `ssr:false`) when `view === '3d'`. All panels are DOM overlays driven by `useUi().panel`.
- `src/state/world.ts` holds candidates + `SeatPlan` (recomputed every 60 s in `useStreetSync`, patched by events).
  `seatTransform` / `zoneStartZ` are in `src/lib/layout.ts`.
- `src/scene-lib/signTexture.ts` (`drawSign`) is the shared sign renderer (already used by the form preview) for 3D textures.
- `DemoBackend.presence` already implements `PresenceApi` (hello heartbeat, pose throttle 5 Hz, reaction cooldown, 15 s expiry).
- `src/backend/index.ts` is the single place to add `SupabaseBackend`.

## Known gaps / things to watch

- Demo mode timestamps use the device clock (server time does not exist there).
- `list_candidates` equivalent recomputes decayed sums per candidate on each read; fine for ~100 rows, revisit if the demo DB grows.
- The 3D "gift effects" (coin arc) have a 2D CSS equivalent only (`.fly`).
- `Be Vietnam Pro` is not bundled; glyph coverage relies on system fonts.

## P5-P7 notes (3D, multiplayer, sharing)

### Deviations from DESIGN.md
1. **Instancing layout**: one InstancedMesh per body part *per zone chunk* (torso, legs, head, board, bowl, 3 hats = 8 meshes/zone) instead of
   "global hats + bowl". Torso, legs and head are separate meshes so `instanceColor` can tint shirt, pants and skin independently.
   Chunks are hidden when the walker is > 110 m away on top of three's frustum culling. Typical draw calls 36-55 (swiftshader, `?debug=1`).
2. **No idle "breathing" animation** for seated candidates and **no standing avatars on the Wall of Fame** (board text only; cut order).
3. **Controls**: camera yaw is orbited by dragging (mouse or touch) and eases back behind the walker while walking. Movement is camera-relative.
   Mobile uses the joystick (`ui/Joystick.tsx`) plus tap-to-move on the ground (tap on a seat opens the panel instead).
4. **Temple**: walking within 4.6 m of the temple opens `TemplePanel` once (re-arms after 7 m); clicking it works too. Smoke is 18 recycled puffs.
5. **Walking bots** live in `backend/demo/bots.ts` (leader tab only) and publish through `DemoBackend.botPose` on the zone topics, so every tab sees the
   same 4 walkers. They roam z in [-80, 22]. They count in the "người đang đi dạo" total. Disable with `NEXT_PUBLIC_DEMO_BOTS=0`.
6. **Day/evening**: by local hour (>= 17:30 or < 5:30 is evening) or `?t=night|day`. Lamps get an emissive bulb + additive glow instance in the evening, no point lights.
7. **Default view**: 3D when WebGL works and the device is not "weak" (<= 2 cores or <= 2 GB). `?view=2d|3d` overrides. `e2e/demo-flow.cjs` uses `?view=2d`.
8. **Fonts**: TTFs vendored in `src/assets/fonts/` (Patrick Hand, Be Vietnam Pro Bold, OFL texts included) for OG/satori. For the browser, latin+vietnamese
   woff2 subsets are in `public/fonts/` (`Patrick Hand` for signs, `PXV Display` = Be Vietnam Pro Bold for 3D labels). The regular UI font is still the system stack.
9. **Share link** in the candidate panel is now `/c/<slug>` (+ `?d=<payload>` for non-sample demo candidates) via `ShareSheet`; the landing CTA goes to `/?c=<slug>`.
10. **Zalo share URL** (`sp.zalo.me/plugins/share?dev=1&url=`) is the social-plugin popup; Zalo has no documented plain share URL, verify before launch.
11. ESLint: `react-hooks/immutability` is off for `src/components/scene/**` (pools of three.js objects are mutated in `useFrame` by design).

### Debug
`?debug=1` shows fps, draw calls, triangles, textures, geometries, peer count and player position (`#pxv-debug`).

### Remaining gaps
- Real-device FPS was never measured (only swiftshader: 5-15 fps, which says nothing). Budget numbers: ~45 draw calls, ~25-30k triangles.
- Coin/note/confetti effects and reactions were verified by code and e2e (no errors) but their flight was not visually captured (swiftshader frame rate).
- Pose receivers only listen to the current zone + nearest neighbour topic (zone sharding), so two users in far zones do not see each other.
- Remote walkers have no leg animation (bob + lean only). No collision between walkers and trees/lamps.
- OG: Supabase `get_candidate` is now read by `src/server/publicData.ts` (P8). Fortune OG shows the tier, name, verdict and advice.
- `/c/<slug>` for a user-created demo candidate only works with the `?d=` link; without it the page is a 404 (server cannot read localStorage).

## P8-P9 notes (SupabaseBackend, hardening)

### P8: what was built
- `src/backend/supabase/`: `browser.ts` (client: anonymous session persisted in localStorage, auto refresh), `SupabaseBackend.ts`, `mappers.ts`
  (snake_case jsonb -> domain types, `toResult` = RPC envelope -> `Result`), `presence.ts`.
- RPC names/params are exactly those of `0001_init.sql` (`p_*`); `upsert_my_candidate` takes one jsonb `p`. `get_temple_stats` returns bare jsonb
  (no `{ok}` envelope), `light_incense` wraps it. Invitations/offers/notifications lists are RLS-filtered table selects (`select *`, newest first, limit 100/50).
  Pending-but-past-due invitations/offers are shown as `expired` on read (SQL only expires lazily on writes).
- Errors: envelope code if known, otherwise `NETWORK`; PostgREST `42501` -> `UNAUTHENTICATED`; transport failure -> `NETWORK` plus status `offline`.
- Realtime: one private `street` channel (DB broadcasts + presence, key = uid) and private `inbox:<uid>`; `realtime.setAuth()` after sign-in and on
  `TOKEN_REFRESHED`. Zone channels `pos:<zone>` (current + neighbour) carry `pose`/`react` with the same compact payload as demo mode.
  Online count = number of presence keys on `street`. Poses are not published while the tab is hidden.
- New optional `Backend.onStatus()` (`online`/`offline`); `useBoot` mirrors it in `useSession().offline`, `StreetApp` shows an offline banner, `useStreetSync` refetches
  the street when the connection returns. Sign-in is retried every 10 s while offline; `restore()` gives up after 8 s so the onboarding is never blocked.
- `createBackend()` falls back to demo only if constructing the Supabase backend throws (e.g. a malformed URL); an unreachable server does not fall back (that would mix data).
- `src/server/publicData.ts` -> `getPublicCandidate()` (anon RPC `get_candidate`, 4 s timeout). Unknown/hidden/unreachable -> shipped samples only; `?d=` is ignored in Supabase mode.
  The landing page shows a "vừa được bao" line for placed candidates; a sign under review is never shown (placeholder text).
- `/api/admin/moderate` (`GET` pending list, `POST {candidateId, action}`), header `x-admin-key` compared via SHA-256 + `timingSafeEqual` (`src/server/admin.ts`),
  503 when `SUPABASE_SERVICE_ROLE_KEY`/`ADMIN_KEY`/URL are missing, 401 on a wrong key. No rate limit on failed attempts (add one at the edge if exposed publicly).
- `supabase/seed.sql` is generated from `src/lib/seed.ts` (see README); `pnpm test:db` applies it twice and checks anon sees all 40 samples. `supabase/config.toml` enables anonymous sign-ins locally.
- No SQL was changed: the public read RPCs (`list_candidates`, `get_candidate`, `get_temple_stats`) are already granted to `anon`, so there is no `0002` migration.

### P9: what was built
- Playwright: `playwright.config.ts` (port 3100, `pnpm build && pnpm start`, demo mode forced, SwiftShader args), specs in `e2e/`: `demo-flow`, `street-3d`, `share`, `a11y`,
  and `supabase-offline` (skipped unless built against an unreachable Supabase, instructions at the top of the file).
- a11y: `Modal` now has `aria-labelledby`, traps Tab/Shift+Tab even when the dialog container has focus, stops Esc propagation and makes the rest of `.app` `inert` while open.
  Mute/menu buttons have stable labels. `prefers-reduced-motion`: all CSS animations/transitions off; 3D walker bob, camera easing, coin/confetti, tap-marker pulse and incense smoke already/now respect it.
- Name tags: `src/lib/declutter.ts` + `Labels` in `People.tsx` project tags to screen space every frame and lift overlapping ones by whole tag heights (hide after 3 levels), nearest first.
- Perf: `PerformanceMonitor` `onDecline` and `onFallback` both drop DPR to 1 (`data-degraded` on `.scene-wrap`). Disposal was audited: every geometry, material, texture cache and sprite material created in `components/scene/**` is disposed on unmount.
- CSP `connect-src` lists only `'self'` plus the origin and websocket origin of `NEXT_PUBLIC_SUPABASE_URL` when it is set (nothing Supabase-related in demo mode); computed at build time.

### P8-P9 notes, remaining gaps
- The SupabaseBackend has only been tested against a mocked client and an unreachable URL, never against a live project: do the first-deploy checklist in `DB-VERIFICATION.md` section 6 (Realtime authorization, `realtime.send` delivery, anonymous sign-in IP header).
- Presence/pose channels were not load-tested. Two tabs of one browser share the same Supabase user (same session), so the 2-tab demo flow does not apply in Supabase mode: use two browsers/profiles.
- `inbox:<uid>` is subscribed as soon as the anonymous session exists, before the user has a profile; that is allowed by the policy (it only checks `auth.uid()`).
- Sample candidates exist in Supabase only after `seed.sql` runs; `/c/<sample-slug>` works either way (shipped seeds as fallback).
- Reduced-motion and focus trap are covered by e2e; screen-reader behaviour was not tried with a real reader. FPS on real devices is still unmeasured.
