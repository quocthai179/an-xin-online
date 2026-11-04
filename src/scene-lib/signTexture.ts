// Draws a cardboard sign onto a 2D canvas. Text is drawn with fillText only (inert, never HTML).
// Shared by the live preview in the candidate form and (later) the 3D sign textures.

export interface SignOptions {
  width?: number;
  height?: number;
  fontFamily?: string;
  maxLines?: number;
}

export const SIGN_FONT = '"Patrick Hand", "Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive';

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) line = test;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export function drawSign(canvas: HTMLCanvasElement, text: string, opts: SignOptions = {}): void {
  const w = opts.width ?? 512;
  const h = opts.height ?? 256;
  const maxLines = opts.maxLines ?? 2;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const family = opts.fontFamily ?? SIGN_FONT;

  ctx.clearRect(0, 0, w, h);
  // cardboard with slightly torn corners
  ctx.fillStyle = '#c99a62';
  ctx.beginPath();
  ctx.moveTo(10, 6);
  ctx.lineTo(w - 14, 10);
  ctx.lineTo(w - 6, h - 12);
  ctx.lineTo(18, h - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,55,20,0.45)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let y = 30; y < h - 20; y += 14) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(w - 24, y + 2);
    ctx.stroke();
  }

  const content = text.trim() || 'Biển của bạn ở đây...';
  const padX = 34;
  const maxW = w - padX * 2;
  let size = Math.round(h * 0.28);
  let lines: string[] = [];
  for (; size >= 14; size -= 2) {
    ctx.font = `${size}px ${family}`;
    lines = wrapLines(ctx, content, maxW);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) break;
  }
  ctx.font = `${size}px ${family}`;
  if (lines.length > maxLines) lines = lines.slice(0, maxLines);
  ctx.fillStyle = text.trim() ? '#2a1a0a' : 'rgba(42,26,10,0.45)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = size * 1.18;
  const y0 = h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, w / 2, y0 + i * lh, maxW));
}
