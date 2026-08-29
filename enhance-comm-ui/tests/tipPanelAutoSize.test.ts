import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { panelUsesAutoSize } from "../src/lib/panelCatalog";

describe("tip panel autoSize", () => {
  it("forces buffInfo/itemInfo to hug content even when saved autoSize is false", () => {
    assert.equal(
      panelUsesAutoSize({ autoSize: false, frameW: 196, frameH: 248 }, "buffInfo"),
      true,
    );
    assert.equal(
      panelUsesAutoSize({ autoSize: false, frameW: 196, frameH: 248 }, "itemInfo"),
      true,
    );
  });

  it("still honors saved autoSize for other panels", () => {
    assert.equal(panelUsesAutoSize({ autoSize: false }, "kills"), false);
    assert.equal(panelUsesAutoSize({ autoSize: true }, "kills"), true);
  });
});
