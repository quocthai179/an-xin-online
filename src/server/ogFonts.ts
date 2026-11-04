import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: 'normal';
}

let cached: Promise<OgFont[]> | null = null;

async function read(file: string): Promise<ArrayBuffer | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), 'src', 'assets', 'fonts', file));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

/**
 * Fonts for satori: vendored TTFs (Patrick Hand for signs, Be Vietnam Pro Bold for text, both OFL).
 * Missing files are skipped: ImageResponse then falls back to its built-in font, so the OG route never crashes.
 */
export function loadOgFonts(): Promise<OgFont[]> {
  cached ??= (async () => {
    const [hand, bold] = await Promise.all([read('PatrickHand-Regular.ttf'), read('BeVietnamPro-Bold.ttf')]);
    const fonts: OgFont[] = [];
    if (hand) fonts.push({ name: 'Patrick Hand', data: hand, weight: 400, style: 'normal' });
    if (bold) fonts.push({ name: 'Be Vietnam Pro', data: bold, weight: 700, style: 'normal' });
    if (fonts.length < 2) {
      console.warn('[og] vendored fonts missing, Vietnamese diacritics may degrade');
      cached = null; // do not cache a failed load: retry on the next request
    }
    return fonts;
  })();
  return cached;
}
