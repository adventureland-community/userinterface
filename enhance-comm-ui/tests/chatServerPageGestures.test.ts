import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyChatServerPageSwipe } from "../src/ui/frames/chat/chatServerPageGestures";

describe("classifyChatServerPageSwipe", () => {
  it("maps left swipe to next and right to previous", () => {
    assert.equal(
      classifyChatServerPageSwipe({
        startX: 200,
        startY: 100,
        endX: 100,
        endY: 105,
      }),
      1,
    );
    assert.equal(
      classifyChatServerPageSwipe({
        startX: 100,
        startY: 100,
        endX: 200,
        endY: 95,
      }),
      -1,
    );
  });

  it("rejects short or vertical strokes", () => {
    assert.equal(
      classifyChatServerPageSwipe({
        startX: 100,
        startY: 100,
        endX: 140,
        endY: 105,
      }),
      null,
    );
    assert.equal(
      classifyChatServerPageSwipe({
        startX: 100,
        startY: 100,
        endX: 180,
        endY: 200,
      }),
      null,
    );
  });
});
