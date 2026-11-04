import { create } from 'zustand';
import type { CandidateCard, StreetEvent } from '@/backend/types';
import { rankingScore, type Ranked } from '@/lib/ranking';
import { appendNewcomer, assignSeats, emptySeatPlan, removeCandidate, type SeatPlan } from '@/lib/seats';
import { formatTickerLine } from '@/lib/events';

export interface TickerLine {
  id: number;
  text: string;
}

interface WorldState {
  candidates: Record<string, CandidateCard>;
  plan: SeatPlan;
  ticker: TickerLine[];
  online: number;
  incenseToday: number;
  loaded: boolean;
  /** call right before fetching the street: structural events arriving until `setAll` are replayed on top of the list */
  beginLoad: () => void;
  setAll: (list: CandidateCard[], now: number) => void;
  apply: (e: StreetEvent, now: number, replay?: boolean) => void;
  recompute: (now: number) => void;
  setOnline: (n: number) => void;
  setIncense: (n: number) => void;
}

export function toRanked(c: CandidateCard, now: number): Ranked {
  const sittingSince = Date.parse(c.sittingSince);
  const createdAt = Date.parse(c.createdAt);
  return {
    id: c.id,
    zone: c.zone,
    status: c.status,
    sittingSince,
    createdAt,
    score: rankingScore({ id: c.id, zone: c.zone, decayed: c.decayed, sittingSince, createdAt, completeness: c.completeness }, now),
  };
}

function planOf(cands: Record<string, CandidateCard>, now: number): SeatPlan {
  return assignSeats(Object.values(cands).map((c) => toRanked(c, now)), undefined, now);
}

let tickerId = 1;
/** structural events (idempotent) received while a street fetch is in flight */
let loadBuffer: StreetEvent[] | null = null;
const STRUCTURAL: ReadonlySet<StreetEvent['type']> = new Set(['candidate_upsert', 'candidate_remove', 'placed']);

export const useWorld = create<WorldState>((set, get) => ({
  candidates: {},
  plan: emptySeatPlan(),
  ticker: [],
  online: 1,
  incenseToday: 0,
  loaded: false,
  beginLoad: () => {
    loadBuffer = [];
  },
  setAll: (list, now) => {
    const candidates = Object.fromEntries(list.map((c) => [c.id, c]));
    set({ candidates, plan: planOf(candidates, now), loaded: true });
    const buffered = loadBuffer;
    loadBuffer = null;
    // events that arrived while the list was loading are newer than the snapshot: replay them
    if (buffered) for (const e of buffered) get().apply(e, now, true);
  },
  recompute: (now) => set((s) => ({ plan: planOf(s.candidates, now) })),
  setOnline: (online) => set({ online }),
  setIncense: (incenseToday) => set({ incenseToday }),
  apply: (e, now, replay = false) => {
    if (!replay && loadBuffer && STRUCTURAL.has(e.type)) loadBuffer.push(e);
    const s = get();
    const line = replay ? null : formatTickerLine(e);
    const ticker = line ? [...s.ticker, { id: tickerId++, text: line }].slice(-5) : s.ticker;
    const cands = { ...s.candidates };
    let plan = s.plan;
    switch (e.type) {
      case 'gift': {
        const c = cands[e.candidate.id];
        if (c) {
          const isXu = e.kind === 'xu';
          cands[c.id] = {
            ...c,
            totals: { ...c.totals, xu: c.totals.xu + (isXu ? 1 : 0), love: c.totals.love + (isXu ? 0 : 1) },
            decayed: { ...c.decayed, hr: c.decayed.hr + (isXu ? 1 : 0), love: c.decayed.love + (isXu ? 0 : 1) },
            xuWeek: c.xuWeek + (isXu ? 1 : 0),
            xuToday: c.xuToday + (isXu ? 1 : 0),
          };
        }
        break;
      }
      case 'invite': {
        const c = cands[e.candidate.id];
        if (c) {
          cands[c.id] = {
            ...c,
            totals: { ...c.totals, invites: c.totals.invites + 1 },
            decayed: { ...c.decayed, invites: c.decayed.invites + 1 },
          };
        }
        break;
      }
      case 'candidate_upsert': {
        const prev = cands[e.candidate.id];
        const next: CandidateCard = {
          ...e.candidate,
          decayed: prev?.decayed ?? { hr: 0, love: 0, invites: 0, accepted: 0 },
          xuWeek: prev?.xuWeek ?? 0,
          xuToday: prev?.xuToday ?? 0,
        };
        cands[next.id] = next;
        if (next.status === 'placed') plan = removeCandidate(plan, next.id);
        else if (!prev || prev.status === 'placed') plan = appendNewcomer(plan, toRanked(next, now)); // new or placed -> sitting again: seat now
        else if (prev.zone !== next.zone) plan = appendNewcomer(removeCandidate(plan, next.id), toRanked(next, now));
        break;
      }
      case 'placed': {
        cands[e.candidate.id] = e.candidate;
        plan = removeCandidate(plan, e.candidate.id);
        break;
      }
      case 'candidate_remove': {
        delete cands[e.id];
        plan = removeCandidate(plan, e.id);
        break;
      }
      default:
        break;
    }
    set({ candidates: cands, plan, ticker });
  },
}));
