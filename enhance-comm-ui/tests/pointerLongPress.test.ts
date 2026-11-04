import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LONG_PRESS_DELAY_MS,
  classifyLongPressEnd,
  longPressMovedTooFar,
} from "../src/ui/chrome/pointerLongPress";

describe("pointerLongPress", () => {
  it("cancels when move exceeds slop", () => {
    const start = { pointerId: 1, x: 10, y: 10, atMs: 0 };
    assert.equal(
      longPressMovedTooFar({ start, x: 10, y: 10, moveSlopPx: 10 }),
      false,
    );
    assert.equal(
      longPressMovedTooFar({ start, x: 30, y: 10, moveSlopPx: 10 }),
      true,
    );
  });

  it("classifies short release as tap", () => {
    const start = { pointerId: 1, x: 0, y: 0, atMs: 100 };
    assert.equal(
      classifyLongPressEnd({
        start,
        atMs: 100 + LONG_PRESS_DELAY_MS - 50,
        fired: false,
        cancelled: false,
      }),
      "tapped",
    );
  });

  it("classifies timer fire or long hold as fired", () => {
    const start = { pointerId: 1, x: 0, y: 0, atMs: 0 };
    assert.equal(
      classifyLongPressEnd({
        start,
        atMs: 10,
        fired: true,
        cancelled: false,
      }),
      "fired",
    );
    assert.equal(
      classifyLongPressEnd({
        start,
        atMs: LONG_PRESS_DELAY_MS + 1,
        fired: false,
        cancelled: false,
      }),
      "fired",
    );
  });

  it("classifies cancelled when moved away", () => {
    const start = { pointerId: 1, x: 0, y: 0, atMs: 0 };
    assert.equal(
      classifyLongPressEnd({
        start,
        atMs: LONG_PRESS_DELAY_MS + 50,
        fired: false,
        cancelled: true,
      }),
      "cancelled",
    );
  });
});
