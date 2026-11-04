import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAMERA_PAN_SPEED,
  JOYSTICK_DEADZONE,
  JOYSTICK_RADIUS_PX,
  keysToPan,
  joystickToPan,
  stepCameraPan,
} from "../src/lib/cameraPan";

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

  it("steps camera by speed × fov × dt", () => {
    const next = stepCameraPan(100, 200, { x: 1, y: 0 }, 0.5, {
      speed: CAMERA_PAN_SPEED,
      fov: 2,
    });
    assert.equal(next.x, 100 + CAMERA_PAN_SPEED * 2 * 0.5);
    assert.equal(next.y, 200);
  });
});
