/**
 * Sanity-check nested layout-grid tiers + snap-to-fine (1×).
 * Mirrors src/lib/layoutGrid.ts math without importing TS.
 *
 * Usage: node agentic/verify_layout_grid_tiers.js
 */
const EPS = 1e-6;

function squareGridCellPx(step, widthPx, heightPx) {
  const minSide = Math.min(Math.max(1, widthPx), Math.max(1, heightPx));
  return Math.max(1, (minSide * step) / 100);
}

function squareGridAxisPercents(lengthPx, cellPx) {
  const len = Math.max(1, lengthPx);
  const cell = Math.max(1, cellPx);
  const out = [];
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

function snapToAxisPercents(n, percents) {
  let best = n;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < percents.length; i++) {
    const d = Math.abs(n - percents[i]);
    if (d < bestDist) {
      bestDist = d;
      best = percents[i];
    }
  }
  return best;
}

function countTiers(widthPx, heightPx, step) {
  const cellPx = squareGridCellPx(step, widthPx, heightPx);
  const fine = squareGridAxisPercents(widthPx, cellPx);
  const medium = squareGridAxisPercents(widthPx, cellPx * 2);
  const coarse = squareGridAxisPercents(widthPx, cellPx * 4);
  return { cellPx, fine: fine.length, medium: medium.length, coarse: coarse.length };
}

const W = 1920;
const H = 1080;
const STEP = 5;
const { cellPx, fine, medium, coarse } = countTiers(W, H, STEP);

const fineX = squareGridAxisPercents(W, cellPx);
const betweenFine = (fineX[0] + fineX[1]) / 2;
const snapped = snapToAxisPercents(betweenFine, fineX);

const failures = [];
if (!(fine > medium && medium > coarse)) {
  failures.push(`expected nested counts fine > medium > coarse, got ${fine}/${medium}/${coarse}`);
}
if (Math.abs(cellPx * 2 - squareGridCellPx(STEP, W, H) * 2) > EPS) {
  failures.push("2× cell mismatch");
}
if (Math.abs(snapped - fineX[0]) > EPS && Math.abs(snapped - fineX[1]) > EPS) {
  failures.push(`snap-to-fine missed 1× lines: ${snapped} not in ${fineX[0]}, ${fineX[1]}`);
}
// Midpoint between two fine lines must not jump to a 4× (coarse) line unless it is also fine.
const coarseX = squareGridAxisPercents(W, cellPx * 4);
const onlyCoarse = coarseX.filter((p) => fineX.every((f) => Math.abs(f - p) > 0.05));
if (onlyCoarse.length && Math.abs(snapped - onlyCoarse[0]) < EPS) {
  failures.push("snap landed on coarse-only line");
}

console.log(
  JSON.stringify(
    {
      viewport: `${W}x${H}`,
      stepPct: STEP,
      cellPx,
      lineCounts: { fine1x: fine, medium2x: medium, coarse4x: coarse, edge: 3 },
      snapSample: { raw: betweenFine, snappedToFine: snapped },
      ok: failures.length === 0,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
