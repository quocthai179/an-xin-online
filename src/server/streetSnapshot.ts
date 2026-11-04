// M5: cached street snapshot for GET /api/street. Every browser used to call the heavy anon RPC `list_candidates` on load;
// now one server instance calls it at most every SNAPSHOT_SECONDS and the CDN absorbs the rest.
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

export const SNAPSHOT_SECONDS = 15;
const FETCH_TIMEOUT_MS = 6_000;

async function fetchRows(): Promise<unknown[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }) },
    });
    const { data, error } = await client.rpc('list_candidates');
    return error || !Array.isArray(data) ? null : data;
  } catch {
    return null;
  }
}

const cached = unstable_cache(fetchRows, ['street-snapshot-v1'], { revalidate: SNAPSHOT_SECONDS });

export async function getStreetSnapshot(): Promise<unknown[] | null> {
  try {
    return await cached();
  } catch {
    return fetchRows();
  }
}
