import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeShareDay } from '@/lib/shareData';
import { getFortuneById } from '@/lib/fortune';
import { clientIp, limits, tooMany } from '@/server/rateLimit';
import { signShareName } from '@/server/shareSign';

// GET /api/share/sign?id=<fortune>&n=<name>&d=<YYYY-MM-DD> -> { s: <signature> | null }
// The signature lets /q/<id> and its OG image show the name; without SHARE_SECRET the name is simply dropped (anonymous card).
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  if (!limits.share(clientIp(req.headers))) return tooMany();
  const q = req.nextUrl.searchParams;
  const id = q.get('id') ?? '';
  const name = q.get('n') ?? '';
  const day = sanitizeShareDay(q.get('d'));
  const s = day && getFortuneById(id) ? signShareName(id, name, day) : null;
  return NextResponse.json({ s }, { headers: { 'Cache-Control': 'no-store' } });
}
