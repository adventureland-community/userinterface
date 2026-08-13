import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  snapToAxisPercents,
  squareGridAxisPercents,
  squareGridCellPx,
} from "../src/lib/layoutGrid";

const EPS = 1e-6;
const W = 1920;
const H = 1080;
const STEP = 5;

describe("square grid tiers", () => {
  it("nests fine > medium > coarse line counts", () => {
    const cellPx = squareGridCellPx(STEP, W, H);
    const fine = squareGridAxisPercents(W, cellPx);
    const medium = squareGridAxisPercents(W, cellPx * 2);
    const coarse = squareGridAxisPercents(W, cellPx * 4);
    assert.ok(fine.length > medium.length);
    assert.ok(medium.length > coarse.length);
  });

  it("snaps midpoints onto the fine (1×) axis", () => {
    const cellPx = squareGridCellPx(STEP, W, H);
    const fineX = squareGridAxisPercents(W, cellPx);
    const betweenFine = (fineX[0] + fineX[1]) / 2;
    const snapped = snapToAxisPercents(betweenFine, fineX);
    assert.ok(
      Math.abs(snapped - fineX[0]) <= EPS ||
        Math.abs(snapped - fineX[1]) <= EPS,
    );

    const coarseX = squareGridAxisPercents(W, cellPx * 4);
    const onlyCoarse = coarseX.filter((p) =>
      fineX.every((f) => Math.abs(f - p) > 0.05),
    );
    if (onlyCoarse.length) {
      assert.ok(Math.abs(snapped - onlyCoarse[0]) > EPS);
    }
  });
});
