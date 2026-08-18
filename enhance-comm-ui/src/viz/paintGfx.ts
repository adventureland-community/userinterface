/**
 * Low-level PIXI Graphics strokes for world overlay paint.
 */

import type { GraphicsLike } from "./mapHost";

export function strokeCircle(
  gfx: GraphicsLike,
  x: number,
  y: number,
  radius: number,
  color: number,
  width: number,
  alpha: number,
  fillAlpha: number,
): void {
  if (!(radius > 0)) return;
  if (fillAlpha > 0) {
    gfx.beginFill(color, fillAlpha);
    gfx.drawCircle(x, y, radius);
    gfx.endFill();
  }
  gfx.lineStyle(width, color, alpha);
  gfx.drawCircle(x, y, radius);
  gfx.lineStyle(0, 0, 0);
}

export function strokeDashedCircle(
  gfx: GraphicsLike,
  x: number,
  y: number,
  radius: number,
  color: number,
  width: number,
  alpha: number,
  dash: number,
  gap: number,
): void {
  if (!(radius > 0)) return;
  const step = dash + gap;
  const circ = Math.PI * 2 * radius;
  const n = Math.max(8, Math.floor(circ / step));
  const angStep = (Math.PI * 2) / n;
  const dashAng = (dash / radius) * (dash > 0 ? 1 : 0);
  gfx.lineStyle(width, color, alpha);
  for (let i = 0; i < n; i++) {
    const a0 = i * angStep;
    const a1 = a0 + Math.min(dashAng || angStep * 0.45, angStep * 0.55);
    gfx.moveTo(x + Math.cos(a0) * radius, y + Math.sin(a0) * radius);
    gfx.lineTo(x + Math.cos(a1) * radius, y + Math.sin(a1) * radius);
  }
  gfx.lineStyle(0, 0, 0);
}

export function drawLine(
  gfx: GraphicsLike,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width: number,
  alpha: number,
): void {
  gfx.lineStyle(width, color, alpha);
  gfx.moveTo(x1, y1);
  gfx.lineTo(x2, y2);
  gfx.lineStyle(0, 0, 0);
}

export function strokeRect(
  gfx: GraphicsLike,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  width: number,
  alpha: number,
  fillAlpha: number,
): void {
  if (!(w > 0) || !(h > 0)) return;
  if (fillAlpha > 0 && typeof gfx.drawRect === "function") {
    gfx.beginFill(color, fillAlpha);
    gfx.drawRect(x, y, w, h);
    gfx.endFill();
  }
  gfx.lineStyle(width, color, alpha);
  if (typeof gfx.drawRect === "function") {
    gfx.drawRect(x, y, w, h);
  } else {
    gfx.moveTo(x, y);
    gfx.lineTo(x + w, y);
    gfx.lineTo(x + w, y + h);
    gfx.lineTo(x, y + h);
    gfx.lineTo(x, y);
  }
  gfx.lineStyle(0, 0, 0);
}
