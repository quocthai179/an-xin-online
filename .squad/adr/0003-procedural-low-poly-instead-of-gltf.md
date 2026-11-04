# ADR-0003: Procedural low-poly geometry, instancing and canvas-texture signs (no GLTF, no drei Text)
Status: Accepted
Date: 2026-11-04

## Context
The street holds up to 300 seated candidates (10 zones × 30 seats) plus up to 50 walkers, must hit ≥ 30 FPS on mid-range
phones and load in < 5 s on 4G (NFR). There is no artist or asset pipeline, and a single developer agent builds it in one go.
Signs are user-written Vietnamese text with diacritics and must render correctly in 3D and be XSS-safe.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| A. GLTF models (characters, buildings) + drei `useGLTF` | Nicer visuals | Needs sourcing/licensing/compression (Draco/meshopt), skinning costs on mobile, larger download, asset pipeline |
| B. **Procedural primitives merged per part, InstancedMesh per zone chunk, vertex colours + instanceColor, Lambert materials** | Zero assets, tiny download, few draw calls, per-zone frustum culling, full control over style | Simpler look (fits the humorous low-poly tone); hand-written geometry code |
| C. drei `<Text>` (troika SDF) for signs | Crisp text, easy API | Fetches fonts at runtime (default from CDN), one mesh + worker per text; glyph coverage for Vietnamese depends on the font; heavy for hundreds of signs |
| D. **Canvas 2D → CanvasTexture for signs, only for the nearest K candidates, LRU cache** | Uses the page's loaded web font (Patrick Hand, Vietnamese subset); handwriting look; `fillText` is inert (XSS-safe); bounded texture memory | Texture resolution limits crispness at close range; needs redraw once fonts load |

## Decision
B + D. Avatars/buildings/props are built from three primitives in `src/scene-lib/geometry/*`, merged with
`BufferGeometryUtils.mergeGeometries`, rendered as one InstancedMesh per part per zone (body, head, sign board) plus global
hat/bowl meshes. Static street is one merged mesh with vertex colours. Signs are canvas textures (512×256 desktop,
256×128 mobile) for the nearest 12 (mobile 6) candidates within 16 m; others show a blank cardboard. Picking is done
mathematically against seat cylinders instead of raycasting instanced meshes. Budget: ≤ 80 draw calls worst case (~35 visible),
≤ 150k triangles, DPR capped (1.5 desktop / 1.25 mobile) with drei `PerformanceMonitor`.

## Consequences
- No asset downloads besides two font files for OG images; first load is fast and the visual style is consistent.
- Geometry code is part of the codebase (testable sizes/positions via `src/lib/layout.ts`).
- Far signs are unreadable by design; the 2D list view and CV panel (DOM) remain the accessible way to read content.
- If richer visuals are wanted later, GLTF can replace individual part geometries without changing the instancing/seat architecture.
