import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cycleMinimapBgMode,
  minimapBgPalette,
  normalizeMinimapBgMode,
} from "../src/ui/minimap/minimapAppearance";

describe("minimap background modes", () => {
  it("normalizes unknown values to opaque", () => {
    assert.equal(normalizeMinimapBgMode(undefined), "opaque");
    assert.equal(normalizeMinimapBgMode("nope"), "opaque");
  });

  it("cycles opaque → faint → transparent → opaque", () => {
    assert.equal(cycleMinimapBgMode("opaque"), "faint");
    assert.equal(cycleMinimapBgMode("faint"), "transparent");
    assert.equal(cycleMinimapBgMode("transparent"), "opaque");
  });

  it("transparent mode skips canvas fill and grid", () => {
    const palette = minimapBgPalette("transparent");
    assert.equal(palette.canvasBg, null);
    assert.equal(palette.gridColor, null);
  });

  it("faint mode uses low-alpha fill and grid", () => {
    const palette = minimapBgPalette("faint");
    assert.match(palette.canvasBg || "", /rgba\(/);
    assert.match(palette.gridColor || "", /0\.0\d+/);
  });
});
