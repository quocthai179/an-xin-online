# Developer notes (phases P0-P4)

Status: P0 scaffold, P1 pure lib, P2 migration + parity, P3 Backend + DemoBackend, P4 2D-first UI, P5 3D street, P6 multiplayer + juice and P7 sharing/OG are done.
Not done (next developer): P8 SupabaseBackend, P9 hardening (see "P5-P7 notes" below for gaps).

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
- No Playwright test runner config yet (P9). `e2e/demo-flow.cjs` is a manual smoke script (2 tabs: xu -> 500k -> accept -> offer -> placed).
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
- OG: no Supabase `get_candidate`; seeds + `?d=` only. Fortune OG shows the tier, name, verdict and advice.
- `/c/<slug>` for a user-created demo candidate only works with the `?d=` link; without it the page is a 404 (server cannot read localStorage).
