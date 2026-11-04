import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  WORLD_FOV_DEFAULT,
  WORLD_FOV_MAX,
  WORLD_FOV_MIN,
  WORLD_FOV_STEP,
  applyWorldFov,
  clampWorldFov,
  formatWorldFov,
  logicalSizeForFov,
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

  it("applyWorldFov sets host width/height and CSS-fits when FOV ≠ 1", () => {
    const resized: number[] = [];
    const view = { style: {} as Record<string, string> };
    (globalThis as { window?: Record<string, unknown> }).window = {
      innerWidth: 400,
      innerHeight: 800,
      width: 400,
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
    assert.equal(w.width, 800);
    assert.equal(w.height, 1600);
    assert.deepEqual(resized, [800, 1600]);
    assert.equal(view.style.width, "400px");
    assert.equal(view.style.height, "800px");
    assert.equal(view.style.imageRendering, "pixelated");
  });

  it("applyWorldFov zoom-in uses auto CSS sampling (not pixelated)", () => {
    const view = {
      style: {} as Record<string, string>,
    };
    (globalThis as { window?: Record<string, unknown> }).window = {
      innerWidth: 400,
      innerHeight: 800,
      width: 400,
      height: 800,
      map: {},
      renderer: {
        view,
        resize() {},
      },
    };
    applyWorldFov(0.5);
    assert.equal(view.style.width, "400px");
    assert.equal(view.style.height, "800px");
    assert.equal(view.style.imageRendering, "auto");
  });

  it("applyWorldFov at 1 clears size overrides but keeps pixelated snap", () => {
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
      innerWidth: 400,
      innerHeight: 800,
      width: 400,
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
