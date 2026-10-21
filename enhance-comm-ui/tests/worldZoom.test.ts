import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WORLD_ZOOM_DEFAULT,
  WORLD_ZOOM_MAX,
  WORLD_ZOOM_MIN,
  WORLD_ZOOM_STEP,
  clampWorldZoom,
} from "../src/lib/worldZoom";

describe("worldZoom", () => {
  it("clamps to min/max and snaps to integer steps", () => {
    assert.equal(WORLD_ZOOM_STEP, 1);
    assert.equal(clampWorldZoom(0), WORLD_ZOOM_MIN);
    assert.equal(clampWorldZoom(99), WORLD_ZOOM_MAX);
    assert.equal(clampWorldZoom(NaN), WORLD_ZOOM_DEFAULT);
    assert.equal(clampWorldZoom(1.1), 1);
    assert.equal(clampWorldZoom(1.5), 2);
    assert.equal(clampWorldZoom(2.4), 2);
    assert.equal(clampWorldZoom(2.6), 3);
  });

  it("keeps default inside range", () => {
    assert.ok(WORLD_ZOOM_DEFAULT >= WORLD_ZOOM_MIN);
    assert.ok(WORLD_ZOOM_DEFAULT <= WORLD_ZOOM_MAX);
    assert.equal(
      clampWorldZoom(WORLD_ZOOM_DEFAULT + WORLD_ZOOM_STEP * 0),
      WORLD_ZOOM_DEFAULT,
    );
  });
});
