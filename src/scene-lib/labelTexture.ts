// Canvas drawing helpers for 3D labels. Everything uses fillText (inert, never HTML).
import { SIGN_FONT } from './signTexture';

const UI_FONT = '"PXV Display", "Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d') as CanvasRenderingContext2D];
}

function fit(ctx: CanvasRenderingContext2D, text: string, family: string, weight: string, maxW: number, start: number, min = 14): number {
  let size = start;
  for (; size > min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Zone gate label: name + head count, or an invitation when the zone is empty. */
export function drawGateLabel(name: string, color: string, count: number): HTMLCanvasElement {
  const [c, ctx] = canvas(1024, 160);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1024, 160);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 118, 1024, 42);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  fit(ctx, name, UI_FONT, '800', 940, 78);
  ctx.fillText(name, 512, 62, 960);
  ctx.fillStyle = '#fff3d6';
  const sub = count === 0 ? 'Chưa ai ngồi, bạn là người đầu tiên?' : `${count} người đang ngồi`;
  fit(ctx, sub, UI_FONT, '600', 900, 32);
  ctx.fillText(sub, 512, 140, 940);
  return c;
}

export function drawEntranceLabel(): HTMLCanvasElement {
  const [c, ctx] = canvas(1024, 128);
  ctx.fillStyle = '#c0562b';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff8e1';
  ctx.font = `800 70px ${UI_FONT}`;
  ctx.fillText('PHỐ XIN VIỆC 3D', 512, 56, 980);
  ctx.font = `600 28px ${UI_FONT}`;
  ctx.fillText('Ngồi vỉa hè, xin việc có tâm. Xu và 500k đều là xu ảo.', 512, 104, 980);
  return c;
}

export interface BoardRow {
  rank: number;
  name: string;
  detail: string;
}

/** Board with a title and up to 10 rows (Top 10 billboard and Wall of Fame). */
export function drawBoard(title: string, subtitle: string, rows: BoardRow[], empty: string, bg = '#2a1a0a', fg = '#ffe9b8'): HTMLCanvasElement {
  const [c, ctx] = canvas(1024, 640);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 640);
  ctx.strokeStyle = '#d99a1f';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 1004, 620);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd36b';
  ctx.font = `800 54px ${UI_FONT}`;
  ctx.fillText(title, 512, 56, 960);
  ctx.fillStyle = fg;
  ctx.font = `500 26px ${UI_FONT}`;
  ctx.fillText(subtitle, 512, 100, 960);
  ctx.textAlign = 'left';
  if (rows.length === 0) {
    ctx.textAlign = 'center';
    ctx.font = `600 34px ${UI_FONT}`;
    ctx.fillText(empty, 512, 330, 920);
  }
  rows.slice(0, 10).forEach((r, i) => {
    const y = 150 + i * 46;
    ctx.fillStyle = i < 3 ? '#ffd36b' : fg;
    ctx.font = `700 32px ${UI_FONT}`;
    ctx.fillText(`${r.rank}.`, 50, y);
    fit(ctx, r.name, UI_FONT, '700', 470, 32, 18);
    ctx.fillText(r.name, 110, y, 480);
    ctx.font = `500 24px ${UI_FONT}`;
    ctx.fillStyle = '#e8cf9a';
    ctx.fillText(r.detail, 610, y, 380);
  });
  return c;
}

/** Name tag above a walker. */
export function drawNameTag(text: string, accent: string): HTMLCanvasElement {
  const [c, ctx] = canvas(256, 64);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fit(ctx, text, UI_FONT, '700', 220, 30, 14);
  const w = Math.min(248, ctx.measureText(text).width + 28);
  ctx.fillStyle = 'rgba(30,20,10,0.78)';
  roundRect(ctx, 128 - w / 2, 8, w, 48, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${size}px ${UI_FONT}`;
  ctx.fillText(text, 128, 33, 224);
  return c;
}

/** Emoji sprite (reactions). */
export function drawEmoji(emoji: string): HTMLCanvasElement {
  const [c, ctx] = canvas(128, 128);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '88px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.fillText(emoji, 64, 70);
  return c;
}

export { SIGN_FONT };
