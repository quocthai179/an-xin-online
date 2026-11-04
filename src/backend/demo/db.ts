import type { AvatarSpec, Contact, NotificationType, Role, SignState, WorkMode } from '../types';
import type { ZoneId } from '@/lib/rules';
import type { DailyBucket } from '@/lib/ranking';

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface Locks {
  request<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
}

export class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  get(k: string) {
    return this.m.get(k) ?? null;
  }
  set(k: string, v: string) {
    this.m.set(k, v);
  }
  remove(k: string) {
    this.m.delete(k);
  }
}

export class WebStorageStore implements KeyValueStore {
  constructor(private s: Storage) {}
  get(k: string) {
    try {
      return this.s.getItem(k);
    } catch {
      return null;
    }
  }
  set(k: string, v: string) {
    try {
      this.s.setItem(k, v);
    } catch {
      /* quota or private mode: demo keeps working for this session */
    }
  }
  remove(k: string) {
    try {
      this.s.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

/** In-process FIFO mutex per name. Used in tests and as fallback where Web Locks are unavailable. */
export class MemoryLocks implements Locks {
  private tails = new Map<string, Promise<unknown>>();
  request<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const prev = this.tails.get(name) ?? Promise.resolve();
    const run = prev.then(() => fn());
    this.tails.set(name, run.catch(() => undefined));
    return run;
  }
}

export class WebLocks implements Locks {
  request<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    return navigator.locks.request(name, async () => (await fn()) as T) as Promise<T>;
  }
}

export interface UserRow {
  id: string;
  displayName: string;
  role: Role;
  company: string | null;
  avatar: AvatarSpec;
  createdAt: number;
  nameChangedAt: number | null;
  isBot?: boolean;
  /** when the profile (last) became HR (0002 TOO_NEW gate); absent in older demo DBs -> createdAt */
  hrSince?: number | null;
}

export interface CandRow {
  id: string;
  userId: string | null;
  slug: string;
  isSample: boolean;
  displayName: string;
  zone: ZoneId;
  signText: string;
  title: string;
  yearsExp: number;
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  city: string | null;
  workModes: WorkMode[];
  bio: string | null;
  avatar: AvatarSpec;
  status: 'sitting' | 'hidden' | 'placed';
  signState: SignState;
  hideFromTicker: boolean;
  showSalaryOnCard: boolean;
  sittingSince: number;
  zoneChangedAt: number | null;
  placedAt: number | null;
  placedCompany: string | null;
  xuTotal: number;
  loveTotal: number;
  inviteTotal: number;
  incenseTotal: number;
  reportCount: number;
  createdAt: number;
  updatedAt: number;
  /** admin hide = moderation lock (0002); absent in older demo DBs */
  modHiddenAt?: number | null;
}

export interface GiftRow {
  id: number;
  giverId: string;
  candidateId: string;
  kind: 'xu' | 'love';
  day: string;
  at: number;
}

export interface InvRow {
  id: string;
  hrId: string;
  candidateId: string;
  hrName: string;
  hrCompany: string;
  message: string;
  hrContact: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'closed';
  responseReason: string | null;
  day: string;
  createdAt: number;
  respondedAt: number | null;
  expiresAt: number;
}

export interface OfferRow {
  id: string;
  hrId: string;
  candidateId: string;
  invitationId: string;
  hrName: string;
  hrCompany: string;
  position: string;
  package: string;
  message: string | null;
  hrShowCompany: boolean;
  candidateShowCompany: boolean | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'closed';
  responseReason: string | null;
  createdAt: number;
  respondedAt: number | null;
  expiresAt: number;
}

export interface NotifRow {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  createdAt: number;
  readAt: number | null;
}

export interface DemoDb {
  v: 1;
  seq: number;
  users: Record<string, UserRow>;
  candidates: Record<string, CandRow>;
  contacts: Record<string, Contact>;
  gifts: GiftRow[];
  daily: Record<string, DailyBucket[]>;
  invitations: Record<string, InvRow>;
  offers: Record<string, OfferRow>;
  incense: { userId: string; day: string; target: string | null }[];
  notifications: NotifRow[];
  reports: { reporterId: string; candidateId: string; reason: string; note: string | null; at: number; counted?: boolean }[];
  rate: Record<string, { bucket: number; n: number }>;
  /** 0002 (optional so older persisted DBs stay valid): private.bans / private.candidate_tombstones */
  bans?: Record<string, { reason: string | null; at: number }>;
  tombstones?: Record<string, { signLocked: boolean; hideLocked: boolean; at: number }>;
}

export const DB_KEY = 'pxv:demo:db';
export const DB_LOCK = 'pxv:demo:db';

export function emptyDb(): DemoDb {
  return {
    v: 1,
    seq: 0,
    users: {},
    candidates: {},
    contacts: {},
    gifts: [],
    daily: {},
    invitations: {},
    offers: {},
    incense: [],
    notifications: [],
    reports: [],
    rate: {},
    bans: {},
    tombstones: {},
  };
}

export function loadRaw(store: KeyValueStore): DemoDb | null {
  const raw = store.get(DB_KEY);
  if (!raw) return null;
  try {
    const db = JSON.parse(raw) as DemoDb;
    return db && db.v === 1 ? db : null;
  } catch {
    return null;
  }
}

export function saveDb(store: KeyValueStore, db: DemoDb): void {
  // keep the persisted size bounded
  if (db.gifts.length > 5000) db.gifts = db.gifts.slice(-5000);
  if (db.notifications.length > 2000) db.notifications = db.notifications.slice(-2000);
  store.set(DB_KEY, JSON.stringify(db));
}
