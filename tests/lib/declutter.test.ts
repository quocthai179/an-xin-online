import { describe, expect, it } from 'vitest';
import { declutterLabels, type LabelRect } from '@/lib/declutter';

const tag = (x: number, y: number): LabelRect => ({ x, y, w: 100, h: 24 });

describe('declutterLabels', () => {
  it('leaves separated tags alone', () => {
    expect(declutterLabels([tag(0, 0), tag(300, 0), tag(0, 100)], [24, 24, 24])).toEqual([0, 0, 0]);
  });

  it('stacks overlapping tags upward, nearest first', () => {
    expect(declutterLabels([tag(0, 0), tag(10, 4), tag(-5, 2)], [24, 24, 24])).toEqual([0, 1, 2]);
  });

  it('hides tags that would have to climb too far', () => {
    const many = Array.from({ length: 6 }, () => tag(0, 0));
    const levels = declutterLabels(many, many.map(() => 24));
    expect(levels.slice(0, 4)).toEqual([0, 1, 2, 3]);
    expect(levels.slice(4)).toEqual([-1, -1]);
  });

  it('touching-but-not-overlapping tags are fine', () => {
    expect(declutterLabels([tag(0, 0), tag(110, 0)], [24, 24])).toEqual([0, 0]);
  });
});
