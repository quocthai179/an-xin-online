import type { KeyValueStore } from './db';

export const USERS_KEY = 'pxv:demo:users';
export const SESSION_UID_KEY = 'pxv:uid';

export interface IdentityLocks {
  /** Try to take a lock held for the lifetime of the tab. Resolves false if someone else holds it. */
  tryHold(name: string): Promise<boolean>;
}

export class WebIdentityLocks implements IdentityLocks {
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
}
