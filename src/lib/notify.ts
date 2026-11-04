import type { AppNotification, InviteStatus } from '@/backend/types';

export interface EffectiveStatusInput {
  status: InviteStatus;
  expiresAt: string;
}

/** Lazy expiry: pending rows past expiresAt are shown as expired. */
export function effectiveStatus(item: EffectiveStatusInput, nowMs: number): InviteStatus {
  return item.status === 'pending' && Date.parse(item.expiresAt) < nowMs ? 'expired' : item.status;
}

export type NotifyAction =
  | { kind: 'single'; sound: boolean; prominent: boolean }
  | { kind: 'aggregate'; count: number; xu: number; love: number; sound: boolean };

export const AGG_WINDOW_MS = 10_000;
export const AGG_THRESHOLD = 5;
export const SOUND_GATE_MS = 1_000;

/** AC-13.5: >5 gifts within 10 s collapse into one "+N xu" toast; sound at most once per second. */
export class NotificationAggregator {
  private gifts: { t: number; love: boolean }[] = [];
  private aggCount = 0;
  private lastSound = -Infinity;

  push(n: Pick<AppNotification, 'type'> & { payload?: Record<string, unknown> }, nowMs: number): NotifyAction {
    const prominent = n.type === 'invite_received' || n.type === 'offer_received';
    if (n.type !== 'gift') {
      return { kind: 'single', sound: prominent ? true : this.gate(nowMs), prominent };
    }
    this.gifts = this.gifts.filter((g) => nowMs - g.t < AGG_WINDOW_MS);
    this.gifts.push({ t: nowMs, love: n.payload?.kind === 'love' });
    if (this.gifts.length <= AGG_THRESHOLD) {
      this.aggCount = 0;
      return { kind: 'single', sound: this.gate(nowMs), prominent: false };
    }
    this.aggCount = this.gifts.length;
    const love = this.gifts.filter((g) => g.love).length;
    return { kind: 'aggregate', count: this.aggCount, xu: this.aggCount - love, love, sound: this.gate(nowMs) };
  }

  private gate(nowMs: number): boolean {
    if (nowMs - this.lastSound >= SOUND_GATE_MS) {
      this.lastSound = nowMs;
      return true;
    }
    return false;
  }
}
