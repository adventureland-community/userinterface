import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampSplitQuantity,
  defaultSplitPeel,
  parseSplitQuantityInput,
  quickSplitPresetFromModifiers,
  resolveQuickSplitQuantity,
  splitPresetQuantity,
  splitPreview,
} from "../src/lib/bagSplitMath";

describe("bag split math", () => {
  it("clamps peel quantity to 1..max", () => {
    assert.equal(clampSplitQuantity(0, 10), null);
    assert.equal(clampSplitQuantity(11, 10), null);
    assert.equal(clampSplitQuantity(5, 10), 5);
  });

  it("presets match common MMO split behavior", () => {
    assert.equal(splitPresetQuantity("one", 200, 199), 1);
    assert.equal(splitPresetQuantity("half", 200, 199), 100);
    assert.equal(splitPresetQuantity("half", 5, 4), 2);
    assert.equal(splitPresetQuantity("max", 200, 199), 199);
    assert.equal(splitPresetQuantity("max", 100, 40), 40);
  });

  it("preview shows peel and remain", () => {
    assert.deepEqual(splitPreview(50, 200), {
      peel: 50,
      remain: 150,
      total: 200,
    });
  });

  it("defaults to half when possible", () => {
    assert.equal(defaultSplitPeel(200, 199), 100);
    assert.equal(defaultSplitPeel(2, 1), 1);
  });

  it("parses numeric input with commas", () => {
    assert.equal(parseSplitQuantityInput("1,000", 1999), 1000);
    assert.equal(parseSplitQuantityInput("", 10), null);
    assert.equal(parseSplitQuantityInput("abc", 10), null);
  });

  it("maps modifier keys to split presets", () => {
    assert.equal(quickSplitPresetFromModifiers({ ctrlKey: true }), "one");
    assert.equal(quickSplitPresetFromModifiers({ shiftKey: true }), "half");
    assert.equal(quickSplitPresetFromModifiers({ altKey: true }), "max");
    assert.equal(quickSplitPresetFromModifiers({ shiftKey: true, altKey: true }), "max");
    assert.equal(quickSplitPresetFromModifiers({}), null);
  });

  it("resolves quick split quantity from preset", () => {
    assert.equal(resolveQuickSplitQuantity(200, 199, "half"), 100);
    assert.equal(resolveQuickSplitQuantity(2, 1, "half"), 1);
    assert.equal(resolveQuickSplitQuantity(1, 0, "one"), null);
  });
});
