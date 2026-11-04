import type { NextRequest } from 'next/server';
import { resolvePublicFortune } from '@/lib/shareData';
import { fallbackCard, fortuneCard } from '@/server/ogCards';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const q = req.nextUrl.searchParams;
    const f = resolvePublicFortune(id, q.get('n'), q.get('d'), Date.now());
    return f ? await fortuneCard(f.fortune, f.name, f.day) : await fallbackCard();
  } catch (e) {
    console.error('[og] fortune card failed', e);
    return fallbackCard();
  }
}
