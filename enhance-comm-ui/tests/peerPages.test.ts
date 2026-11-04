import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { peerPageIndex, stepPeerPage } from "../src/lib/peerPages";
import { classifyPeerPageSwipe } from "../src/ui/chrome/peerPageGestures";

describe("peerPageIndex / stepPeerPage", () => {
  const keys = ["all", "packs", "types", "ready"];

  it("indexes and clamps steps", () => {
    assert.equal(peerPageIndex(keys, "types"), 2);
    assert.equal(stepPeerPage(keys, "all", 1), "packs");
    assert.equal(stepPeerPage(keys, "all", -1), "all");
    assert.equal(stepPeerPage(keys, "ready", 1), "ready");
    assert.equal(stepPeerPage(keys, "ready", -1), "types");
  });

  it("falls back when active is missing", () => {
    assert.equal(stepPeerPage(keys, null, 1, "types"), "types");
    assert.equal(stepPeerPage(keys, "nope", 1), "all");
  });
});

describe("classifyPeerPageSwipe", () => {
  it("maps left to next and right to previous", () => {
    assert.equal(
      classifyPeerPageSwipe({
        startX: 200,
        startY: 100,
        endX: 100,
        endY: 105,
      }),
      1,
    );
    assert.equal(
      classifyPeerPageSwipe({
        startX: 100,
        startY: 100,
        endX: 200,
        endY: 95,
      }),
      -1,
    );
  });
});
