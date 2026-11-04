// Server-side read of public candidate data for /c/[slug] and the OG image.
// Supabase mode: anonymous public RPC `get_candidate` (anon key only, no session). Demo mode, or when Supabase is
// unreachable / does not know the slug: sample candidates from src/lib/seed.ts and, in demo mode only, the `?d=` payload.
import { createClient } from '@supabase/supabase-js';
import { getBackendMode } from '@/backend/mode';
import { resolvePublicCandidate, SLUG_RE, type PublicCandidate } from '@/lib/shareData';
import type { ZoneId } from '@/lib/rules';

const FETCH_TIMEOUT_MS = 4_000;
const HIDDEN_SIGN = 'Tấm biển này đang được kiểm duyệt';

type Row = {
  slug?: unknown;
  display_name?: unknown;
  sign_text?: unknown;
  sign_state?: unknown;
  title?: unknown;
  zone?: unknown;
  xu_total?: unknown;
  is_sample?: unknown;
  status?: unknown;
};

/** Pure mapping of the `get_candidate` JSON to what the landing page and the OG card need. */
export function publicFromRow(slug: string, r: Row): PublicCandidate | null {
  if (typeof r.display_name !== 'string' || typeof r.zone !== 'string' || typeof r.title !== 'string') return null;
  const signOk = r.sign_state === 'ok' && typeof r.sign_text === 'string' && r.sign_text.length > 0;
  return {
    slug,
    name: r.display_name,
    sign: signOk ? (r.sign_text as string) : HIDDEN_SIGN,
    title: r.title,
    zone: r.zone as ZoneId,
    xu: typeof r.xu_total === 'number' ? r.xu_total : 0,
    sample: r.is_sample === true,
    demo: false,
    placed: r.status === 'placed',
  };
}

async function fromSupabase(slug: string): Promise<{ found: PublicCandidate | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { found: null };
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }) },
    });
    const { data, error } = await client.rpc('get_candidate', { p_key: slug });
    if (error) return { found: null };
    if (!data || typeof data !== 'object') return { found: null }; // hidden / deleted / unknown
    return { found: publicFromRow(slug, data as Row) };
  } catch {
    return { found: null };
  }
}

export async function getPublicCandidate(slug: string, d: string | null | undefined, nowMs: number): Promise<PublicCandidate | null> {
  if (!SLUG_RE.test(slug)) return null;
  if (getBackendMode() !== 'supabase') return resolvePublicCandidate(slug, d, nowMs);
  const { found } = await fromSupabase(slug);
  if (found) return found;
  // unknown/hidden/unreachable: only the shipped samples can still be shown; `d` is ignored in Supabase mode
  return resolvePublicCandidate(slug, null, nowMs);
}
