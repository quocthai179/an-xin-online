# Developer notes (phases P0-P4)

Status: P0 scaffold, P1 pure lib, P2 migration + parity, P3 Backend + DemoBackend, P4 2D-first UI are done.
Not done (next developer): P5 3D scene, P6 multiplayer/juice (presence rendering, bots walkers), P7 sharing/OG, P8 SupabaseBackend, P9 hardening.

## Deviations from DESIGN.md (all pragmatic)

1. **Versions**: Next 16.4.5, React 19.3.1, R3F 9.8.2, drei 10.7.9, three 0.187.0, zustand 5.0.16, supabase-js 2.118.0, Vitest 5.1.0.
   Pinned **TypeScript 5.9.3** and **ESLint 9.39.5** (not the newest 7.x / 10.x) because Next's lint/type plugins target them.
   `@playwright/test` is not installed; `e2e/demo-flow.cjs` uses the preinstalled `playwright` package directly.
2. **Fonts**: no `next/font/google` (the build must never need the network). CSS uses a system font stack with `Be Vietnam Pro` as an
   optional first choice, and the sign font stack `Patrick Hand, Segoe Print, ... cursive`. When P7 vendors the TTFs, add them with
   `next/font/local` and the canvas will pick them up (`SignCanvas` redraws after `document.fonts.ready`).
3. **`createBackend()` is async** (returns `Promise<Backend>`) because the demo identity is claimed through Web Locks. With Supabase env
   vars set it currently logs a warning and falls back to demo (P8).
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

## Mount points for the next phases

- `src/components/app/StreetApp.tsx`: `SCENE_AVAILABLE = false`; render `<Scene>` (dynamic, `ssr:false`) when `view === '3d'` and flip the flag.
  The HUD already has the 2D/3D toggle behind that flag. All panels are DOM overlays driven by `useUi().panel`.
- `src/state/world.ts` holds candidates + `SeatPlan` (recomputed every 60 s in `useStreetSync`, patched by events).
  `seatTransform` / `zoneStartZ` are in `src/lib/layout.ts`.
- `src/scene-lib/signTexture.ts` (`drawSign`) is the shared sign renderer (already used by the form preview) for 3D textures.
- `DemoBackend.presence` already implements `PresenceApi` (hello heartbeat, pose throttle 5 Hz, reaction cooldown, 15 s expiry).
- `src/backend/index.ts` is the single place to add `SupabaseBackend`.

## Known gaps / things to watch

- Demo mode timestamps use the device clock (server time does not exist there).
- `list_candidates` equivalent recomputes decayed sums per candidate on each read; fine for ~100 rows, revisit if the demo DB grows.
- No Playwright test runner config yet (P9). `e2e/demo-flow.cjs` is a manual smoke script (2 tabs: xu -> 500k -> accept -> offer -> placed).
- The 3D "gift effects" (coin arc) have a 2D CSS equivalent only (`.fly`).
- `Be Vietnam Pro` is not bundled; glyph coverage relies on system fonts.
