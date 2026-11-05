import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  WORLD_FOV_DEFAULT,
  WORLD_FOV_MAX,
  WORLD_FOV_MIN,
  WORLD_FOV_STEP,
  applyWorldFov,
  cameraRealAfterFovTowardCursor,
  clampWorldFov,
  clampWorldFovForDisplay,
  formatWorldFov,
  logicalSizeForFov,
  maxWorldFovForWindow,
  nameplateTextResolution,
  readAppliedWorldFov,
} from "../src/lib/worldFov";

describe("worldFov", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("clamps and steps FOV", () => {
    assert.equal(clampWorldFov(0), WORLD_FOV_MIN);
    assert.equal(clampWorldFov(99), WORLD_FOV_MAX);
    assert.equal(clampWorldFov(NaN), WORLD_FOV_DEFAULT);
    assert.equal(clampWorldFov(1.1), 1);
    assert.equal(clampWorldFov(1.2), 1.25);
    assert.equal(clampWorldFov(1.4), 1.5);
  });

  it("grows logical canvas with FOV while CSS window stays fixed", () => {
    assert.deepEqual(logicalSizeForFov(400, 800, 1), { w: 400, h: 800 });
    assert.deepEqual(logicalSizeForFov(400, 800, 2), { w: 800, h: 1600 });
    assert.deepEqual(logicalSizeForFov(400, 800, 0.5), { w: 200, h: 400 });
  });

  it("caps FOV to what MAX_TEXTURE_SIZE can buffer", () => {
    // 1280×720 @ 4096 → max edge FOV ≈ 3.2 → stepped max 3.0
    assert.equal(maxWorldFovForWindow(1280, 720, 4096), 3);
    assert.equal(clampWorldFovForDisplay(6, 1280, 720, 4096), 3);
    assert.equal(clampWorldFovForDisplay(2.5, 1280, 720, 4096), 2.5);
    // Past the GPU cap, logical size must not keep growing (that caused pan).
    const pastA = logicalSizeForFov(1280, 720, 4, 4096);
    const pastB = logicalSizeForFov(1280, 720, 6, 4096);
    assert.ok(pastA.w <= 4095 && pastA.h <= 4095);
    assert.deepEqual(pastA, pastB);
  });

  it("keeps the world under the cursor when FOV resizes the buffer", () => {
    // Cursor at right-center (frac 0.75). Zoom 1→3 doubles then triples width.
    // Without anchor, right-side world slides; with anchor, real_x shifts left.
    const before = { realX: 100, realY: 50, scale: 2, w: 400, h: 800 };
    const afterW = 1200;
    const afterH = 2400;
    const next = cameraRealAfterFovTowardCursor({
      realX: before.realX,
      realY: before.realY,
      scale: before.scale,
      widthBefore: before.w,
      heightBefore: before.h,
      widthAfter: afterW,
      heightAfter: afterH,
      fracX: 0.75,
      fracY: 0.5,
    });
    // world under cursor before:
    const worldX = before.realX + (0.75 - 0.5) * before.w / before.scale;
    const worldY = before.realY + (0.5 - 0.5) * before.h / before.scale;
    const underAfterX = next.x + (0.75 - 0.5) * afterW / before.scale;
    const underAfterY = next.y + (0.5 - 0.5) * afterH / before.scale;
    assert.ok(Math.abs(underAfterX - worldX) < 1e-9);
    assert.ok(Math.abs(underAfterY - worldY) < 1e-9);
    // Center cursor must not move the camera.
    const centered = cameraRealAfterFovTowardCursor({
      realX: 10,
      realY: 20,
      scale: 2,
      widthBefore: 400,
      heightBefore: 800,
      widthAfter: 1200,
      heightAfter: 2400,
      fracX: 0.5,
      fracY: 0.5,
    });
    assert.deepEqual(centered, { x: 10, y: 20 });
  });

  it("applyWorldFov sets host width/height and CSS-fits when FOV ≠ 1", () => {
    const resized: number[] = [];
    const view = { style: {} as Record<string, string> };
    (globalThis as { window?: Record<string, unknown> }).window = {
      innerWidth: 1280,
      innerHeight: 800,
      width: 1280,
      height: 800,
      map: { last_max_y: 1 },
      renderer: {
        view,
        resize(w: number, h: number) {
          resized.push(w, h);
        },
      },
    };
    const fov = applyWorldFov(2);
    assert.equal(fov, 2);
    assert.equal(readAppliedWorldFov(), 2);
    const w = (globalThis as { window: { width: number; height: number } })
      .window;
    assert.equal(w.width, 2560);
    assert.equal(w.height, 1600);
    assert.deepEqual(resized, [2560, 1600]);
    assert.equal(view.style.width, "1280px");
    assert.equal(view.style.height, "800px");
    assert.equal(view.style.imageRendering, "pixelated");
  });

  it("applyWorldFov zoom-in uses pixelated CSS (auto upscale mush)", () => {
    const view = {
      style: {} as Record<string, string>,
    };
    (globalThis as { window?: Record<string, unknown> }).window = {
      innerWidth: 1280,
      innerHeight: 800,
      width: 1280,
      height: 800,
      map: {},
      renderer: {
        view,
        resize() {},
      },
    };
    applyWorldFov(0.5);
    assert.equal(view.style.width, "1280px");
    assert.equal(view.style.height, "800px");
    assert.equal(view.style.imageRendering, "pixelated");
  });

  it("applyWorldFov at 1 clears size overrides but keeps pixelated snap on desktop", () => {
    const view = {
      style: {
        width: "12px",
        height: "12px",
        imageRendering: "auto",
      } as Record<string, string>,
    };
    const renderer = {
      view,
      roundPixels: false,
      resize() {},
    };
    (globalThis as { window?: Record<string, unknown> }).window = {
      innerWidth: 1280,
      innerHeight: 800,
      width: 1280,
      height: 800,
      map: {},
      renderer,
    };
    applyWorldFov(1);
    assert.equal(view.style.width, "");
    assert.equal(view.style.height, "");
    assert.equal(view.style.imageRendering, "pixelated");
    assert.equal(renderer.roundPixels, true);
  });

  it("phone FOV zoom-out uses auto CSS; FOV≤1 uses pixelated", () => {
    const view = { style: {} as Record<string, string> };
    (globalThis as { window?: Record<string, unknown> }).window = {
      innerWidth: 390,
      innerHeight: 844,
      width: 390,
      height: 844,
      map: {},
      renderer: {
        view,
        resize() {},
      },
    };
    applyWorldFov(1.5);
    assert.equal(view.style.imageRendering, "auto");
    applyWorldFov(1);
    assert.equal(view.style.imageRendering, "pixelated");
    applyWorldFov(0.5);
    assert.equal(view.style.imageRendering, "pixelated");
  });

  it("formats FOV labels", () => {
    assert.equal(formatWorldFov(1), "1");
    assert.equal(formatWorldFov(1.25), "1.25");
    assert.equal(WORLD_FOV_STEP, 0.25);
  });

  it("nameplateTextResolution tracks FOV denseness both ways", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      devicePixelRatio: 1,
    };
    assert.equal(nameplateTextResolution(1), 1);
    assert.equal(nameplateTextResolution(1.25), 2);
    assert.equal(nameplateTextResolution(2), 2);
    assert.equal(nameplateTextResolution(0.5), 2);
  });
});
