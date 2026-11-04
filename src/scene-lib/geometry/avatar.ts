import { BufferGeometry, CylinderGeometry, LatheGeometry, Vector2 } from 'three';
import { GeometryBuilder } from './builder';
import { HAT_COLOR } from '../palette';

/** Seated pose: local origin on the ground under the stool, facing +Z (toward the street). */
export const STOOL_H = 0.3;
export const SIGN = { y: 0.62, z: 0.56, w: 1.1, h: 0.55 };

/** shirt-tinted part (white vertex colours so instanceColor shows through) */
export function seatedTorso(): BufferGeometry {
  const b = new GeometryBuilder();
  b.box(0, STOOL_H + 0.3, 0, 0.4, 0.52, 0.26, '#ffffff');
  b.box(-0.27, STOOL_H + 0.3, 0.12, 0.11, 0.1, 0.38, '#ffffff', 0, 0);
  b.box(0.27, STOOL_H + 0.3, 0.12, 0.11, 0.1, 0.38, '#ffffff', 0, 0);
  return b.build();
}

export function seatedLegs(): BufferGeometry {
  const b = new GeometryBuilder();
  for (const x of [-0.11, 0.11]) {
    b.box(x, STOOL_H + 0.06, 0.22, 0.15, 0.15, 0.46, '#ffffff');
    b.box(x, 0.16, 0.42, 0.14, 0.34, 0.14, '#ffffff');
  }
  return b.build();
}

export function headGeometry(): BufferGeometry {
  const b = new GeometryBuilder();
  b.blob(0, STOOL_H + 0.74, 0.02, 0.2, '#ffffff', 1);
  return b.build();
}

export type HatKind = keyof typeof HAT_COLOR;

export function hatGeometry(kind: HatKind): BufferGeometry {
  const b = new GeometryBuilder();
  const y = STOOL_H + 0.74;
  if (kind === 'non_la') b.cone(0, y + 0.1, 0.02, 0.36, 0.22, HAT_COLOR.non_la, 12);
  else if (kind === 'cap') {
    b.cyl(0, y + 0.1, 0.02, 0.2, 0.21, 0.12, HAT_COLOR.cap, 10);
    b.box(0, y + 0.12, 0.26, 0.26, 0.03, 0.2, HAT_COLOR.cap);
  } else {
    b.cyl(0, y + 0.1, 0.02, 0.17, 0.22, 0.16, HAT_COLOR.beanie, 10);
    b.blob(0, y + 0.3, 0.02, 0.06, '#ffffff');
  }
  return b.build();
}

/** Cardboard board held in front of the lap; the nearest candidates get a textured plane on top. */
export function boardGeometry(): BufferGeometry {
  const b = new GeometryBuilder();
  b.box(0, SIGN.y, SIGN.z, SIGN.w, SIGN.h, 0.04, '#c99a62', 0, -0.12);
  b.box(0, SIGN.y, SIGN.z - 0.02, SIGN.w + 0.06, SIGN.h + 0.06, 0.02, '#8a6232', 0, -0.12);
  return b.build();
}

/** Bowl on the ground, 1 m in front of the seat (white vertex colour; tinted per instance). */
export function bowlGeometry(): BufferGeometry {
  const pts = [new Vector2(0, 0), new Vector2(0.1, 0), new Vector2(0.17, 0.09), new Vector2(0.15, 0.09), new Vector2(0.08, 0.025), new Vector2(0, 0.03)];
  const g = new LatheGeometry(pts, 10);
  g.translate(0, 0, 1.0);
  g.deleteAttribute('uv');
  return g;
}

/** Standing walker, split in three tinted parts (torso: shirt, legs: pants, head: skin). */
export function walkerTorso(): BufferGeometry {
  const b = new GeometryBuilder();
  b.box(0, 1.1, 0, 0.44, 0.58, 0.26, '#ffffff');
  b.box(-0.3, 1.08, 0, 0.1, 0.5, 0.12, '#ffffff');
  b.box(0.3, 1.08, 0, 0.1, 0.5, 0.12, '#ffffff');
  return b.build();
}
export function walkerLegs(): BufferGeometry {
  const b = new GeometryBuilder();
  b.box(-0.11, 0.4, 0, 0.17, 0.8, 0.2, '#ffffff');
  b.box(0.11, 0.4, 0, 0.17, 0.8, 0.2, '#ffffff');
  return b.build();
}
export function walkerHead(): BufferGeometry {
  const b = new GeometryBuilder();
  b.blob(0, 1.62, 0, 0.21, '#ffffff', 1);
  return b.build();
}

export function discGeometry(r: number, h: number): BufferGeometry {
  const g = new CylinderGeometry(r, r, h, 10);
  g.deleteAttribute('uv');
  return g;
}
