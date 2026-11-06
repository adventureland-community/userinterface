import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAMERA_PAN_SPEED,
  FOLLOW_EDGE_MARGIN,
  FOLLOW_RECENTER_SNAP,
  JOYSTICK_DEADZONE,
  JOYSTICK_RADIUS_PX,
  followCameraLockSmoothToward,
  followLockNeedsRecenter,
  followRetileStepWorld,
  followShouldForceRetileAhead,
  followSubjectOffScreen,
  followViewHalfExtents,
  keysToPan,
  joystickToPan,
  mouseDragWorldDelta,
  panFovSpeedFactor,
  stepCameraPan,
} from "../src/lib/cameraPan";
import {
  centerOnObservedCamera,
  ecuFreeCamPanMoving,
  ecuRetileBorderForView,
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

  it("derives Follow half-extents from buffer size and scale", () => {
    assert.deepEqual(followViewHalfExtents(800, 600, 2), {
      halfW: 200,
      halfH: 150,
    });
  });

  it("keeps Follow idle while the subject stays inside the safe zone", () => {
    const halfW = 400;
    const halfH = 300;
    const maxOffX = halfW * (1 - FOLLOW_EDGE_MARGIN);
    assert.equal(
      followLockNeedsRecenter(
        1000,
        2000,
        1000 + maxOffX * 0.5,
        2000 - maxOffX * 0.25,
        halfW,
        halfH,
      ),
      false,
    );
  });

  it("starts Follow recenter when the subject enters the edge band", () => {
    const halfW = 400;
    const halfH = 300;
    const maxOffX = halfW * (1 - FOLLOW_EDGE_MARGIN);
    assert.equal(
      followLockNeedsRecenter(0, 0, maxOffX + 80, 0, halfW, halfH),
      true,
    );
  });

  it("smoothly eases the Follow lock onto the subject center", () => {
    const step = followCameraLockSmoothToward(0, 0, 200, 0, 1 / 60);
    assert.ok(step.x > 0 && step.x < 200);
    assert.equal(step.y, 0);
    assert.equal(step.arrived, false);
    let x = 0;
    let y = 0;
    let arrived = false;
    for (let i = 0; i < 120; i++) {
      const next = followCameraLockSmoothToward(x, y, 200, 0, 1 / 60);
      x = next.x;
      y = next.y;
      arrived = next.arrived;
      if (arrived) break;
    }
    assert.equal(arrived, true);
    assert.ok(Math.hypot(200 - x, y) <= FOLLOW_RECENTER_SNAP);
  });

  it("flags Follow subjects that leave the logical viewport", () => {
    assert.equal(followSubjectOffScreen(0, 0, 2000, -1500, 400, 300), true);
    assert.equal(followSubjectOffScreen(0, 0, 100, 50, 400, 300), false);
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

  it("Follow snaps once then dead-zone tracks; pan clears Follow", () => {
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

  it("widens retile border while free-cam pans or Follow recenters", () => {
    assert.equal(
      ecuRetileBorderForView({ widenMoving: false, viewArea: 390 * 844 }),
      40,
      "idle Follow keeps stock border",
    );
    assert.equal(
      ecuRetileBorderForView({ widenMoving: true, viewArea: 390 * 844 }),
      100,
      "phone widen while moving",
    );
    assert.equal(
      ecuRetileBorderForView({ widenMoving: true, viewArea: 1440 * 900 }),
      140,
      "desktop widen while moving",
    );
  });

  it("treats stick/key pan as free-cam moving", () => {
    assert.equal(
      ecuFreeCamPanMoving({
        mousePanActive: false,
        mapFlushPending: false,
        keyPan: false,
        stickPan: false,
        lockMovedHold: false,
      }),
      false,
    );
    assert.equal(
      ecuFreeCamPanMoving({
        mousePanActive: false,
        mapFlushPending: false,
        keyPan: false,
        stickPan: true,
        lockMovedHold: false,
      }),
      true,
    );
  });
});

describe("Follow retile step-ahead", () => {
  it("scales the force-retile step with view half-extents", () => {
    const step = followRetileStepWorld(200, 100);
    assert.ok(step >= 35 && step <= 40, "0.35 × shorter half");
  });

  it("forces again only after the lock travels the step", () => {
    assert.equal(followShouldForceRetileAhead(0, 0, 0, 0, 80), false);
    assert.equal(followShouldForceRetileAhead(80, 0, 0, 0, 80), true);
    assert.equal(followShouldForceRetileAhead(79, 0, 0, 0, 80), false);
  });
});
