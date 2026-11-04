import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pinchMidpointInRect,
  shiftDragZoomSteps,
  SHIFT_PINCH_PX_PER_STEP,
} from "../src/host/worldZoom";

const CANVAS = { left: 0, right: 200, top: 0, bottom: 200 };

describe("pinchMidpointInRect", () => {
  it("accepts a midpoint over the canvas", () => {
    assert.equal(pinchMidpointInRect(40, 40, 120, 80, CANVAS), true);
  });

  it("rejects when the midpoint is outside the canvas", () => {
    assert.equal(pinchMidpointInRect(400, 400, 450, 450, CANVAS), false);
  });
});

describe("shiftDragZoomSteps (DevTools Shift+drag)", () => {
  it("maps drag-up to zoom-in steps", () => {
    assert.equal(shiftDragZoomSteps(200, 200 - SHIFT_PINCH_PX_PER_STEP), 1);
    assert.equal(shiftDragZoomSteps(200, 200 - SHIFT_PINCH_PX_PER_STEP * 2), 2);
  });

  it("maps drag-down to zoom-out steps", () => {
    assert.equal(shiftDragZoomSteps(200, 200 + SHIFT_PINCH_PX_PER_STEP), -1);
  });

  it("ignores sub-threshold movement", () => {
    assert.equal(shiftDragZoomSteps(200, 200 - 10), 0);
  });
});
