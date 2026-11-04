import type { NextRequest } from 'next/server';
import { getPublicCandidate } from '@/server/publicData';
import { candidateCard, fallbackCard } from '@/server/ogCards';
import { clientIp, limits, tooMany } from '@/server/rateLimit';
import { canonicalOgRedirect } from '@/server/ogGuard';

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  if (!limits.og(clientIp(req.headers))) return tooMany();
  const redirect = canonicalOgRedirect(req.nextUrl, ['d']);
  if (redirect) return redirect;
  try {
    const { slug } = await ctx.params;
    const c = await getPublicCandidate(slug, req.nextUrl.searchParams.get('d'), Date.now());
    return c ? await candidateCard(c) : await fallbackCard();
  } catch (e) {
    console.error('[og] candidate card failed', e);
    return fallbackCard();
  }
}
