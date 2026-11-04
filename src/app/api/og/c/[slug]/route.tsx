import type { NextRequest } from 'next/server';
import { getPublicCandidate } from '@/server/publicData';
import { candidateCard, fallbackCard } from '@/server/ogCards';

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const c = await getPublicCandidate(slug, req.nextUrl.searchParams.get('d'), Date.now());
    return c ? await candidateCard(c) : await fallbackCard();
  } catch (e) {
    console.error('[og] candidate card failed', e);
    return fallbackCard();
  }
}
