/**
 * Free-camera pan math — world units per second and deadzone.
 * Stock FOV uses map.real_x/y; pan nudges those without touching sprite scale.
 */

export const CAMERA_PAN_SPEED = 420;
/** Joystick stick travel (px) at full deflection. */
export const JOYSTICK_RADIUS_PX = 48;
export const JOYSTICK_DEADZONE = 0.18;

export type CameraPanVec = { x: number; y: number };

export function clampPanAxis(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v > 1) return 1;
  if (v < -1) return -1;
  return v;
}

/** Normalize joystick offset in px → unit vector with deadzone. */
export function joystickToPan(
  dx: number,
  dy: number,
  radiusPx: number = JOYSTICK_RADIUS_PX,
  deadzone: number = JOYSTICK_DEADZONE,
): CameraPanVec {
  const r = Math.max(1, radiusPx);
  const nx = dx / r;
  const ny = dy / r;
  const mag = Math.sqrt(nx * nx + ny * ny);
  if (mag < deadzone) return { x: 0, y: 0 };
  const scale = Math.min(1, mag);
  const inv = mag > 0 ? scale / mag : 0;
  return { x: clampPanAxis(nx * inv), y: clampPanAxis(ny * inv) };
}

/** WASD / arrows → unit pan (screen-space: +y is down, matches map). */
export function keysToPan(keys: {
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
}): CameraPanVec {
  let x = 0;
  let y = 0;
  if (keys.left) x -= 1;
  if (keys.right) x += 1;
  if (keys.up) y -= 1;
  if (keys.down) y += 1;
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const mag = Math.sqrt(x * x + y * y);
  return { x: x / mag, y: y / mag };
}

/**
 * Advance camera world position. dtSec in seconds.
 * Speed scales lightly with FOV so a wide view still feels responsive.
 */
export function stepCameraPan(
  realX: number,
  realY: number,
  pan: CameraPanVec,
  dtSec: number,
  opts?: { speed?: number; fov?: number },
): { x: number; y: number } {
  const speed = opts && typeof opts.speed === "number" ? opts.speed : CAMERA_PAN_SPEED;
  const fov =
    opts && typeof opts.fov === "number" && opts.fov > 0 ? opts.fov : 1;
  const px = clampPanAxis(pan.x);
  const py = clampPanAxis(pan.y);
  if (px === 0 && py === 0) return { x: realX, y: realY };
  const dist = speed * fov * Math.max(0, dtSec);
  return {
    x: realX + px * dist,
    y: realY + py * dist,
  };
}
