// Screen-space declutter for 3D name tags: when two tags would overlap, the lower-priority one is lifted by whole tag
// heights until it fits, and hidden when it would have to climb more than `maxLevels`.

export interface LabelRect {
  /** screen centre, pixels (y grows downward) */
  x: number;
  y: number;
  /** size in pixels */
  w: number;
  h: number;
}

const overlaps = (a: LabelRect, b: LabelRect, gap: number): boolean =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap;

/**
 * `rects` must be sorted by priority (nearest first). Returns, per rect, how many tag heights it is lifted
 * (0 = untouched) or -1 when it has to be hidden. `step` is the lift per level in pixels for each rect (usually its height).
 */
export function declutterLabels(rects: LabelRect[], step: number[], maxLevels = 3, gap = 2): number[] {
  const placed: LabelRect[] = [];
  const levels: number[] = [];
  rects.forEach((r, i) => {
    let level = 0;
    for (; level <= maxLevels; level++) {
      const lifted = { ...r, y: r.y - level * step[i] };
      if (!placed.some((p) => overlaps(lifted, p, gap))) {
        placed.push(lifted);
        break;
      }
    }
    levels.push(level > maxLevels ? -1 : level);
  });
  return levels;
}
