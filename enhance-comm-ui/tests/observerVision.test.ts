import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  followObservedCamera,
  isFreeCamera,
  lockCamera,
  unlockCamera,
} from "../src/host/cameraPan";
import {
  FOG_ALPHA,
  STOCK_VISION_HALF_X,
  STOCK_VISION_HALF_Y,
  readFogBounds,
  readObserverVisionHalf,
  resolveVisionCenter,
  shouldPaintObserverVisionFog,
} from "../src/viz/observerVision";
import { WORLD_FOV_DEFAULT } from "../src/lib/worldFov";
import { WORLD_ZOOM_DEFAULT } from "../src/lib/worldZoom";

function resetVisionHost(): void {
  (globalThis as any).window = (globalThis as any).window || globalThis;
  (window as any).observing = null;
  (window as any).character = null;
  (window as any).entities = {};
  (window as any).map = null;
  (window as any).socket = undefined;
  lockCamera();
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

  it("uses locked map as static observer when not watching anyone", () => {
    resetVisionHost();
    (window as any).map = {
      addChild() {},
      real_x: 321,
      real_y: -654,
    };
    // Camera locked → map.real_* is the spectator home, not a free-cam pan.
    assert.deepEqual(resolveVisionCenter(), { x: 321, y: -654 });
    resetVisionHost();
  });

  it("keeps vision on the free-cam observer anchor, not panned map.real_*", () => {
    resetVisionHost();
    (window as any).observing = {
      id: "Hero",
      name: "Hero",
      real_x: 100,
      real_y: 200,
    };
    (window as any).map = {
      addChild() {},
      real_x: 100,
      real_y: 200,
    };
    // Unlock free-cam at observer pos, then pan map.real_* away.
    unlockCamera();
    (window as any).map.real_x = 999;
    (window as any).map.real_y = -999;
    assert.equal(isFreeCamera(), true);
    assert.deepEqual(resolveVisionCenter(), { x: 100, y: 200 });
    lockCamera();
    resetVisionHost();
  });

  it("keeps free-cam vision on the static observer after observe ends", () => {
    resetVisionHost();
    (window as any).observing = {
      id: "Hero",
      name: "Hero",
      real_x: 10,
      real_y: 20,
    };
    (window as any).map = {
      addChild() {},
      real_x: 10,
      real_y: 20,
    };
    unlockCamera();
    (window as any).map.real_x = 500;
    (window as any).map.real_y = -300;
    // Still observing → hole stays on watch coords / anchor.
    assert.deepEqual(resolveVisionCenter(), { x: 10, y: 20 });
    // Stop watching while free-cam: hole stays on static observer anchor,
    // not the panned camera.
    (window as any).observing = null;
    assert.deepEqual(resolveVisionCenter(), { x: 10, y: 20 });
    lockCamera();
    // Locked again → spectator home is wherever map sits now.
    assert.deepEqual(resolveVisionCenter(), { x: 500, y: -300 });
    resetVisionHost();
  });

  it("anchors free-cam vision on the live observer, not the camera lock", () => {
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
        real_x: 250,
        real_y: -80,
        type: "character",
        player: true,
      },
    };
    // Camera already panned away before free-cam starts (stale map.real_*).
    (window as any).map = {
      addChild() {},
      real_x: 9999,
      real_y: -9999,
    };
    unlockCamera();
    (window as any).map.real_x = 1111;
    (window as any).map.real_y = 2222;
    assert.deepEqual(resolveVisionCenter(), { x: 250, y: -80 });
    // Even if the soft entity drops, stay on observe snap — never camera.
    (window as any).entities = {};
    assert.deepEqual(resolveVisionCenter(), { x: 10, y: 20 });
    lockCamera();
    resetVisionHost();
  });

  it("Follow re-centers the camera without moving vision off the observer", () => {
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
        real_x: 300,
        real_y: 400,
        type: "character",
        player: true,
      },
    };
    (window as any).map = {
      addChild() {},
      real_x: 300,
      real_y: 400,
      position_map() {},
    };
    unlockCamera();
    (window as any).map.real_x = 50;
    (window as any).map.real_y = 60;
    assert.deepEqual(resolveVisionCenter(), { x: 300, y: 400 });
    followObservedCamera();
    assert.equal(isFreeCamera(), false);
    assert.deepEqual(resolveVisionCenter(), { x: 300, y: 400 });
    assert.equal((window as any).map.real_x, 300);
    assert.equal((window as any).map.real_y, 400);
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

  it("prefers observing snap over camera when the live entity is missing", () => {
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
    // Vision is the observer's last known spot — never the free-cam / map center.
    assert.deepEqual(resolveVisionCenter(), { x: 1, y: 2 });
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

  it("shows vision fog for FOV zoom-out even when sprite scale is default", () => {
    // Repro: FOV keeps scale fixed; gating only on scale < 2 hid the box.
    assert.equal(
      shouldPaintObserverVisionFog(WORLD_FOV_DEFAULT, WORLD_ZOOM_DEFAULT),
      false,
    );
    assert.equal(shouldPaintObserverVisionFog(1.25, WORLD_ZOOM_DEFAULT), true);
    assert.equal(shouldPaintObserverVisionFog(2, WORLD_ZOOM_DEFAULT), true);
    assert.equal(
      shouldPaintObserverVisionFog(WORLD_FOV_DEFAULT, WORLD_ZOOM_DEFAULT - 1),
      true,
    );
  });
});
