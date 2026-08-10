/** Default viewport-% step for layout-edit guide lines and drag snap. */
export const LAYOUT_GRID_STEP = 5;

/** Preset steps offered in Layout edit chrome. */
export const LAYOUT_GRID_STEP_PRESETS = [1, 2.5, 5, 10, 25] as const;

export type LayoutGridStepPreset = (typeof LAYOUT_GRID_STEP_PRESETS)[number];

/** Stronger guide lines at quarter / half / edges (when step divides them). */
export const LAYOUT_GRID_MAJOR_PCTS = [0, 25, 50, 75, 100];

const EPS = 1e-6;

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

/** Major guide percents for a given step (always 0/50/100; +25/75 when aligned). */
export function layoutGridMajorPercents(
  step: number = LAYOUT_GRID_STEP,
): number[] {
  const s = normalizeGridStep(step);
  const majors = [0, 50, 100];
  const landsOn = (pct: number) => {
    const snapped = Math.round(pct / s) * s;
    return Math.abs(snapped - pct) < EPS;
  };
  if (landsOn(25)) {
    majors.splice(1, 0, 25);
    majors.splice(3, 0, 75);
  }
  return majors;
}

/** All guide-line percents from 0..100 inclusive for a step. */
export function layoutGridLinePercents(
  step: number = LAYOUT_GRID_STEP,
): number[] {
  const s = normalizeGridStep(step);
  const out: number[] = [];
  const count = Math.round(100 / s);
  for (let i = 0; i <= count; i++) {
    let pct = Math.round(i * s * 1000) / 1000;
    if (pct > 100 - EPS) pct = 100;
    if (pct <= 100) out.push(pct);
  }
  if (!out.length || Math.abs(out[out.length - 1] - 100) > EPS) out.push(100);
  return out;
}

export function isLayoutGridMajor(
  pct: number,
  step: number = LAYOUT_GRID_STEP,
): boolean {
  const majors = layoutGridMajorPercents(step);
  for (let i = 0; i < majors.length; i++) {
    if (Math.abs(majors[i] - pct) < EPS) return true;
  }
  return false;
}

/** Hard-snap an axis percent onto the layout grid. */
export function snapToGridPercent(
  n: number,
  step: number = LAYOUT_GRID_STEP,
): number {
  const s = normalizeGridStep(step);
  if (!(s > 0) || !Number.isFinite(n)) return n;
  const snapped = Math.round(n / s) * s;
  // Avoid float dust (e.g. 7.5000000001).
  const cleaned = Math.round(snapped * 1000) / 1000;
  return Math.max(0, Math.min(100, cleaned));
}
