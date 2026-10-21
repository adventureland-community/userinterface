/**
 * Red-capable: stock seeds scale with parseInt(cookie). Fractional cookies
 * like "1.25" become 1 → 4× tile area vs scale 2 → black/slow /hub refresh.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WORLD_ZOOM_STEP,
  clampWorldZoom,
  cookieScaleValue,
} from "../src/lib/worldZoom";

describe("worldZoom stock cookie compatibility", () => {
  it("uses integer steps so parseInt matches runtime zoom", () => {
    assert.equal(WORLD_ZOOM_STEP, 1);
    assert.equal(clampWorldZoom(1.25), 1);
    assert.equal(clampWorldZoom(1.5), 2);
    assert.equal(clampWorldZoom(2.4), 2);
    assert.equal(clampWorldZoom(2.6), 3);
  });

  it("cookie payload is an integer string stock parseInt keeps", () => {
    assert.equal(cookieScaleValue(1.25), "1");
    assert.equal(cookieScaleValue(2.0), "2");
    assert.equal(parseInt(cookieScaleValue(1.75), 10), clampWorldZoom(1.75));
    assert.equal(parseInt(cookieScaleValue(2.25), 10), clampWorldZoom(2.25));
  });
});
