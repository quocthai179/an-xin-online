// "Chụp ảnh phố": render one frame on demand (no preserveDrawingBuffer, so no per-frame cost), stamp a watermark and download a PNG.

export const WATERMARK = 'phoxinviec';

type Grab = () => HTMLCanvasElement;
let grab: Grab | null = null;

/** The R3F scene registers a function that renders a frame and returns its canvas. */
export function registerScreenshot(fn: Grab | null): void {
  grab = fn;
}

export function canScreenshot(): boolean {
  return grab !== null;
}

/** Draws `src` into a new canvas with the watermark in the bottom-right corner. */
export function withWatermark(src: HTMLCanvasElement, text = WATERMARK): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(src, 0, 0);
  const size = Math.max(16, Math.round(out.width / 40));
  ctx.font = `700 ${size}px "PXV Display", "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const x = out.width - size;
  const y = out.height - size * 0.8;
  ctx.lineWidth = Math.max(3, size / 6);
  ctx.strokeStyle = 'rgba(42,26,10,0.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(text, x, y);
  return out;
}

/** Resolves false when the scene is not mounted or the browser refused to encode the image. */
export async function takeScreenshot(filename = 'pho-xin-viec.png'): Promise<boolean> {
  if (!grab) return false;
  try {
    const marked = withWatermark(grab());
    const blob = await new Promise<Blob | null>((resolve) => marked.toBlob(resolve, 'image/png'));
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch {
    return false;
  }
}
