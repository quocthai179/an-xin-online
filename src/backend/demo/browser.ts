import { BroadcastBus, type Bus, MemoryBus } from './bus';
import { MemoryLocks, WebLocks, WebStorageStore, type Locks } from './db';
import { DemoBackend } from './DemoBackend';
import { claimIdentity, MemoryIdentityLocks, WebIdentityLocks } from './identity';
import { startBots } from './bots';

declare global {
  interface Window {
    __pxv?: { uid: string };
  }
}

/** Wires DemoBackend to the real browser primitives. */
export async function createDemoBackend(): Promise<DemoBackend> {
  const hasLocks = typeof navigator !== 'undefined' && 'locks' in navigator;
  const local = new WebStorageStore(window.localStorage);
  const session = new WebStorageStore(window.sessionStorage);
  const as = new URLSearchParams(window.location.search).get('as');
  const newId = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `u-${Math.random().toString(36).slice(2)}`);
  const identity = await claimIdentity(
    { local, session, locks: hasLocks ? new WebIdentityLocks() : new MemoryIdentityLocks(), newId },
    as,
  );
  const bus: Bus = typeof BroadcastChannel !== 'undefined' ? new BroadcastBus() : new MemoryBus();
  const locks: Locks = hasLocks ? new WebLocks() : new MemoryLocks();
  const backend = new DemoBackend({ store: local, bus, locks, now: () => Date.now(), identity });
  window.__pxv = { uid: identity };

  if (process.env.NEXT_PUBLIC_DEMO_BOTS !== '0') {
    startBots(backend, {
      acquireLeader: () =>
        hasLocks
          ? new Promise<boolean>((resolve) => {
              void navigator.locks.request('pxv:demo:leader', { ifAvailable: true }, (lock) => {
                if (!lock) {
                  resolve(false);
                  return undefined;
                }
                resolve(true);
                return new Promise<void>(() => undefined);
              });
            })
          : Promise.resolve(true),
    });
  }
  return backend;
}
