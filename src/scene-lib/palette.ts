import type { AvatarSpec } from '@/backend/types';

export const SKIN = ['#f4cfae', '#e3b08a', '#c68a62', '#8d5a3b', '#5b3a26'];
export const SHIRT = ['#f5f1e6', '#e04848', '#3b82c4', '#3aa66b', '#e0a82e', '#8b5fd0', '#ee6fa6', '#3a4252'];
export const PANTS = ['#2d3748', '#4a5568', '#7a5230', '#2c5282'];
export const HAT_COLOR = { non_la: '#e8d5a0', cap: '#2b6cb0', beanie: '#c53030' } as const;
export const BOWL_COLOR: Record<AvatarSpec['bowl'], string> = { bowl: '#f7f2e8', hat: '#8b6b3e', box: '#c99a62' };

export const pick = <T,>(list: readonly T[], i: number): T => list[((i % list.length) + list.length) % list.length];
