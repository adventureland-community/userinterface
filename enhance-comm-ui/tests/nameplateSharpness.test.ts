import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { nameplateTextResolution } from "../src/lib/worldFov";
import {
  nameplateAttachPoint,
  nameplatePivotPosition,
  nameplateScreenScale,
  NAMEPLATE_DESKTOP_ZOOM_OUT_EXP,
  sharpenNameTagTextures,
  snapNameplateScreenScale,
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
    assert.equal(nameplateTextResolution(6), 6);
    assert.equal(nameplateTextResolution(0.5), 6);
  });
});

describe("snapNameplateScreenScale", () => {
  it("rounds to integers in 1…8", () => {
    assert.equal(snapNameplateScreenScale(0.44), 1);
    assert.equal(snapNameplateScreenScale(0.88), 1);
    assert.equal(snapNameplateScreenScale(1.41), 1);
    assert.equal(snapNameplateScreenScale(1.85), 2);
    assert.equal(snapNameplateScreenScale(2.47), 2);
    assert.equal(snapNameplateScreenScale(3.7), 4);
    assert.equal(snapNameplateScreenScale(7.4), 7);
    assert.equal(snapNameplateScreenScale(8.2), 8);
  });
});

describe("nameplateScreenScale", () => {
  it("counter-scales FOV then snaps to integers for crisp glyphs", () => {
    assert.equal(nameplateScreenScale(1, "desktop"), 1);
    assert.equal(nameplateScreenScale(0.5, "desktop"), 1);
    assert.ok(Number.isInteger(nameplateScreenScale(2, "desktop")));
    assert.ok(Number.isInteger(nameplateScreenScale(5, "desktop")));
  });

  it("softens desktop zoom-out so plates shrink with the map", () => {
    // Full f×0.88 at FOV 5 was 4.4; soft curve ~2.47 → snap 2.
    assert.equal(
      nameplateScreenScale(5, "desktop"),
      snapNameplateScreenScale(Math.pow(5, NAMEPLATE_DESKTOP_ZOOM_OUT_EXP) * 0.88),
    );
    assert.ok(
      nameplateScreenScale(5, "desktop") < 3.2,
      "desktop FOV 5 must stay under full counter-scale 4.4",
    );
    assert.ok(
      nameplateScreenScale(5, "desktop") >= nameplateScreenScale(1, "desktop"),
      "still at least FOV 1 size so labels remain readable",
    );
  });

  it("boosts phone plates at every FOV including zoom-in and wide zoom-out", () => {
    assert.equal(nameplateScreenScale(1, "phone"), 2);
    assert.equal(nameplateScreenScale(2, "phone"), 4);
    // Zoom-in fractions snap up to 1× (crisp) instead of soft 0.9×.
    assert.equal(nameplateScreenScale(0.5, "phone"), 1);
    assert.equal(nameplateScreenScale(0.75, "phone"), 1);
    assert.equal(nameplateScreenScale(3, "phone"), 6);
    assert.equal(nameplateScreenScale(4, "phone"), 7);
    assert.equal(nameplateScreenScale(5, "phone"), 8);
  });

  it("boosts tablet plates modestly at FOV=1", () => {
    assert.equal(nameplateScreenScale(1, "tablet"), 1);
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
    // FOV 5 → soft curve ~2.47 → snap 2× (FOV 2 snaps to 1× and skips pivot).
    sharpenNameTagTextures(root, 5);
    assert.equal(textNode.resolution, 5);
    assert.equal(textNode.roundPixels, false);
    assert.equal(textNode.texture.baseTexture.scaleMode, 0);
    const expect = nameplateScreenScale(5, "desktop");
    assert.ok(Number.isInteger(expect) && expect > 1);
    assert.equal(root.scale.x, expect);
    assert.equal(root.scale.y, expect);
    assert.equal(root.pivot.y, -40);
    assert.equal(root.y, -40);
    // FOV resolution bump + soft-plate stroke both re-rasterize Text.
    assert.ok(updates.length >= 1);
    assert.equal(updates[updates.length - 1], 5);
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
