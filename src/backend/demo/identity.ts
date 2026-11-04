import type { KeyValueStore } from './db';

export const USERS_KEY = 'pxv:demo:users';
export const SESSION_UID_KEY = 'pxv:uid';
/** set by "Đổi người (demo)": the next claim in this tab must create a brand-new user instead of re-adopting a stored one */
export const SESSION_FRESH_KEY = 'pxv:fresh';

export interface IdentityLocks {
  /** Try to take a lock held for the lifetime of the tab. Resolves false if someone else holds it. */
  tryHold(name: string): Promise<boolean>;
  /** Run `fn` while holding a short-lived exclusive lock (serialises identity claims across tabs). Optional: tests may omit it. */
  exclusive?<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export class WebIdentityLocks implements IdentityLocks {
  exclusive<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return navigator.locks.request(name, fn) as Promise<T>;
  }

  tryHold(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      void navigator.locks.request(name, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return undefined;
        }
        resolve(true);
        return new Promise<void>(() => undefined); // never resolves: held until the tab closes
      });
    });
  }
}

export class MemoryIdentityLocks implements IdentityLocks {
  private held = new Set<string>();
  private chain: Promise<unknown> = Promise.resolve();
  exclusive<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }
  async tryHold(name: string) {
    if (this.held.has(name)) return false;
    this.held.add(name);
    return true;
  }
}

function readUsers(local: KeyValueStore): string[] {
  try {
    const v = JSON.parse(local.get(USERS_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export interface IdentityDeps {
  local: KeyValueStore;
  session: KeyValueStore;
  locks: IdentityLocks;
  newId: () => string;
}

/**
 * Each tab is a different demo user. Reload keeps the user (sessionStorage); reopening the browser restores the
 * first stored user whose lock is free (AC-1.4); otherwise a new user is created.
 * `as` forces a deterministic id `demo-<as>` (tests).
 */
export async function claimIdentity(deps: IdentityDeps, as?: string | null): Promise<string> {
  // two tabs opened together must not read the same stored-user list (lost update / same user claimed twice): serialise the claim
  const { locks } = deps;
  return locks.exclusive ? locks.exclusive('pxv:identity-claim', () => claimLocked(deps, as)) : claimLocked(deps, as);
}

async function claimLocked(deps: IdentityDeps, as?: string | null): Promise<string> {
  const { local, session, locks } = deps;
  const users = readUsers(local);
  const remember = (id: string) => {
    if (!users.includes(id)) {
      users.push(id);
      local.set(USERS_KEY, JSON.stringify(users));
    }
    session.set(SESSION_UID_KEY, id);
    return id;
  };

  if (as) {
    const id = `demo-${as.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'user'}`;
    await locks.tryHold(`pxv:id:${id}`);
    return remember(id);
  }

  if (session.get(SESSION_FRESH_KEY) === '1') {
    session.remove(SESSION_FRESH_KEY);
    const id = deps.newId();
    await locks.tryHold(`pxv:id:${id}`);
    return remember(id);
  }

  const sessionId = session.get(SESSION_UID_KEY);
  if (sessionId && (await locks.tryHold(`pxv:id:${sessionId}`))) return remember(sessionId);

  for (const id of users) {
    if (await locks.tryHold(`pxv:id:${id}`)) return remember(id);
  }
  const id = deps.newId();
  await locks.tryHold(`pxv:id:${id}`);
  return remember(id);
}

/** "Đổi người (demo)": next load of this tab becomes another user. */
export function forgetSessionIdentity(session: KeyValueStore): void {
  session.remove(SESSION_UID_KEY);
  session.set(SESSION_FRESH_KEY, '1');
}
