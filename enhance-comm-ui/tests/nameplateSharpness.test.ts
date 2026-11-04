import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { nameplateTextResolution } from "../src/lib/worldFov";
import {
  nameplateAttachPoint,
  nameplatePivotPosition,
  nameplateScreenScale,
  sharpenNameTagTextures,
} from "../src/host/nameplateSharpness";

describe("nameplateTextResolution", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("scales resolution with FOV and devicePixelRatio", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      devicePixelRatio: 2,
    };
    assert.equal(nameplateTextResolution(1), 2);
    assert.equal(nameplateTextResolution(1.5), 3);
    assert.equal(nameplateTextResolution(2), 4);
  });

  it("densifies on zoom-in (FOV<1) instead of going soft", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      devicePixelRatio: 2,
    };
    // 1/0.5 × 2 → 4
    assert.equal(nameplateTextResolution(0.5), 4);
  });

  it("caps resolution so phone DPR × wide FOV stays WebGL-safe", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      devicePixelRatio: 3,
    };
    assert.equal(nameplateTextResolution(6), 4);
    assert.equal(nameplateTextResolution(0.5), 4);
  });
});

describe("nameplateScreenScale", () => {
  it("counter-scales FOV≠1 so CSS fit does not shrink or balloon labels", () => {
    assert.equal(nameplateScreenScale(1), 1);
    assert.equal(nameplateScreenScale(0.5), 0.5);
    assert.equal(nameplateScreenScale(2), 2);
    assert.equal(nameplateScreenScale(4), 3);
  });
});

describe("nameplate bottom pivot glue", () => {
  it("keeps the plate bottom at the stock attachment for any scale", () => {
    const stockX = 0;
    const stockY = 0;
    const bounds = { x: -20, y: -49, width: 40, height: 9 };
    const attach = nameplateAttachPoint(bounds);
    assert.equal(attach.y, -40);
    const pos = nameplatePivotPosition(stockX, stockY, attach.x, attach.y);
    assert.equal(pos.y, -40);
    // parentY of local bottom = position + (localBottom - pivot) * scale
    for (const scale of [1, 2, 3]) {
      const bottomParent = pos.y + (attach.y - attach.y) * scale;
      assert.equal(bottomParent, -40);
    }
  });
});

describe("sharpenNameTagTextures", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("pivots on the plate bottom using the stock Graphics child", () => {
    const updates: number[] = [];
    const textNode = {
      resolution: 1,
      text: "Zincao",
      style: {},
      roundPixels: false,
      texture: { baseTexture: { scaleMode: 0 } },
      updateText() {
        updates.push(this.resolution);
      },
      children: [] as unknown[],
    };
    // Stock: empty container + Graphics child at y=-(9+aheight).
    const plate = {
      x: -20,
      y: -49,
      width: 40,
      height: 9,
      getLocalBounds() {
        return { x: 0, y: 0, width: 40, height: 9 };
      },
      children: [textNode],
    };
    const root = {
      x: 0,
      y: 0,
      roundPixels: false,
      scale: {
        x: 1,
        y: 1,
        set(x: number, y: number) {
          this.x = x;
          this.y = y;
        },
      },
      pivot: {
        x: 0,
        y: 0,
        set(x: number, y: number) {
          this.x = x;
          this.y = y;
        },
      },
      // Parent bounds intentionally empty — repro of first-frame miss.
      getLocalBounds() {
        return { x: 0, y: 0, width: 0, height: 0 };
      },
      children: [plate],
    };
    (globalThis as { window?: Record<string, unknown> }).window = {
      devicePixelRatio: 1,
      PIXI: { SCALE_MODES: { NEAREST: 1, LINEAR: 0 } },
    };
    sharpenNameTagTextures(root, 2);
    assert.equal(textNode.resolution, 2);
    assert.equal(textNode.roundPixels, false);
    assert.equal(textNode.texture.baseTexture.scaleMode, 0);
    assert.equal(root.scale.x, 2);
    assert.equal(root.scale.y, 2);
    assert.equal(root.pivot.y, -40);
    assert.equal(root.y, -40);
    // FOV resolution bump + soft-plate stroke both re-rasterize Text.
    assert.ok(updates.length >= 1);
    assert.equal(updates[updates.length - 1], 2);
  });

  it("does not scale from origin when attach bounds are missing", () => {
    const root = {
      x: 0,
      y: 0,
      scale: {
        x: 1,
        y: 1,
        set(x: number, y: number) {
          this.x = x;
          this.y = y;
        },
      },
      pivot: {
        x: 0,
        y: 0,
        set(x: number, y: number) {
          this.x = x;
          this.y = y;
        },
      },
      children: [] as unknown[],
    };
    (globalThis as { window?: Record<string, unknown> }).window = {
      devicePixelRatio: 1,
      PIXI: { SCALE_MODES: { NEAREST: 1, LINEAR: 0 } },
    };
    sharpenNameTagTextures(root, 2);
    // Stay at scale 1 rather than floating off the head.
    assert.equal(root.scale.x, 1);
    assert.equal(root.y, 0);
  });
});
