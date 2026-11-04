import type { BufferGeometry } from 'three';
import { mulberry32 } from '@/lib/hash';
import { PLAZA, PLAZA_LENGTH, SEAT_X, SIDEWALK_TOP, ZONE_GATE_DEPTH, ZONE_LENGTH, seatTransform, zoneStartZ } from '@/lib/layout';
import { LIMITS, ZONE_IDS } from '@/lib/rules';
import { ZONES } from '@/lib/zones';
import { GeometryBuilder } from './builder';

export interface Bulb {
  x: number;
  y: number;
  z: number;
}

export const ROAD_HALF = 3;
export const SHOP_X = 7.6;
export const GATE_LABEL = { y: 5.6, w: 12, h: 1.6 };
const STOOL_COLORS = ['#d64545', '#3b82c4', '#3aa66b', '#e0a82e'];
const SHOP_COLORS = ['#f2d4a6', '#e8b98a', '#d9c2a0', '#f0e0c0', '#c9b79a', '#e6c9a8', '#d8a48f'];
const AWNING = ['#d64545', '#2b8ac0', '#e0a82e', '#3aa66b'];

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export interface ZoneChunk {
  geometry: BufferGeometry;
  bulbs: Bulb[];
}

/** Everything static for one zone: road, sidewalks, shopfronts, lamps, trees, stools, gate arch, landmarks. Vertex coloured. */
export function buildZoneChunk(zoneIdx: number): ZoneChunk {
  const id = ZONE_IDS[zoneIdx];
  const meta = ZONES[id];
  const rnd = mulberry32(0x9e3779b1 ^ (zoneIdx * 7919));
  const z0 = zoneStartZ(zoneIdx);
  const zMid = z0 - ZONE_LENGTH / 2;
  const b = new GeometryBuilder();
  const bulbs: Bulb[] = [];

  // road + sidewalks + curbs
  b.box(0, -0.05, zMid, ROAD_HALF * 2, 0.1, ZONE_LENGTH, '#4a4d55');
  for (const s of [-1, 1]) {
    b.box(s * (ROAD_HALF + 2.25), SIDEWALK_TOP / 2 - 0.05, zMid, 4.5, SIDEWALK_TOP + 0.1, ZONE_LENGTH, '#cdbba0');
    b.box(s * (ROAD_HALF + 0.05), SIDEWALK_TOP / 2 - 0.05, zMid, 0.1, SIDEWALK_TOP + 0.1, ZONE_LENGTH, '#a89880');
  }
  for (let dz = 1; dz < ZONE_LENGTH; dz += 4) b.box(0, 0.01, z0 - dz - 1, 0.15, 0.02, 1.6, '#f3efe0');

  // shopfronts on both sides
  for (const s of [-1, 1]) {
    let dz = 0;
    while (dz < ZONE_LENGTH - 0.5) {
      const w = Math.min(ZONE_LENGTH - dz, 3.6 + rnd() * 2.4);
      const depth = 4 + rnd() * 2;
      const h = 4.6 + rnd() * 4.2;
      const cz = z0 - dz - w / 2;
      const tint = shade(SHOP_COLORS[Math.floor(rnd() * SHOP_COLORS.length)], 0.92 + rnd() * 0.12);
      b.box(s * (SHOP_X + depth / 2), h / 2, cz, depth, h, w - 0.1, tint);
      // roof lip in zone colour
      b.box(s * (SHOP_X + depth / 2), h + 0.12, cz, depth + 0.1, 0.24, w, meta.color);
      // shutter / window / door on the street face
      const face = s * (SHOP_X - 0.04);
      b.box(face, 1.4, cz - w * 0.18, 0.1, 2.4, w * 0.42, '#2d3748');
      b.box(face, 1.1, cz + w * 0.3, 0.1, 2.2, 0.9, shade('#8b6b3e', 0.8 + rnd() * 0.4));
      if (h > 6) b.box(face, h - 1.5, cz, 0.1, 1.1, w * 0.6, '#3a4a5c');
      // shop board in zone colour + awning over the sidewalk
      b.box(face, 3.2, cz, 0.16, 0.7, w * 0.9, meta.color);
      b.box(s * (SHOP_X - 0.55), 2.75, cz, 1.2, 0.08, w * 0.9, AWNING[Math.floor(rnd() * AWNING.length)], 0, s * 0.35);
      dz += w;
    }
  }

  // lamps (poles behind the seat row), bulbs collected for an emissive instanced mesh
  for (let dz = 5; dz < ZONE_LENGTH; dz += 9) {
    for (const s of [-1, 1]) {
      const x = s * 7.0;
      const z = z0 - dz;
      b.cyl(x, 0, z, 0.06, 0.09, 4.3, '#3a3f4a', 6);
      b.box(x - s * 0.8, 4.3, z, 1.7, 0.07, 0.07, '#3a3f4a');
      bulbs.push({ x: x - s * 1.55, y: 4.2, z });
    }
  }

  // trees behind the seats
  for (let dz = 9; dz < ZONE_LENGTH; dz += 14) {
    for (const s of [-1, 1]) {
      const x = s * 7.15;
      const z = z0 - dz - (s > 0 ? 3 : 0) - 1;
      b.cyl(x, 0, z, 0.1, 0.16, 2.6, '#7a5230', 6);
      b.blob(x - s * 0.5, 3.3, z, 1.3, shade('#3f9a4a', 0.85 + rnd() * 0.3));
      b.blob(x - s * 0.9, 2.7, z + 0.7, 0.9, shade('#4aa856', 0.9 + rnd() * 0.2));
    }
  }

  // plastic stools for all 30 seats (empty seats show an empty stool)
  for (let seat = 1; seat <= LIMITS.seatsPerZone; seat++) {
    const t = seatTransform(zoneIdx, seat);
    b.cyl(t.x, SIDEWALK_TOP, t.z, 0.2, 0.24, 0.3, STOOL_COLORS[seat % STOOL_COLORS.length], 8);
  }

  // gate arch with a zone-coloured beam; label planes are separate textured meshes
  for (const s of [-1, 1]) b.box(s * 7.2, 2.8, z0, 0.6, 5.6, 0.6, '#5b3a26');
  b.box(0, 5.6, z0, 14.8, 1.9, 0.5, meta.color);
  b.box(0, 6.7, z0, 15.2, 0.25, 0.7, '#3a2a1a');

  // landmarks
  if (id === 'fresher') {
    // overpass: deck, rails and pillars
    b.box(0, 7.4, zMid, 22, 0.8, ZONE_LENGTH - 6, '#8a8f98');
    for (const s of [-1, 1]) b.box(s * 10.8, 8.2, zMid, 0.2, 0.8, ZONE_LENGTH - 6, '#5b6068');
    for (const pz of [-6, -18, -30]) for (const s of [-1, 1]) b.box(s * 9, 3.5, z0 + pz, 0.9, 7, 0.9, '#7b8088');
  }
  if (id === 'devops') {
    for (let i = 0; i < 4; i++) b.box(-10.5, 1.2 + (i % 2) * 2.5, z0 - 8 - i * 6, 2.4, 2.4, 5, ['#d64545', '#2b8ac0', '#e0a82e', '#3aa66b'][i], 0);
  }
  if (id === 'qa') b.blob(0, 0.9, z0 - 18, 0.6, '#3aa66b', 1); // the Bug
  if (id === 'design') for (let i = 0; i < 4; i++) b.box(-7.7 + i * 0.4, 1.4, z0 - 10, 0.3, 2.8, 0.3, ['#e04848', '#e0a82e', '#3b82c4', '#8b5fd0'][i]);
  if (zoneIdx === ZONE_IDS.length - 1) b.box(0, 0.6, z0 - ZONE_LENGTH + 0.5, 6, 1.2, 0.5, '#d64545'); // end barrier

  return { geometry: b.build(), bulbs };
}

/** Plaza ground, entrance arch, temple, wall of fame frame, trees and benches. */
export function buildPlaza(): ZoneChunk {
  const b = new GeometryBuilder();
  const bulbs: Bulb[] = [];
  const cz = PLAZA_LENGTH / 2;
  b.box(0, -0.05, cz, 30, 0.1, PLAZA_LENGTH, '#d9c9a8');
  for (let i = 0; i < 8; i++) b.box(0, 0.0, 1 + i * 3, 29, 0.02, 0.1, '#c2b08c'); // paving lines
  b.box(0, 0.0, cz, 6, 0.03, PLAZA_LENGTH, '#cdbb98');

  // perimeter walls and trees
  b.box(-15, 0.6, cz, 0.5, 1.2, PLAZA_LENGTH, '#a38b68');
  b.box(15, 0.6, cz, 0.5, 1.2, PLAZA_LENGTH, '#a38b68');
  b.box(0, 0.6, PLAZA_LENGTH, 30.5, 1.2, 0.5, '#a38b68');
  for (const [x, z] of [[-12, 4], [12, 4], [-12, 20], [12, 20], [-3, 22], [3, 22], [-13, 12], [13, 10]] as const) {
    b.cyl(x, 0, z, 0.12, 0.2, 2.8, '#7a5230', 6);
    b.blob(x, 3.8, z, 1.7, '#3f9a4a');
    b.blob(x + 0.8, 3.2, z - 0.5, 1.2, '#4aa856');
  }
  for (const [x, z, r] of [[-9, 6, 0], [9, 6, 0], [0, 19, Math.PI / 2]] as const) {
    b.at(x, z, r).box(0, 0.45, 0, 2, 0.12, 0.6, '#8b6b3e').box(-0.8, 0.22, 0, 0.12, 0.44, 0.5, '#5b3a26').box(0.8, 0.22, 0, 0.12, 0.44, 0.5, '#5b3a26');
  }
  b.at();

  // entrance arch "Phố Xin Việc" (label plane added in the scene) with the Top 10 hanging board posts
  for (const s of [-1, 1]) b.box(s * 8.2, 4.5, 0, 0.8, 9, 0.8, '#5b3a26');
  b.box(0, 9.6, 0, 17.6, 1.2, 0.8, '#c0562b');
  b.box(0, 10.4, 0, 18, 0.3, 1, '#3a2a1a');
  for (const s of [-1, 1]) b.box(s * 8.2, 0.2, 0, 1.4, 0.4, 1.4, '#8a8f98');
  // lamps by the plaza
  for (const [x, z] of [[-4.2, 3], [4.2, 3], [-4.2, 18], [4.2, 18]] as const) {
    b.cyl(x, 0, z, 0.07, 0.1, 4.6, '#3a3f4a', 6);
    b.box(x, 4.65, z, 0.5, 0.08, 0.5, '#3a3f4a');
    bulbs.push({ x, y: 4.45, z });
  }

  temple(b, PLAZA.temple.x, PLAZA.temple.z);
  // wall of fame: two posts + frame; the board text plane is added in the scene
  b.at(PLAZA.wall.x, PLAZA.wall.z, -Math.PI / 2);
  for (const s of [-1, 1]) b.box(s * 2.4, 1.6, 0, 0.3, 3.2, 0.3, '#5b3a26');
  b.box(0, 1.9, -0.1, 5.2, 3, 0.2, '#3a2a1a');
  b.box(0, 3.6, -0.1, 5.6, 0.4, 0.4, '#d99a1f');
  b.at();
  return { geometry: b.build(), bulbs };
}

function temple(b: GeometryBuilder, x: number, z: number): void {
  b.at(x, z, Math.PI / 2); // front faces +X (toward the plaza)
  const red = '#b3261e';
  const gold = '#d99a1f';
  b.box(0, 0.15, 0, 6.4, 0.3, 6.4, '#9a9a96');
  b.box(0, 0.4, 3.0, 3, 0.25, 1.2, '#b0afa8');
  b.box(0, 1.9, 0, 4.6, 3.2, 4.4, '#f0e2c0');
  b.box(0, 1.6, 2.22, 1.5, 2.4, 0.12, '#5b2a14'); // door
  for (const px of [-2.1, 2.1]) for (const pz of [-2, 2]) b.cyl(px, 0.3, pz, 0.2, 0.22, 3.4, red, 8);
  b.box(0, 3.5, 0, 5.4, 0.35, 5.2, red);
  b.cone(0, 3.65, 0, 4.4, 1.5, '#7a2a1a', 4, Math.PI / 4);
  b.box(0, 5.0, 0, 3.4, 0.3, 3.4, red);
  b.cone(0, 5.15, 0, 2.7, 1.4, '#7a2a1a', 4, Math.PI / 4);
  b.cone(0, 6.5, 0, 0.18, 0.9, gold, 6);
  // incense burner in front
  b.cyl(0, 0.3, 4.6, 0.38, 0.28, 0.7, '#6b4a22', 8);
  b.cyl(0, 1.0, 4.6, 0.42, 0.38, 0.08, gold, 8);
  for (const sx of [-0.15, 0, 0.15]) b.cyl(sx, 1.08, 4.6, 0.015, 0.015, 0.45, '#c0392b', 4);
  // lanterns
  for (const sx of [-1.8, 1.8]) b.blob(sx, 3.0, 2.6, 0.28, '#e04848', 1);
  b.at();
}

/** World position of the smoke source above the incense burner. */
export function incenseSmokeOrigin(): { x: number; y: number; z: number } {
  // local (0, 1.1, 4.6) rotated by +PI/2 about Y => x += 4.6, z += 0
  return { x: PLAZA.temple.x + 4.6, y: 1.5, z: PLAZA.temple.z };
}

export const GATE_DEPTH = ZONE_GATE_DEPTH;
export const SEAT_OFFSET_X = SEAT_X;
