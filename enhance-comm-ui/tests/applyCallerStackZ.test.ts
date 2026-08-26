import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCallerStackZ,
  panelStyle,
} from "../src/lib/layout";

describe("applyCallerStackZ", () => {
  it("keeps raise / meter zIndex after panelStyle merge", () => {
    const shell = Object.assign(
      {},
      { zIndex: 55, width: "200px" },
      panelStyle({ x: 10, y: 10, anchor: "tl" }, false),
    );
    assert.equal(shell.zIndex, 20);
    applyCallerStackZ(shell, { zIndex: 55, width: "200px" });
    assert.equal(shell.zIndex, 55);
  });

  it("leaves idle panelStyle z when props omit zIndex", () => {
    const shell = Object.assign(
      {},
      panelStyle({ x: 10, y: 10, anchor: "tl" }, false),
    );
    applyCallerStackZ(shell, { width: "200px" });
    assert.equal(shell.zIndex, 20);
  });
});
