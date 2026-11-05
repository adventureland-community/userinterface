import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAMERA_PAN_SPEED,
  JOYSTICK_DEADZONE,
  JOYSTICK_RADIUS_PX,
  keysToPan,
  joystickToPan,
  mouseDragWorldDelta,
  panFovSpeedFactor,
  stepCameraPan,
} from "../src/lib/cameraPan";
import {
  centerOnObservedCamera,
  isFollowCamera,
  isFreeCamera,
  lockCamera,
  panFrameDtSec,
  setFollowCamera,
  stockMapScreenWouldChange,
  syncFreeCameraAfterRealmChange,
  unlockCamera,
} from "../src/host/cameraPan";

describe("cameraPan math", () => {
  it("maps WASD to a unit vector", () => {
    assert.deepEqual(keysToPan({}), { x: 0, y: 0 });
    assert.deepEqual(keysToPan({ right: true }), { x: 1, y: 0 });
    assert.deepEqual(keysToPan({ left: true }), { x: -1, y: 0 });
    assert.deepEqual(keysToPan({ up: true }), { x: 0, y: -1 });
    assert.deepEqual(keysToPan({ down: true }), { x: 0, y: 1 });
    const diag = keysToPan({ right: true, down: true });
    assert.ok(Math.abs(diag.x - Math.SQRT1_2) < 1e-9);
    assert.ok(Math.abs(diag.y - Math.SQRT1_2) < 1e-9);
  });

  it("applies joystick deadzone and clamps to the stick radius", () => {
    assert.deepEqual(joystickToPan(0, 0), { x: 0, y: 0 });
    const tiny = JOYSTICK_RADIUS_PX * (JOYSTICK_DEADZONE * 0.5);
    assert.deepEqual(joystickToPan(tiny, 0), { x: 0, y: 0 });
    const full = joystickToPan(JOYSTICK_RADIUS_PX, 0);
    assert.ok(Math.abs(full.x - 1) < 1e-9);
    assert.ok(Math.abs(full.y) < 1e-9);
  });

  it("eases stick response — soft near center, full at the rim", () => {
    // Small deadzone + high expo: just-past-deadzone crawls; rim → 1.
    const light = joystickToPan(JOYSTICK_RADIUS_PX * 0.22, 0);
    assert.ok(light.x > 0);
    assert.ok(light.x < 0.02);
    const mid = joystickToPan(JOYSTICK_RADIUS_PX * 0.55, 0);
    assert.ok(mid.x > light.x);
    assert.ok(mid.x < 0.2);
    const nearFull = joystickToPan(JOYSTICK_RADIUS_PX * 0.96, 0);
    assert.ok(nearFull.x > mid.x);
    assert.ok(Math.abs(nearFull.x - 1) < 1e-9);
  });

  it("steps camera by speed × sqrt(fov) × dt", () => {
    const next = stepCameraPan(100, 200, { x: 1, y: 0 }, 0.5, {
      speed: CAMERA_PAN_SPEED,
      fov: 4,
    });
    assert.equal(next.x, 100 + CAMERA_PAN_SPEED * panFovSpeedFactor(4) * 0.5);
    assert.equal(next.y, 200);
    assert.ok(panFovSpeedFactor(4) < 4);
  });

  it("maps CSS drag to world delta (grab: drag right → camera left)", () => {
    const d = mouseDragWorldDelta(40, -20, { scale: 2, fov: 1 });
    assert.equal(d.x, -20);
    assert.equal(d.y, 10);
    const zoomed = mouseDragWorldDelta(40, 0, { scale: 2, fov: 2 });
    assert.equal(zoomed.x, -40);
  });
});

describe("cameraPan RAF dt", () => {
  it("uses a 1/60 fallback on the first frame after idle", () => {
    assert.ok(Math.abs(panFrameDtSec(1000, 0) - 1 / 60) < 1e-9);
  });

  it("does not collapse to 0 when lastTs advances across frames", () => {
    // Repro: ensureRaf used to set lastTs=0 before every rAF, so tick always
    // saw prev===now and camera never moved.
    const dt = panFrameDtSec(1016, 1000);
    assert.ok(dt > 0);
    assert.ok(Math.abs(dt - 0.016) < 1e-9);
  });
});

describe("cameraPan realm hop clears free-cam", () => {
  it("drops the free-cam lock when current_map changes", () => {
    const prev = (globalThis as { window?: unknown }).window;
    (globalThis as { window: any }).window = {
      current_map: "main",
      current_in: "main",
      server_region: "EU",
      server_identifier: "I",
      map: { real_x: 10, real_y: 20, map_name: "main" },
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
    };
    try {
      unlockCamera();
      assert.equal(isFreeCamera(), true);
      (window as any).current_map = "winterland";
      (window as any).map.real_x = 500;
      (window as any).map.real_y = -40;
      assert.equal(syncFreeCameraAfterRealmChange(), true);
      assert.equal(isFreeCamera(), false);
    } finally {
      lockCamera();
      if (prev === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = prev;
      }
    }
  });
});

describe("cameraPan Center vs Follow", () => {
  function withObserveMap(run: () => void): void {
    const prev = (globalThis as { window?: unknown }).window;
    (globalThis as { window: any }).window = {
      observing: { id: "Hero", name: "Hero", real_x: 10, real_y: 20 },
      entities: {
        Hero: {
          id: "Hero",
          name: "Hero",
          real_x: 300,
          real_y: 400,
          type: "character",
          player: true,
        },
      },
      map: { real_x: 50, real_y: 60 },
      socket: { emit() {} },
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
      setTimeout: (fn: () => void) => {
        fn();
        return 1;
      },
    };
    try {
      run();
    } finally {
      lockCamera();
      setFollowCamera(true);
      if (prev === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = prev;
      }
    }
  }

  it("Center snaps once and keeps free-cam", () => {
    withObserveMap(() => {
      unlockCamera();
      (window as any).map.real_x = 50;
      (window as any).map.real_y = 60;
      assert.equal(isFreeCamera(), true);
      assert.equal(isFollowCamera(), false);
      centerOnObservedCamera();
      assert.equal(isFreeCamera(), true);
      assert.equal(isFollowCamera(), false);
      assert.equal((window as any).map.real_x, 300);
      assert.equal((window as any).map.real_y, 400);
    });
  });

  it("Follow locks continuous track; pan clears Follow", () => {
    withObserveMap(() => {
      unlockCamera();
      assert.equal(isFollowCamera(), false);
      setFollowCamera(true);
      assert.equal(isFreeCamera(), false);
      assert.equal(isFollowCamera(), true);
      assert.equal((window as any).map.real_x, 300);
      assert.equal((window as any).map.real_y, 400);
      unlockCamera();
      assert.equal(isFreeCamera(), true);
      assert.equal(isFollowCamera(), false);
    });
  });
});

describe("cameraPan stock position_map change gate", () => {
  it("detects when map.x/y must move for a new real_* (dtile path)", () => {
    const map = { x: 100, y: 200, real_x: 50, real_y: 50 };
    assert.equal(stockMapScreenWouldChange(map, 400, 800, 2), true);
  });

  it("goes red if we pre-apply map.x/y before stock position_map", () => {
    // Repro of the black-screen bug: applyMapScreen before position_map made
    // stock see change===false and skip dtile re-anchor.
    const width = 400;
    const height = 800;
    const scale = 2;
    const real_x = 120;
    const real_y = 80;
    const preApplied = {
      x: Math.round(width / 2.0 - real_x * scale),
      y: Math.round(height / 2.0 - real_y * scale),
      real_x,
      real_y,
    };
    assert.equal(
      stockMapScreenWouldChange(preApplied, width, height, scale),
      false,
      "pre-applied screen coords hide the change from stock",
    );
  });
});
