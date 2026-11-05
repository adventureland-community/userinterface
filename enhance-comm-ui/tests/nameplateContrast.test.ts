import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  resetNameplateContrastForTests,
  tickNameplateContrast,
} from "../src/host/nameplateContrast";
import {
  NAMEPLATE_GHOST_ALPHA_BASE,
  STOCK_NAME_FILL,
} from "../src/host/nameplateStyle";

describe("nameplateContrast", () => {
  beforeEach(() => {
    resetNameplateContrastForTests();
    (globalThis as { window?: unknown }).window =
      (globalThis as { window?: unknown }).window || globalThis;
    (window as any).entities = {};
    (window as any).character = null;
    (window as any).observing = null;
    (window as any).renderer = null;
  });

  afterEach(() => {
    resetNameplateContrastForTests();
  });

  it("bumps plate alpha on a bright sample and skips when band unchanged", () => {
    const gfx = {
      dirty: 0,
      graphicsData: [
        {
          fillColor: STOCK_NAME_FILL,
          fillAlpha: NAMEPLATE_GHOST_ALPHA_BASE,
          shape: { x: 0, y: 0, width: 40, height: 9 },
        },
      ],
    };
    const plate = {
      __ecuNameplateStyled: true,
      children: [gfx],
      getBounds: () => ({ x: 10, y: 10, width: 40, height: 12 }),
    };
    (window as any).entities = { Hero: { name_tag: plate, visible: true } };

    const view = {
      width: 64,
      height: 36,
      clientWidth: 64,
      clientHeight: 36,
    } as HTMLCanvasElement;

    const buf = new Uint8ClampedArray(64 * 36 * 4);
    // Bright green world
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = 180;
      buf[i + 1] = 220;
      buf[i + 2] = 90;
      buf[i + 3] = 255;
    }
    const ctx = {
      canvas: { width: 64, height: 36 },
      clearRect() {},
      drawImage() {},
      getImageData: () => ({ data: buf, width: 1, height: 1 }),
    } as unknown as CanvasRenderingContext2D;

    tickNameplateContrast({ view, ctx });
    assert.ok(gfx.graphicsData[0].fillAlpha > NAMEPLATE_GHOST_ALPHA_BASE);
    assert.equal(
      (plate as { __ecuNameplateLumBand?: string }).__ecuNameplateLumBand,
      "bright",
    );
    const dirtyAfter = gfx.dirty;
    tickNameplateContrast({ view, ctx });
    assert.equal(gfx.dirty, dirtyAfter);
  });
});
