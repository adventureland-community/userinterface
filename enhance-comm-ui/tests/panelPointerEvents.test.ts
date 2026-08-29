import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { panelStyle } from "../src/lib/layout";

describe("panel pointer-events", () => {
  it("panelStyle keeps idle shells click-through", () => {
    const style = panelStyle({ x: 10, y: 10, anchor: "bc" }, false);
    assert.equal(style.pointerEvents, "none");
  });
});
