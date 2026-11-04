import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applySoftTextStyle,
  beautifyNameTag,
  isNameBandShape,
  softenNameBandGraphics,
  softPlateFill,
  STOCK_NAME_BORDER,
  STOCK_NAME_FILL,
} from "../src/host/nameplateStyle";

describe("softPlateFill", () => {
  it("softens stock border and fill only", () => {
    const border = softPlateFill(STOCK_NAME_BORDER);
    const fill = softPlateFill(STOCK_NAME_FILL);
    assert.ok(border);
    assert.ok(fill);
    assert.ok(border!.alpha < 1);
    assert.ok(fill!.alpha < 1);
    assert.equal(softPlateFill(0xb12727), null);
    assert.equal(softPlateFill(0x6ec344), null);
  });
});

describe("isNameBandShape", () => {
  it("keeps HP / MP / stand out of the name band", () => {
    assert.equal(isNameBandShape(0, 9), true);
    assert.equal(isNameBandShape(1, 7), true);
    assert.equal(isNameBandShape(-5, 6), false);
    assert.equal(isNameBandShape(8, 6), false);
    assert.equal(isNameBandShape(-13, 14), false);
  });
});

describe("softenNameBandGraphics", () => {
  it("mutates name-band fills and leaves HP chrome alone", () => {
    const gfx = {
      dirty: 0,
      graphicsData: [
        {
          fillColor: STOCK_NAME_BORDER,
          fillAlpha: 1,
          shape: { x: 0, y: 0, width: 40, height: 9 },
        },
        {
          fillColor: STOCK_NAME_FILL,
          fillAlpha: 1,
          shape: { x: 1, y: 1, width: 38, height: 7 },
        },
        {
          fillColor: STOCK_NAME_BORDER,
          fillAlpha: 1,
          shape: { x: 4, y: -5, width: 32, height: 6 },
        },
        {
          fillColor: STOCK_NAME_FILL,
          fillAlpha: 1,
          shape: { x: 5, y: -4, width: 30, height: 4 },
        },
      ],
    };
    const n = softenNameBandGraphics(gfx);
    assert.equal(n, 2);
    assert.ok(gfx.graphicsData[0].fillAlpha! < 1);
    assert.ok(gfx.graphicsData[1].fillAlpha! < 1);
    assert.equal(gfx.graphicsData[2].fillAlpha, 1);
    assert.equal(gfx.graphicsData[3].fillColor, STOCK_NAME_FILL);
    assert.ok(gfx.dirty > 0);
  });
});

describe("applySoftTextStyle", () => {
  it("adds stroke once", () => {
    const style: Record<string, unknown> = { fill: "white" };
    const node = { style, text: "Hero", updateText() {} };
    assert.equal(applySoftTextStyle(node), true);
    assert.equal(style.stroke, "#000000");
    assert.ok((style.strokeThickness as number) > 0);
    assert.equal(applySoftTextStyle(node), false);
  });
});

describe("beautifyNameTag", () => {
  it("is idempotent on the root flag", () => {
    const style: Record<string, unknown> = { fill: "#fff" };
    const root = {
      children: [
        {
          graphicsData: [
            {
              fillColor: STOCK_NAME_BORDER,
              fillAlpha: 1,
              shape: { x: 0, y: 0, width: 20, height: 9 },
            },
          ],
          children: [{ text: "A", style, updateText() {} }],
        },
      ],
    };
    beautifyNameTag(root);
    assert.equal(root.__ecuNameplateStyled, true);
    const alpha = root.children[0].graphicsData[0].fillAlpha;
    beautifyNameTag(root);
    assert.equal(root.children[0].graphicsData[0].fillAlpha, alpha);
  });
});
