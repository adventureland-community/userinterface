/** Default cell size: this % of the *shorter* viewport side (square cells). */
export const LAYOUT_GRID_STEP = 5;

/** Preset steps offered in Layout edit chrome (%% of min(w,h)). */
export const LAYOUT_GRID_STEP_PRESETS = [1, 2.5, 5, 10, 25] as const;

export type LayoutGridStepPreset = (typeof LAYOUT_GRID_STEP_PRESETS)[number];

/** Stronger guide lines near quarter / half / edges of an axis. */
export const LAYOUT_GRID_MAJOR_PCTS = [0, 25, 50, 75, 100];

/**
 * Nested guide weight (e769f28): fine = snap step (1×, smallest),
 * medium = 2×, coarse = 4×, edge = 0/50/100 emphasis.
 * Snap always uses the fine 1× cell via `squareGridMetrics`.
 */
export type GridLineTier = "fine" | "medium" | "coarse" | "edge";

export type TieredGridLine = { pct: number; tier: GridLineTier };

const EPS = 1e-6;

const TIER_RANK: Record<GridLineTier, number> = {
  fine: 1,
  medium: 2,
  coarse: 3,
  edge: 4,
};

/** Clamp / coerce a persisted or UI step into a usable percent. */
export function normalizeGridStep(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 50) return LAYOUT_GRID_STEP;
  for (let i = 0; i < LAYOUT_GRID_STEP_PRESETS.length; i++) {
    if (Math.abs(LAYOUT_GRID_STEP_PRESETS[i] - n) < EPS) {
      return LAYOUT_GRID_STEP_PRESETS[i];
    }
  }
  // Custom values: half-percent resolution, capped.
  const rounded = Math.round(n * 2) / 2;
  return Math.max(0.5, Math.min(50, rounded));
}

/** Pixel cell size for a square grid: `step`% of the shorter side. */
export function squareGridCellPx(
  step: number,
  widthPx: number,
  heightPx: number,
): number {
  const s = normalizeGridStep(step);
  const minSide = Math.min(Math.max(1, widthPx), Math.max(1, heightPx));
  return Math.max(1, (minSide * s) / 100);
}

/** Snap a pixel length onto the nearest square-grid cell. */
export function snapPxToGridCell(px: number, cellPx: number): number {
  const cell = Math.max(1, cellPx);
  if (!Number.isFinite(px)) return cell;
  return Math.round(px / cell) * cell;
}

/** Snap a frame size onto the active square grid (viewport shorter-side cells). */
export function snapFrameSizeToGrid(
  w: number,
  h: number,
  step: number,
  widthPx: number,
  heightPx: number,
): { w: number; h: number } {
  const cell = squareGridCellPx(step, widthPx, heightPx);
  return {
    w: snapPxToGridCell(w, cell),
    h: snapPxToGridCell(h, cell),
  };
}

/** Line positions 0..100 inclusive at equal pixel spacing along one axis. */
export function squareGridAxisPercents(
  lengthPx: number,
  cellPx: number,
): number[] {
  const len = Math.max(1, lengthPx);
  const cell = Math.max(1, cellPx);
  const out: number[] = [];
  const count = Math.ceil(len / cell);
  for (let i = 0; i <= count; i++) {
    const px = Math.min(len, i * cell);
    const pct = Math.round((px / len) * 100000) / 1000;
    if (!out.length || Math.abs(out[out.length - 1] - pct) > EPS) {
      out.push(pct > 100 - EPS ? 100 : pct);
    }
  }
  if (!out.length || Math.abs(out[out.length - 1] - 100) > EPS) out.push(100);
  return out;
}

export type SquareGridMetrics = {
  cellPx: number;
  /** Vertical guide positions (% of width). */
  xPercents: number[];
  /** Horizontal guide positions (% of height). */
  yPercents: number[];
};

/** Square cells: equal px spacing on both axes (not equal viewport %). */
export function squareGridMetrics(
  step: number,
  widthPx: number,
  heightPx: number,
): SquareGridMetrics {
  const cellPx = squareGridCellPx(step, widthPx, heightPx);
  return {
    cellPx,
    xPercents: squareGridAxisPercents(widthPx, cellPx),
    yPercents: squareGridAxisPercents(heightPx, cellPx),
  };
}

function bumpTier(
  into: Map<number, GridLineTier>,
  percents: number[],
  tier: GridLineTier,
): void {
  for (let i = 0; i < percents.length; i++) {
    const pct = percents[i];
    const key = Math.round(pct * 1000) / 1000;
    const prev = into.get(key);
    if (!prev || TIER_RANK[tier] > TIER_RANK[prev]) into.set(key, tier);
  }
}

function mapToSortedLines(map: Map<number, GridLineTier>): TieredGridLine[] {
  const keys = Array.from(map.keys());
  keys.sort((a, b) => a - b);
  const out: TieredGridLine[] = [];
  for (let i = 0; i < keys.length; i++) {
    const pct = keys[i];
    out.push({ pct, tier: map.get(pct) || "fine" });
  }
  return out;
}

/**
 * Nested 1× / 2× / 4× / edge guides (e769f28). Fine 1× is the snap cell;
 * coarser lines are visual hierarchy only.
 */
export function squareGridTieredLines(
  step: number,
  widthPx: number,
  heightPx: number,
): { x: TieredGridLine[]; y: TieredGridLine[]; cellPx: number } {
  const cellPx = squareGridCellPx(step, widthPx, heightPx);
  const xMap = new Map<number, GridLineTier>();
  const yMap = new Map<number, GridLineTier>();

  bumpTier(xMap, squareGridAxisPercents(widthPx, cellPx), "fine");
  bumpTier(yMap, squareGridAxisPercents(heightPx, cellPx), "fine");
  bumpTier(xMap, squareGridAxisPercents(widthPx, cellPx * 2), "medium");
  bumpTier(yMap, squareGridAxisPercents(heightPx, cellPx * 2), "medium");
  bumpTier(xMap, squareGridAxisPercents(widthPx, cellPx * 4), "coarse");
  bumpTier(yMap, squareGridAxisPercents(heightPx, cellPx * 4), "coarse");
  // Classic align emphasis on center + screen edges.
  bumpTier(xMap, [0, 50, 100], "edge");
  bumpTier(yMap, [0, 50, 100], "edge");

  return {
    cellPx,
    x: mapToSortedLines(xMap),
    y: mapToSortedLines(yMap),
  };
}

/** Snap a panel anchor (x%, y%) onto the fine square grid (1× cell). */
export function snapPosToFineGrid(
  x: number,
  y: number,
  step: number,
  widthPx: number,
  heightPx: number,
): { x: number; y: number } {
  const metrics = squareGridMetrics(step, widthPx, heightPx);
  return {
    x: snapToAxisPercents(x, metrics.xPercents, false),
    y: snapToAxisPercents(y, metrics.yPercents, false),
  };
}

/** Major when within ~0.6% of a classic quarter/half/edge mark. */
export function isLayoutGridMajor(pct: number): boolean {
  for (let i = 0; i < LAYOUT_GRID_MAJOR_PCTS.length; i++) {
    if (Math.abs(LAYOUT_GRID_MAJOR_PCTS[i] - pct) < 0.6) return true;
  }
  return false;
}

/**
 * Snap onto the nearest square-grid line for one axis.
 * When `maxDistPct` is set, only snap if within that distance (half a cell is typical).
 * When `skipScreenEdges` is set, never choose 0/100 — used only if a separate
 * visual edge magnet still owns flush; prefer leaving edges to the fine grid.
 */
export function snapToAxisPercents(
  n: number,
  percents: number[],
  skipScreenEdges = false,
  maxDistPct?: number,
): number {
  if (!percents.length || !Number.isFinite(n)) return n;
  let best = n;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < percents.length; i++) {
    const p = percents[i];
    if (skipScreenEdges && (p <= EPS || p >= 100 - EPS)) continue;
    const d = Math.abs(n - p);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  if (!Number.isFinite(bestDist) || bestDist === Number.POSITIVE_INFINITY) {
    return n;
  }
  if (maxDistPct != null && bestDist > maxDistPct) return n;
  return Math.max(0, Math.min(100, best));
}

/** @deprecated Prefer squareGridMetrics + snapToAxisPercents (square cells). */
export function layoutGridLinePercents(
  step: number = LAYOUT_GRID_STEP,
): number[] {
  return squareGridAxisPercents(100, normalizeGridStep(step));
}

/** @deprecated Equal-% snap; use snapToAxisPercents with square metrics. */
export function snapToGridPercent(
  n: number,
  step: number = LAYOUT_GRID_STEP,
  skipScreenEdges = false,
): number {
  const s = normalizeGridStep(step);
  if (!(s > 0) || !Number.isFinite(n)) return n;
  const snapped = Math.round(n / s) * s;
  const cleaned = Math.round(snapped * 1000) / 1000;
  const clamped = Math.max(0, Math.min(100, cleaned));
  if (skipScreenEdges) {
    const atEdge = clamped <= EPS || clamped >= 100 - EPS;
    const wasAtEdge = n <= EPS || n >= 100 - EPS;
    if (atEdge && !wasAtEdge) return n;
  }
  return clamped;
}
