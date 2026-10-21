import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOG_ALPHA,
  STOCK_VISION_HALF_X,
  STOCK_VISION_HALF_Y,
  readFogBounds,
  readObserverVisionHalf,
  resolveVisionCenter,
} from "../src/viz/observerVision";

function resetVisionHost(): void {
  (globalThis as any).window = (globalThis as any).window || globalThis;
  (window as any).observing = null;
  (window as any).character = null;
  (window as any).entities = {};
  (window as any).map = null;
}

describe("observerVision", () => {
  it("falls back to stock B.vision half-extents", () => {
    const prevObs = (globalThis as any).window?.observing;
    const prevChar = (globalThis as any).window?.character;
    (globalThis as any).window = (globalThis as any).window || globalThis;
    (window as any).observing = null;
    (window as any).character = null;
    const half = readObserverVisionHalf();
    assert.equal(half.x, STOCK_VISION_HALF_X);
    assert.equal(half.y, STOCK_VISION_HALF_Y);
    (window as any).observing = prevObs;
    (window as any).character = prevChar;
  });

  it("prefers observing.vision when present", () => {
    (globalThis as any).window = (globalThis as any).window || globalThis;
    (window as any).observing = { vision: [640, 480], real_x: 0, real_y: 0 };
    (window as any).character = null;
    const half = readObserverVisionHalf();
    assert.deepEqual(half, { x: 640, y: 480 });
    (window as any).observing = null;
  });

  it("fog covers the camera viewport, not map geometry", () => {
    (globalThis as any).window = (globalThis as any).window || globalThis;
    (window as any).width = 1600;
    (window as any).height = 900;
    (window as any).scale = 1;
    (window as any).map = {
      addChild() {},
      real_x: 500,
      real_y: -200,
    };
    const b = readFogBounds({ x: 0, y: 0 });
    // Camera-centered: halfW = 1600/2 + 80 = 880 → span 1760
    assert.ok(b.minX < 500 - 800);
    assert.ok(b.maxX > 500 + 800);
    assert.equal(b.minX + b.maxX, 1000);
    assert.equal(b.minY + b.maxY, -400);
    assert.ok(b.maxX - b.minX <= 3000);
    assert.ok(b.maxY - b.minY <= 3000);
    (window as any).map = null;
  });

  it("falls back to map.real_x/y when not observing a character", () => {
    resetVisionHost();
    (window as any).map = {
      addChild() {},
      real_x: 321,
      real_y: -654,
    };
    assert.deepEqual(resolveVisionCenter(), { x: 321, y: -654 });
    resetVisionHost();
  });

  it("follows live entities[] coords, not frozen window.observing", () => {
    resetVisionHost();
    (window as any).observing = {
      id: "Hero",
      name: "Hero",
      real_x: 10,
      real_y: 20,
    };
    (window as any).entities = {
      Hero: {
        id: "Hero",
        name: "Hero",
        real_x: 888,
        real_y: -77,
        type: "character",
        player: true,
      },
    };
    assert.deepEqual(resolveVisionCenter(), { x: 888, y: -77 });
    resetVisionHost();
  });

  it("ignores stale observing snap when the live entity is missing", () => {
    resetVisionHost();
    (window as any).observing = {
      id: "Gone",
      name: "Gone",
      real_x: 1,
      real_y: 2,
    };
    (window as any).map = {
      addChild() {},
      real_x: 400,
      real_y: 500,
    };
    assert.deepEqual(resolveVisionCenter(), { x: 400, y: 500 });
    resetVisionHost();
  });

  it("resolves observing by name when id lookup misses", () => {
    resetVisionHost();
    (window as any).observing = {
      name: "Hero",
      real_x: 0,
      real_y: 0,
    };
    (window as any).entities = {
      otherKey: {
        id: "abc",
        name: "Hero",
        real_x: 55,
        real_y: 66,
        type: "character",
        player: true,
      },
    };
    assert.deepEqual(resolveVisionCenter(), { x: 55, y: 66 });
    resetVisionHost();
  });

  it("keeps fog alpha quiet (no hard stripe bands)", () => {
    assert.ok(FOG_ALPHA > 0);
    assert.ok(FOG_ALPHA <= 0.2);
  });
});
