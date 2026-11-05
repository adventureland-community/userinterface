import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { applyWorldFov } from "../src/lib/worldFov";
import {
  forceGameViewportRefit,
  readCssViewportSize,
} from "../src/host/viewportRefit";

describe("viewportRefit after fullscreen/grow", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("detects the black-bar bug: FOV CSS height sticks after window grows", () => {
    const view = { style: {} as Record<string, string> };
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
    applyWorldFov(1.25);
    assert.equal(view.style.height, "800px");

    // Fullscreen grows the layout viewport, but nothing re-runs on_resize /
    // applyWorldFov — this is the user-visible black bar under the canvas.
    (globalThis as { window: Record<string, unknown> }).window.innerHeight =
      1000;
    assert.equal(
      view.style.height,
      "800px",
      "stale CSS height reproduces the fullscreen black bar",
    );
    assert.equal(readCssViewportSize().h, 1000);
  });

  it("forceGameViewportRefit re-fits canvas CSS to the new window", () => {
    const view = { style: {} as Record<string, string> };
    let stockCalls = 0;
    const stockResize = function (this: unknown) {
      stockCalls += 1;
      const w = globalThis.window as {
        innerWidth: number;
        innerHeight: number;
        width: number;
        height: number;
      };
      w.width = w.innerWidth;
      w.height = w.innerHeight;
    };
    (globalThis as { window?: Record<string, unknown> }).window = {
      innerWidth: 400,
      innerHeight: 800,
      width: 400,
      height: 800,
      map: {},
      on_resize: stockResize,
      renderer: {
        view,
        resize() {},
      },
    };
    // Install the FOV on_resize hook the same way the host does: wrap stock.
    const prev = (globalThis.window as { on_resize: () => void }).on_resize;
    (globalThis.window as { on_resize: () => void }).on_resize = function () {
      prev.call(this);
      applyWorldFov(1.25);
    };

    applyWorldFov(1.25);
    assert.equal(view.style.height, "800px");

    (globalThis as { window: Record<string, unknown> }).window.innerHeight =
      1000;
    forceGameViewportRefit();

    assert.ok(stockCalls >= 1);
    assert.equal(view.style.height, "1000px");
    assert.equal(view.style.width, "400px");
  });

  it("prefers the larger of inner* and visualViewport (fullscreen lag)", () => {
    (globalThis as { window?: Record<string, unknown> }).window = {
      innerWidth: 400,
      innerHeight: 800,
      visualViewport: { width: 400, height: 1000 },
    };
    assert.deepEqual(readCssViewportSize(), { w: 400, h: 1000 });
  });
});
