import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { panelStyle, unclipShellOverflow } from "../src/lib/layout";

describe("fill-shell overflow", () => {
  it("clears panelStyle overflowX/Y so above-frame chrome is not clipped", () => {
    const style = panelStyle(
      { x: 40, y: 40, anchor: "tl", frameW: 800, frameH: 500 },
      false,
    );
    assert.equal(style.overflowX, "hidden");
    assert.equal(style.overflowY, "auto");
    unclipShellOverflow(style);
    assert.equal(style.overflow, "visible");
    assert.equal(style.overflowX, "visible");
    assert.equal(style.overflowY, "visible");
  });
});
