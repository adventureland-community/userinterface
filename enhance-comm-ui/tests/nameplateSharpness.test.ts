import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { nameplateTextResolution } from "../src/lib/worldFov";
import {
  applyNameplateGlyphDenseness,
  nameplateAttachPoint,
  nameplatePivotPosition,
  nameplatePhoneStaggerY,
  nameplatePhoneStaggerX,
  nameplateScreenScale,
  NAMEPLATE_STOCK_FONT_SIZE,
  NAMEPLATE_STOCK_TEXT_SCALE,
  sharpenNameTagTextures,
  snapNameplateScreenScale,
} from "../src/host/nameplateSharpness";

describe("nameplateTextResolution", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("scales denseness with FOV and devicePixelRatio", () => {
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

  it("caps denseness so phone DPR × wide FOV stays canvas-safe", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      devicePixelRatio: 3,
    };
    // DPR clamped to 2, denseness capped at 4 (64×4 font faces).
    assert.equal(nameplateTextResolution(6), 4);
    assert.equal(nameplateTextResolution(0.5), 4);
  });
});

describe("snapNameplateScreenScale", () => {
  it("snaps desktop scales to half-steps in 1…8", () => {
    assert.equal(snapNameplateScreenScale(0.44, "desktop"), 1);
    assert.equal(snapNameplateScreenScale(1.2, "desktop"), 1);
    assert.equal(snapNameplateScreenScale(1.35, "desktop"), 1.5);
    assert.equal(snapNameplateScreenScale(1.85, "desktop"), 2);
    assert.equal(snapNameplateScreenScale(2.4, "desktop"), 2.5);
    assert.equal(snapNameplateScreenScale(3.7, "desktop"), 3.5);
    assert.equal(snapNameplateScreenScale(8.2, "desktop"), 8);
  });

  it("snaps phone scales to integers", () => {
    assert.equal(snapNameplateScreenScale(1.3, "phone"), 1);
    assert.equal(snapNameplateScreenScale(1.4, "phone"), 1);
    assert.equal(snapNameplateScreenScale(1.8, "phone"), 2);
  });
});

describe("nameplateScreenScale", () => {
  it("counter-scales FOV then snaps desktop to half-steps", () => {
    assert.equal(nameplateScreenScale(1, "desktop"), 1);
    assert.equal(nameplateScreenScale(0.5, "desktop"), 2);
    assert.equal(nameplateScreenScale(2, "desktop") % 0.5, 0);
    assert.equal(nameplateScreenScale(5, "desktop") % 0.5, 0);
  });

  it("sizes desktop plates for FOV 2 / 3 and softens FOV 4+", () => {
    assert.equal(nameplateScreenScale(1, "desktop"), 1);
    assert.equal(nameplateScreenScale(2, "desktop"), 1.5);
    assert.ok(
      nameplateScreenScale(3, "desktop") >= 2.5,
      "desktop FOV 3 must read larger than FOV 2",
    );
    assert.ok(
      nameplateScreenScale(4, "desktop") <= 3,
      "desktop FOV 4 must not balloon past ~3×",
    );
    assert.ok(
      nameplateScreenScale(4, "desktop") >= nameplateScreenScale(3, "desktop"),
      "desktop FOV 4 still ≥ FOV 3",
    );
    assert.equal(nameplateScreenScale(0.5, "desktop"), 2);
  });

  it("keeps phone plates readable at every FOV step", () => {
    // FOV≤2 floors+caps at 2×; wider FOV eases up. Zoom-in still ≥2× at cover.
    assert.equal(nameplateScreenScale(1, "phone"), 2);
    assert.equal(nameplateScreenScale(1.25, "phone"), 2);
    assert.equal(nameplateScreenScale(1.5, "phone"), 2);
    assert.equal(nameplateScreenScale(2, "phone"), 2);
    assert.equal(nameplateScreenScale(3, "phone"), 3);
    assert.equal(nameplateScreenScale(5, "phone"), 4);
    assert.equal(nameplateScreenScale(0.5, "phone"), 1);
    assert.equal(nameplateScreenScale(0.75, "phone"), 1);
  });

  it("boosts tablet plates on mild zoom-out", () => {
    assert.equal(nameplateScreenScale(1, "tablet"), 1);
    assert.ok(nameplateScreenScale(1.5, "tablet") >= 2);
  });
});

describe("nameplatePhoneStaggerY", () => {
  it("fans Preview / Brick / Ember onto distinct steps", () => {
    assert.equal(nameplatePhoneStaggerY(undefined), -18);
    assert.equal(nameplatePhoneStaggerY("Preview"), -18);
    assert.equal(nameplatePhoneStaggerY("Brick"), 0);
    assert.equal(nameplatePhoneStaggerY("Ember"), 6);
    assert.equal(nameplatePhoneStaggerX("Preview"), 0);
    assert.equal(nameplatePhoneStaggerX("Brick"), 0);
    assert.equal(nameplatePhoneStaggerX("Ember"), 0);
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

describe("applyNameplateGlyphDenseness", () => {
  it("raises fontSize and lowers scale so layout size stays stock", () => {
    const node = {
      style: { fontSize: NAMEPLATE_STOCK_FONT_SIZE } as {
        fontSize?: number;
        __ecuDense?: number;
      },
      scale: {
        x: NAMEPLATE_STOCK_TEXT_SCALE,
        y: NAMEPLATE_STOCK_TEXT_SCALE,
        set(x: number, y: number) {
          this.x = x;
          this.y = y;
        },
      },
      updateText() {},
    };
    assert.equal(applyNameplateGlyphDenseness(node, 5), true);
    assert.equal(node.style.fontSize, NAMEPLATE_STOCK_FONT_SIZE * 5);
    assert.equal(node.scale.x, NAMEPLATE_STOCK_TEXT_SCALE / 5);
    assert.equal(node.style.__ecuDense, 5);
    assert.equal(applyNameplateGlyphDenseness(node, 5), false);
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
      style: { fontSize: NAMEPLATE_STOCK_FONT_SIZE } as {
        fontSize?: number;
        __ecuDense?: number;
        __ecuSoft?: boolean;
      },
      scale: {
        x: NAMEPLATE_STOCK_TEXT_SCALE,
        y: NAMEPLATE_STOCK_TEXT_SCALE,
        set(x: number, y: number) {
          this.x = x;
          this.y = y;
        },
      },
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
    // FOV 5 → soft curve ~2.47 → snap 2× (FOV 2 snaps to 1× and skips pivot).
    sharpenNameTagTextures(root, 5);
    const dense = nameplateTextResolution(5);
    assert.equal(textNode.resolution, dense);
    assert.equal(textNode.style.fontSize, NAMEPLATE_STOCK_FONT_SIZE * dense);
    assert.equal(textNode.scale.x, NAMEPLATE_STOCK_TEXT_SCALE / dense);
    assert.equal(textNode.roundPixels, false);
    assert.equal(textNode.texture.baseTexture.scaleMode, 0);
    const expect = nameplateScreenScale(5, "desktop");
    assert.ok(Number.isInteger(expect) && expect > 1);
    assert.equal(root.scale.x, expect);
    assert.equal(root.scale.y, expect);
    assert.equal(root.pivot.y, -40);
    assert.equal(root.y, -40);
    // Glyph denseness + soft-plate stroke both re-rasterize Text.
    assert.ok(updates.length >= 1);
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
