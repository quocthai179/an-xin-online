import type { CandidateCard, StreetEvent } from '../types';
import type { DemoBackend } from './DemoBackend';
import { BOT_HRS } from './seed';

const FIRST_GIFT_DELAY_MS = 20_000;

/**
 * Demo bots (BR: cold start). Only the tab that holds the Web Lock `pxv:demo:leader` runs them.
 *  - ~20 s after a real candidate sits down, a bot HR drops one xu so the "leng keng" flow works solo.
 *  - every 8-20 s a bot drops a xu on a random sample candidate so the ticker is alive.
 * Bots never send 500k / offers (sample + bot candidates are not invitable by design).
 * Walking bots are part of the 3D phase.
 */
export function startBots(backend: DemoBackend, opts: { acquireLeader: () => Promise<boolean>; rand?: () => number }): () => void {
  const rand = opts.rand ?? Math.random;
  let stopped = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const welcomed = new Set<string>();
  let off: (() => void) | null = null;

  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!stopped) fn();
    }, ms);
    timers.add(t);
  };

  const randomGift = async () => {
    const list: CandidateCard[] = await backend.listCandidates();
    const samples = list.filter((c) => c.isSample && c.status === 'sitting');
    if (samples.length) {
      const c = samples[Math.floor(rand() * samples.length)];
      const bot = BOT_HRS[Math.floor(rand() * BOT_HRS.length)];
      await backend.botGift(bot.id, c.id, 'xu');
    }
    later(8000 + rand() * 12000, () => void randomGift());
  };

  void opts.acquireLeader().then((leader) => {
    if (!leader || stopped) return;
    off = backend.onStreetEvent((e: StreetEvent) => {
      if (e.type !== 'candidate_upsert') return;
      const c = e.candidate;
      if (c.isSample || welcomed.has(c.id) || Date.now() - Date.parse(c.createdAt) > 60_000) return;
      welcomed.add(c.id);
      later(FIRST_GIFT_DELAY_MS, () => void backend.botGift(BOT_HRS[0].id, c.id, 'xu'));
    });
    later(8000 + rand() * 12000, () => void randomGift());
  });

  return () => {
    stopped = true;
    off?.();
    for (const t of timers) clearTimeout(t);
    timers.clear();
  };
}
