import { deltaToPercent } from "./layout";

export type PercentPoint = { x: number; y: number };

export type PercentDragStart = {
  clientX: number;
  clientY: number;
  posX: number;
  posY: number;
};

/** Root used for viewport-% conversion (CommUI shell or document). */
export function layoutDragRoot(): HTMLElement {
  return (
    (document.getElementById("comm-ui") as HTMLElement | null) ||
    document.documentElement
  );
}

/** Pointer delta → clamped 0–100% position from a drag start snapshot. */
export function percentFromPointerDrag(
  clientX: number,
  clientY: number,
  start: PercentDragStart,
  root: HTMLElement = layoutDragRoot(),
): PercentPoint {
  const rect = root.getBoundingClientRect();
  const { dxPct, dyPct } = deltaToPercent(
    clientX - start.clientX,
    clientY - start.clientY,
    rect.width,
    rect.height,
  );
  return {
    x: Math.max(0, Math.min(100, start.posX + dxPct)),
    y: Math.max(0, Math.min(100, start.posY + dyPct)),
  };
}

export function trySetPointerCapture(
  target: EventTarget | null,
  pointerId: number,
): void {
  const el = target as HTMLElement | null;
  if (!el || typeof el.setPointerCapture !== "function") return;
  try {
    el.setPointerCapture(pointerId);
  } catch {
    /* ignore */
  }
}

export function tryReleasePointerCapture(
  target: EventTarget | null,
  pointerId: number,
): void {
  const el = target as HTMLElement | null;
  if (!el || typeof el.releasePointerCapture !== "function") return;
  try {
    el.releasePointerCapture(pointerId);
  } catch {
    /* ignore */
  }
}
