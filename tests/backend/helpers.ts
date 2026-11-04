import { MemoryBus } from '@/backend/demo/bus';
import { MemoryLocks, MemoryStore } from '@/backend/demo/db';
import { DemoBackend } from '@/backend/demo/DemoBackend';
import type { AvatarSpec, CandidateInput, Role, StreetEvent, AppNotification } from '@/backend/types';
import { DAY_MS } from '@/lib/rules';

export const AVATAR: AvatarSpec = { skin: 1, shirt: 2, pants: 1, hat: 'none', bowl: 'bowl' };

export class World {
  now = Date.parse('2026-11-04T05:00:00Z');
  store = new MemoryStore();
  locks = new MemoryLocks();
  bus = new MemoryBus();
  seq = 0;
  tabs: DemoBackend[] = [];

  tab(uid: string): DemoBackend {
    const b = new DemoBackend({
      store: this.store,
      locks: this.locks,
      bus: this.tabs.length === 0 ? this.bus : this.bus.peer(),
      now: () => this.now,
      identity: uid,
      newId: () => `id-${++this.seq}`,
      presenceTimers: false,
    });
    this.tabs.push(b);
    return b;
  }

  async user(uid: string, role: Role, name = `Bạn ${uid}`, company = 'ACME'): Promise<DemoBackend> {
    const b = this.tab(uid);
    const r = await b.register({ displayName: name, role, company: role === 'hr' ? company : undefined, avatar: AVATAR });
    if (!r.ok) throw new Error(`register failed ${r.error}`);
    return b;
  }

  advance(ms: number) {
    this.now += ms;
  }
  days(n: number) {
    this.now += n * DAY_MS;
  }
}

export function candInput(over: Partial<CandidateInput> = {}): CandidateInput {
  return {
    signText: 'Java 5 năm, nhà còn mẹ già, xin job remote',
    title: 'Backend Developer',
    yearsExp: 5,
    skills: ['Java', 'Spring', 'SQL'],
    salaryMin: 20,
    salaryMax: 30,
    salaryNegotiable: false,
    city: 'Hà Nội',
    workModes: ['remote'],
    bio: 'Debug bằng println',
    zone: 'backend',
    hideFromTicker: false,
    showSalaryOnCard: false,
    contact: { kind: 'email', value: 'me@example.com' },
    ...over,
  };
}

export async function sit(w: World, uid: string, over: Partial<CandidateInput> = {}) {
  const b = await w.user(uid, 'candidate');
  const r = await b.saveMyCandidate(candInput(over));
  if (!r.ok) throw new Error(`save failed ${r.error} ${r.field}`);
  return { b, id: r.data.id, slug: r.data.slug };
}

export function collect(b: DemoBackend) {
  const street: StreetEvent[] = [];
  const notifs: AppNotification[] = [];
  b.onStreetEvent((e) => street.push(e));
  b.onNotification((n) => notifs.push(n));
  return { street, notifs };
}
