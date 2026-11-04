import { NextResponse } from 'next/server';
import { getStreetSnapshot } from '@/server/streetSnapshot';

// GET /api/street -> the `list_candidates` rows (anon key, server side), cached for ~15 s. The browser falls back to the RPC on any failure.
export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await getStreetSnapshot();
  if (!rows) return NextResponse.json({ error: 'UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } });
}
