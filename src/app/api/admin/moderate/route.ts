import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { adminKeyMatches, parseModerateBody } from '@/server/admin';

// Moderation queue for the operator (BR-M6). Server only: the service role key never reaches the browser.
//   GET  /api/admin/moderate                      -> candidates whose sign is pending review
//   POST /api/admin/moderate {candidateId, action} -> approve_sign | remove_sign | hide | delete
// Both need the header `x-admin-key: <ADMIN_KEY>`.
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function authorize(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminKey = process.env.ADMIN_KEY;
  if (!url || !service || !adminKey) return { res: json({ error: 'NOT_CONFIGURED' }, 503) };
  if (!adminKeyMatches(req.headers.get('x-admin-key'), adminKey)) return { res: json({ error: 'UNAUTHORIZED' }, 401) };
  const client = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return { client };
}

export async function GET(req: NextRequest) {
  const a = authorize(req);
  if (!a.client) return a.res;
  const { data, error } = await a.client.rpc('admin_list_pending');
  if (error) return json({ error: 'UPSTREAM' }, 502);
  return json({ pending: data ?? [] });
}

export async function POST(req: NextRequest) {
  const a = authorize(req);
  if (!a.client) return a.res;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }
  const parsed = parseModerateBody(body);
  if (!parsed) return json({ error: 'BAD_REQUEST' }, 400);
  const { data, error } = await a.client.rpc('admin_moderate', { p_candidate_id: parsed.candidateId, p_action: parsed.action });
  if (error) return json({ error: 'UPSTREAM' }, 502);
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) return json({ error: res?.error ?? 'UPSTREAM' }, res?.error === 'NOT_FOUND' ? 404 : 400);
  return json({ ok: true });
}
