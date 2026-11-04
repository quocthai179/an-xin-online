import type { NextRequest } from 'next/server';
import { resolvePublicFortune } from '@/lib/shareData';
import { fallbackCard, fortuneCard } from '@/server/ogCards';
import { clientIp, limits, tooMany } from '@/server/rateLimit';
import { canonicalOgRedirect } from '@/server/ogGuard';
import { verifiedShareName } from '@/server/shareSign';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!limits.og(clientIp(req.headers))) return tooMany();
  const redirect = canonicalOgRedirect(req.nextUrl, ['n', 'd', 's']);
  if (redirect) return redirect;
  try {
    const { id } = await ctx.params;
    const q = req.nextUrl.searchParams;
    const d = q.get('d');
    // L6: the name is only honoured with a valid HMAC; otherwise the anonymous name
    const f = resolvePublicFortune(id, verifiedShareName(id, q.get('n'), d, q.get('s')), d, Date.now());
    return f ? await fortuneCard(f.fortune, f.name, f.day) : await fallbackCard();
  } catch (e) {
    console.error('[og] fortune card failed', e);
    return fallbackCard();
  }
}
