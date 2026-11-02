import { newId } from './id';
import type { Stamp } from '../types';

export const DEFAULT_INK = '#1a2a6c';

// Text stamps are drawn large so they stay sharp when printed or enlarged.
const FONT_SIZE = 64;
const PADDING = 8;

/** Today's date as dd/mm/yyyy (Australian format), whatever the browser's locale. */
export function formatToday(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

export function renderDateStamp(text = formatToday(), color = DEFAULT_INK): Stamp {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = `${FONT_SIZE}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + PADDING * 2;
  canvas.height = Math.round(FONT_SIZE * 1.3);
  // Resizing the canvas resets its state.
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, PADDING, canvas.height / 2);
  return {
    id: newId(),
    kind: 'date',
    dataUrl: canvas.toDataURL('image/png'),
    aspect: canvas.height / canvas.width,
  };
}
