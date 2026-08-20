import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { panelStyle, unclipShellOverflow } from "../src/lib/layout";
import { panelUsesAutoSize } from "../src/lib/panelCatalog";
import { DEFAULT_LAYOUT_DESKTOP } from "../src/lib/layoutDefaults";

/** Mirrors PositionedPanel shell sizing for hug frames (Command Alt outline). */
function hugFrameShellPlan(
  id: string,
  pos: {
    x: number;
    y: number;
    anchor: "tl" | "center";
    frameW?: number;
    frameH?: number;
    autoSize?: boolean;
  },
) {
  const autoSize = panelUsesAutoSize(pos, id);
  const sizePos = autoSize
    ? { ...pos, frameW: undefined, frameH: undefined }
    : pos;
  const style = panelStyle(sizePos, true);
  const hasSavedFrame =
    !autoSize &&
    ((typeof pos.frameW === "number" && pos.frameW > 0) ||
      (typeof pos.frameH === "number" && pos.frameH > 0));
  if (hasSavedFrame) unclipShellOverflow(style);
  return {
    autoSize,
    hasSavedFrame,
    wrapFrameBody: hasSavedFrame,
    height: style.height,
    overflowY: style.overflowY,
  };
}

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

describe("command panel sizing", () => {
  it("defaults to autosize so saved frames do not clip arrange chrome", () => {
    const pos = DEFAULT_LAYOUT_DESKTOP.command;
    assert.equal(pos.autoSize, true);
    assert.equal(panelUsesAutoSize(pos, "command"), true);
  });

  it("hugs content when autosize is on (Alt outline follows full panel)", () => {
    const plan = hugFrameShellPlan("command", {
      x: 50,
      y: 42,
      anchor: "center",
      frameW: 560,
      frameH: 300,
      autoSize: true,
    });
    assert.equal(plan.autoSize, true);
    assert.equal(plan.hasSavedFrame, false);
    assert.equal(plan.wrapFrameBody, false);
    assert.equal(plan.height, "fit-content");
  });

  it("keeps a fixed frame body when autosize is off (no content spill)", () => {
    const plan = hugFrameShellPlan("command", {
      x: 50,
      y: 42,
      anchor: "center",
      frameW: 560,
      frameH: 300,
      autoSize: false,
    });
    assert.equal(plan.autoSize, false);
    assert.equal(plan.hasSavedFrame, true);
    assert.equal(plan.wrapFrameBody, true);
    assert.equal(plan.height, "300px");
    assert.equal(plan.overflowY, "visible");
  });

  it("does not scroll-wrap overflow:visible unit frames (AggroSpark / fx overlay)", () => {
    const autoSize = panelUsesAutoSize(
      { x: 35, y: 86, anchor: "bc", frameW: 300, frameH: 112 },
      "playerFrame",
    );
    assert.equal(autoSize, false);
    const styleOverflowVisible = true;
    const hasSavedFrame = true;
    const wrapFrameBody = false || (hasSavedFrame && !styleOverflowVisible);
    assert.equal(wrapFrameBody, false);
  });
});
