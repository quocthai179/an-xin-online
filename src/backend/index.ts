import type { Backend } from './types';
import { getBackendMode } from './mode';

let instance: Promise<Backend> | null = null;

/** Client-only singleton. Async because the demo identity is claimed through Web Locks. */
export function createBackend(): Promise<Backend> {
  if (instance) return instance;
  instance = (async () => {
    if (getBackendMode() === 'supabase') {
      // SupabaseBackend lands in a later phase; keep the app usable in demo mode until then.
      console.warn('Supabase env detected but SupabaseBackend is not implemented yet; using demo mode.');
    }
    const { createDemoBackend } = await import('./demo/browser');
    return createDemoBackend();
  })();
  return instance;
}
