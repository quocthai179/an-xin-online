import type { Backend } from './types';
import { getBackendMode } from './mode';

let instance: Promise<Backend> | null = null;

async function createDemo(): Promise<Backend> {
  const { createDemoBackend } = await import('./demo/browser');
  return createDemoBackend();
}

/** Client-only singleton. Async because the demo identity is claimed through Web Locks. */
export function createBackend(): Promise<Backend> {
  if (instance) return instance;
  instance = (async () => {
    if (getBackendMode() === 'supabase') {
      try {
        const { createSupabaseBackend } = await import('./supabase/browser');
        // NEXT_PUBLIC_* are inlined at build time, so these must be read as literal property accesses
        return createSupabaseBackend(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);
      } catch (e) {
        // e.g. a malformed URL: keep the site usable instead of showing a white screen
        console.error('Supabase backend could not start; using demo mode.', e);
      }
    }
    return createDemo();
  })();
  return instance;
}
