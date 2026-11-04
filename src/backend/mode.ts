import type { Mode } from './types';

/** One place that decides which backend is used (client factory and server data helpers). */
export function getBackendMode(): Mode {
  if (process.env.NEXT_PUBLIC_FORCE_DEMO === '1') return 'demo';
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return 'supabase';
  return 'demo';
}
