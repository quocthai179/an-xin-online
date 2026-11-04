import {
  BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Collects primitives with a vertex colour each and merges them into one BufferGeometry.
 * `at()` sets a local frame so props (temple, wall) can be authored facing +Z and placed anywhere.
 */
export class GeometryBuilder {
  private parts: BufferGeometry[] = [];
  private fx = 0;
  private fz = 0;
  private fr = 0;
  private fy = 0;

  /** Local frame: position on the ground plane, rotation about Y and a vertical offset. */
  at(x = 0, z = 0, rotY = 0, y = 0): this {
    this.fx = x;
    this.fz = z;
    this.fr = rotY;
    this.fy = y;
    return this;
  }

  private add(src: BufferGeometry, lx: number, ly: number, lz: number, color: string, rotY = 0, rotX = 0): this {
    // three's primitives mix indexed and non-indexed geometry; merging needs one kind
    const g = src.index ? src.toNonIndexed() : src;
    if (g !== src) src.dispose();
    g.deleteAttribute('uv');
    if (rotX) g.rotateX(rotX);
    if (rotY) g.rotateY(rotY);
    g.rotateY(this.fr);
    const c = Math.cos(this.fr);
    const s = Math.sin(this.fr);
    g.translate(this.fx + lx * c + lz * s, this.fy + ly, this.fz - lx * s + lz * c);
    const col = new Color(color);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new Float32BufferAttribute(arr, 3));
    this.parts.push(g);
    return this;
  }

  box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, rotY = 0, rotX = 0): this {
    return this.add(new BoxGeometry(w, h, d), x, y, z, color, rotY, rotX);
  }

  /** Cylinder / truncated cone with its base at y. */
  cyl(x: number, y: number, z: number, rTop: number, rBottom: number, h: number, color: string, seg = 8): this {
    return this.add(new CylinderGeometry(rTop, rBottom, h, seg), x, y + h / 2, z, color);
  }

  /** Cone / pyramid with its base at y. */
  cone(x: number, y: number, z: number, r: number, h: number, color: string, seg = 8, rotY = 0): this {
    return this.add(new ConeGeometry(r, h, seg), x, y + h / 2, z, color, rotY);
  }

  blob(x: number, y: number, z: number, r: number, color: string, detail = 0): this {
    return this.add(new IcosahedronGeometry(r, detail), x, y, z, color);
  }

  get count(): number {
    return this.parts.length;
  }

  build(): BufferGeometry {
    if (this.parts.length === 0) return new BufferGeometry();
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (!merged) throw new Error('GeometryBuilder: merge failed');
    merged.computeBoundingSphere();
    return merged;
  }
}
