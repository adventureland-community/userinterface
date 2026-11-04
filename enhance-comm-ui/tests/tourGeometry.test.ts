import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cardPosition } from "../src/ui/frames/comm/guidedTour/tourGeometry";

describe("cardPosition phone observe sheet", () => {
  it("keeps the callout above a bottom sheet without covering the list", () => {
    const vw = 390;
    const vh = 700;
    // jsdom / node: stub viewport used by cardPosition
    (globalThis as { window: Window }).window = {
      innerWidth: vw,
      innerHeight: vh,
    } as Window;

    const spot = {
      top: 220,
      left: 8,
      width: 374,
      height: 420,
    };
    const cardW = Math.min(460, vw - 24);
    const cardH = 160;
    const pos = cardPosition(spot, cardW, cardH, "above");
    assert.ok(pos.top + cardH <= spot.top + 8, `card overlaps spot: ${JSON.stringify(pos)}`);
    assert.ok(pos.top >= 0);
    assert.ok(pos.left >= 0);
  });

  it("falls back to least-overlap top when the hole fills most of the screen", () => {
    const vw = 390;
    const vh = 700;
    (globalThis as { window: Window }).window = {
      innerWidth: vw,
      innerHeight: vh,
    } as Window;

    const spot = {
      top: 40,
      left: 0,
      width: vw,
      height: vh - 48,
    };
    const pos = cardPosition(spot, 360, 200, "above");
    // Prefer the top of the viewport so the list below stays usable.
    assert.ok(pos.top < 80, `expected top-pinned card, got ${pos.top}`);
  });
});
