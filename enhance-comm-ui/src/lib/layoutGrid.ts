/** Viewport-% step for layout-edit guide lines and drag snap. */
export const LAYOUT_GRID_STEP = 5;

/** Stronger guide lines at quarter / half / edges. */
export const LAYOUT_GRID_MAJOR_PCTS = [0, 25, 50, 75, 100];

/** Hard-snap an axis percent onto the layout grid. */
export function snapToGridPercent(
  n: number,
  step: number = LAYOUT_GRID_STEP,
): number {
  if (!(step > 0) || !Number.isFinite(n)) return n;
  const snapped = Math.round(n / step) * step;
  return Math.max(0, Math.min(100, snapped));
}
