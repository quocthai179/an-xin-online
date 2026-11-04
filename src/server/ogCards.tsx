import { ImageResponse } from 'next/og';
import type { Fortune } from '@/lib/fortune';
import { TIER_LABELS } from '@/lib/fortune';
import { ogSignFontSize, ogStamp, type PublicCandidate } from '@/lib/shareData';
import { ZONES } from '@/lib/zones';
import { loadOgFonts } from './ogFonts';

const SIZE = { width: 1200, height: 630 };
const HEADERS = { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' };
/** the neutral fallback must not stick in a CDN for an hour */
const FALLBACK_HEADERS = { 'Cache-Control': 'public, max-age=30, s-maxage=60' };

/**
 * ImageResponse renders lazily while it streams, so a satori failure would escape the route's try/catch.
 * Render fully here and hand back a plain Response: any failure throws inside the caller's try block.
 */
async function render(el: React.ReactElement, fonts: Awaited<ReturnType<typeof loadOgFonts>>, headers: Record<string, string>): Promise<Response> {
  const img = new ImageResponse(el, { ...SIZE, fonts });
  const body = await img.arrayBuffer();
  return new Response(body, { status: 200, headers: { ...headers, 'Content-Type': 'image/png' } });
}

const UI = '"Be Vietnam Pro", sans-serif';
const HAND = '"Patrick Hand", "Be Vietnam Pro", sans-serif';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f6e7cc', padding: 40, fontFamily: UI }}>
      {children}
    </div>
  );
}

function Footer({ left = 'Phố Xin Việc 3D', right }: { left?: string; right: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, color: '#5e4a35', fontSize: 30 }}>
      <div style={{ display: 'flex', fontWeight: 700, color: '#c0562b' }}>{left}</div>
      <div style={{ display: 'flex' }}>{right}</div>
    </div>
  );
}

export async function candidateCard(c: PublicCandidate): Promise<Response> {
  const fonts = await loadOgFonts();
  const zone = ZONES[c.zone];
  const stamp = ogStamp(c);
  return render(
    (
      <Frame>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#2a1a0a' }}>
          <div style={{ display: 'flex', background: zone.color, color: '#fff', padding: '8px 22px', borderRadius: 999, fontSize: 30, fontWeight: 700 }}>{zone.name}</div>
          {stamp ? <div style={{ display: 'flex', fontSize: 28, color: '#5e4a35' }}>{stamp}</div> : null}
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 1020,
              height: 280,
              padding: 36,
              background: '#c99a62',
              border: '10px solid #8a6232',
              borderRadius: 10,
              transform: 'rotate(-2deg)',
              boxShadow: '8px 10px 0 rgba(42,26,10,0.25)',
              textAlign: 'center',
              fontFamily: HAND,
              fontSize: ogSignFontSize(c.sign),
              lineHeight: 1.1,
              color: '#2a1a0a',
            }}
          >
            {c.sign}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, color: '#2a1a0a' }}>
          <div style={{ display: 'flex', fontSize: 54, fontWeight: 700 }}>{c.name}</div>
          <div style={{ display: 'flex', fontSize: 30, color: '#5e4a35' }}>{c.title}</div>
        </div>
        <Footer left="Tôi đang ngồi ở Phố Xin Việc 3D" right={`${c.xu} xu trong nón`} />
      </Frame>
    ),
    fonts,
    HEADERS,
  );
}

export async function fortuneCard(f: Fortune, name: string, day: string): Promise<Response> {
  const fonts = await loadOgFonts();
  return render(
    (
      <Frame>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#5e4a35', fontSize: 30 }}>
          <div style={{ display: 'flex', background: '#b3261e', color: '#fff', padding: '8px 22px', borderRadius: 999, fontWeight: 700 }}>Quẻ {TIER_LABELS[f.tier]}</div>
          <div style={{ display: 'flex' }}>{name} · {day}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', color: '#2a1a0a' }}>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, color: '#b3261e' }}>{f.name}</div>
          <div style={{ display: 'flex', fontSize: 44, marginTop: 18, fontFamily: HAND, lineHeight: 1.2 }}>{f.verdict}</div>
          <div style={{ display: 'flex', fontSize: 34, marginTop: 22, color: '#5e4a35' }}>Lời khuyên: {f.advice}</div>
        </div>
        <Footer right="Chỉ để cười. Đừng nghỉ việc vì quẻ." />
      </Frame>
    ),
    fonts,
    HEADERS,
  );
}

/** Neutral card used when anything goes wrong: the OG route must never crash. */
export async function fallbackCard(): Promise<Response> {
  const fonts = await loadOgFonts().catch(() => []);
  const el = (
    <Frame>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontSize: 84, fontWeight: 700, color: '#c0562b' }}>Phố Xin Việc 3D</div>
      <Footer right="Ngồi vỉa hè, xin việc có tâm" />
    </Frame>
  );
  try {
    return await render(el, fonts, FALLBACK_HEADERS);
  } catch {
    return await render(el, [], FALLBACK_HEADERS); // built-in font as the last resort
  }
}
