import type { CandidateCard, StreetEvent } from '../types';
import type { DemoBackend } from './DemoBackend';
import { BOT_HRS } from './seed';
import { newBotWalker, stepBotWalker, type BotWalker } from '@/lib/botWalk';
import { zonesAtZ } from '@/lib/layout';
import type { AvatarSpec, Role } from '../types';

const FIRST_GIFT_DELAY_MS = 20_000;

const WALKERS: { id: string; name: string; role: Role; company: string | null; avatar: AvatarSpec }[] = [
  { id: 'bot-walk-1', name: 'Bác Xe Ôm', role: 'viewer', company: null, avatar: { skin: 2, shirt: 3, pants: 1, hat: 'none', bowl: 'bowl' } },
  { id: 'bot-walk-2', name: 'Cô Bán Trà Đá', role: 'viewer', company: null, avatar: { skin: 1, shirt: 6, pants: 2, hat: 'none', bowl: 'bowl' } },
  { id: 'bot-walk-3', name: 'Anh Headhunter đi dạo', role: 'hr', company: 'Công ty Mẫu B', avatar: { skin: 0, shirt: 7, pants: 0, hat: 'none', bowl: 'bowl' } },
  { id: 'bot-walk-4', name: 'Em Shipper', role: 'viewer', company: null, avatar: { skin: 3, shirt: 1, pants: 3, hat: 'none', bowl: 'bowl' } },
];
const WALK_TICK_MS = 200;

/**
 * Demo bots (BR: cold start). Only the tab that holds the Web Lock `pxv:demo:leader` runs them.
 *  - ~20 s after a real candidate sits down, a bot HR drops one xu so the "leng keng" flow works solo.
 *  - every 8-20 s a bot drops a xu on a random sample candidate so the ticker is alive.
 * Bots never send 500k / offers (sample + bot candidates are not invitable by design).
 *  - a few walking bots wander around the plaza and the first zones (poses over the presence bus, leader only).
 */
export function startBots(backend: DemoBackend, opts: { acquireLeader: () => Promise<boolean>; rand?: () => number }): () => void {
  const rand = opts.rand ?? Math.random;
  let stopped = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const welcomed = new Set<string>();
  let off: (() => void) | null = null;
  let walkTimer: ReturnType<typeof setInterval> | null = null;

  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!stopped) fn();
    }, ms);
    timers.add(t);
  };

  // BOT_HRS[0] is reserved for the welcome gift so the ticker chatter can never starve it of quota
  const WELCOME_BOT = BOT_HRS[0];
  const tickerBots = BOT_HRS.slice(1);
  const exhausted = new Set<string>();

  const randomGift = async () => {
    const list: CandidateCard[] = await backend.listCandidates();
    const samples = list.filter((c) => c.isSample && c.status === 'sitting');
    const bots = tickerBots.filter((b) => !exhausted.has(b.id));
    if (!bots.length) return; // every ticker bot hit its daily limit: stop quietly until the next page load
    if (samples.length) {
      const c = samples[Math.floor(rand() * samples.length)];
      const bot = bots[Math.floor(rand() * bots.length)];
      const r = await backend.botGift(bot.id, c.id, 'xu');
      if (!r.ok && (r.error === 'LIMIT_DAILY' || r.error === 'RATE_LIMITED')) exhausted.add(bot.id);
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
      later(FIRST_GIFT_DELAY_MS, () => void backend.botGift(WELCOME_BOT.id, c.id, 'xu'));
    });
    later(8000 + rand() * 12000, () => void randomGift());
    const walkers: BotWalker[] = WALKERS.map((w) => newBotWalker(w.id, rand));
    const walk = setInterval(() => {
      walkers.forEach((b, i) => {
        const moving = stepBotWalker(b, WALK_TICK_MS / 1000, rand);
        const w = WALKERS[i];
        backend.botPose(zonesAtZ(b.z).current, {
          u: b.id,
          x: Math.round(b.x * 100) / 100,
          z: Math.round(b.z * 100) / 100,
          r: Math.round(b.ry * 100) / 100,
          m: moving ? 1 : 0,
          n: w.name,
          ro: w.role,
          co: w.company,
          av: w.avatar,
        });
      });
    }, WALK_TICK_MS);
    walkTimer = walk;
  });

  return () => {
    stopped = true;
    off?.();
    if (walkTimer) clearInterval(walkTimer);
    for (const t of timers) clearTimeout(t);
    timers.clear();
  };
}
