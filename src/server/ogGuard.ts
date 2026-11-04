import { NextResponse } from 'next/server';

/**
 * Unknown query keys would each get their own CDN cache entry (cache busting = free CPU for an attacker).
 * When any appear, redirect to the same URL with only the known keys so every variant shares one cache entry.
 */
export function canonicalOgRedirect(url: URL, known: readonly string[]): NextResponse | null {
  const extra = [...url.searchParams.keys()].some((k) => !known.includes(k));
  if (!extra) return null;
  const clean = new URL(url);
  for (const k of [...clean.searchParams.keys()]) if (!known.includes(k)) clean.searchParams.delete(k);
  return NextResponse.redirect(clean, { status: 308, headers: { 'Cache-Control': 'public, s-maxage=86400' } });
}
