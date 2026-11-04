import { CanvasTexture, SRGBColorSpace } from 'three';

/** Small LRU of CanvasTextures; textures are disposed on eviction so GPU memory stays bounded. */
export class TextureCache {
  private map = new Map<string, CanvasTexture>();
  constructor(private max: number) {}

  get(key: string, make: () => HTMLCanvasElement): CanvasTexture {
    const hit = this.map.get(key);
    if (hit) {
      this.map.delete(key);
      this.map.set(key, hit);
      return hit;
    }
    const tex = new CanvasTexture(make());
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    this.map.set(key, tex);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value as string;
      this.map.get(oldest)?.dispose();
      this.map.delete(oldest);
    }
    return tex;
  }

  clear(): void {
    for (const t of this.map.values()) t.dispose();
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
