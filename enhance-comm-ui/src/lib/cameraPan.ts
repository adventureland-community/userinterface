/**
 * Free-camera pan math — world units per second and deadzone.
 * Stock FOV uses map.real_x/y; pan nudges those without touching sprite scale.
 */

export const CAMERA_PAN_SPEED = 340;
/** Joystick stick travel (px) at full deflection. */
/** Compact thumb pad — less lower-left burial of SW monsters on phone Home. */
export const JOYSTICK_RADIUS_PX = 20;
/**
 * Radial inner deadzone (fraction of radius). Keep small so a tiny nudge
 * registers; the expo curve (not a large deadzone) carries fine control.
 */
export const JOYSTICK_DEADZONE = 0.08;
/**
 * Outer saturate — treat mag ≥ this as full tilt so worn sticks still hit max.
 */
export const JOYSTICK_OUTER = 0.96;
/**
 * Expo / power response after deadzone remap (`output = t^expo`).
 * High expo = crawl just past the deadzone, slow ramp, full speed at the rim.
 * @see https://salivity.github.io/game-development/article/calibrating-controller-stick-response-curves
 */
export const JOYSTICK_RESPONSE_POWER = 3.8;

export type CameraPanVec = { x: number; y: number };

export function clampPanAxis(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v > 1) return 1;
  if (v < -1) return -1;
  return v;
}

/**
 * Remap stick magnitude past a radial deadzone through an expo curve.
 * Pure — tested. Matches common thumbstick camera feel:
 *   1. ignore mag ≤ deadzone
 *   2. remap (deadzone → outer) → (0 → 1)
 *   3. raise to `power` so small pulls crawl and rim pulls race
 */
export function joystickResponseMagnitude(
  mag: number,
  deadzone: number = JOYSTICK_DEADZONE,
  power: number = JOYSTICK_RESPONSE_POWER,
  outer: number = JOYSTICK_OUTER,
): number {
  if (!(mag > deadzone)) return 0;
  const outerClamp = Math.max(deadzone + 1e-6, Math.min(1, outer));
  if (mag >= outerClamp) return 1;
  const span = Math.max(1e-6, outerClamp - deadzone);
  const t = Math.min(1, (mag - deadzone) / span);
  const p = power > 0 ? power : 1;
  return Math.pow(t, p);
}

/** Normalize joystick offset in px → unit vector with deadzone + expo curve. */
export function joystickToPan(
  dx: number,
  dy: number,
  radiusPx: number = JOYSTICK_RADIUS_PX,
  deadzone: number = JOYSTICK_DEADZONE,
): CameraPanVec {
  const r = Math.max(1, radiusPx);
  const nx = dx / r;
  const ny = dy / r;
  // Clamp raw mag to 1 so past-rim drags do not inflate direction.
  const rawMag = Math.sqrt(nx * nx + ny * ny);
  const mag = Math.min(1, rawMag);
  const eased = joystickResponseMagnitude(mag, deadzone);
  if (eased <= 0 || rawMag <= 0) return { x: 0, y: 0 };
  const inv = eased / rawMag;
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
 * Soft FOV speed boost — full linear FOV made fine nudges race when zoomed out.
 * sqrt keeps wide views a bit more responsive without 2–4× near-center speed.
 */
export function panFovSpeedFactor(fov: number): number {
  if (!(fov > 0) || !Number.isFinite(fov)) return 1;
  return Math.sqrt(fov);
}

/**
 * Advance camera world position. dtSec in seconds.
 * Speed scales gently with FOV (sqrt) so a wide view stays controllable.
 */
export function stepCameraPan(
  realX: number,
  realY: number,
  pan: CameraPanVec,
  dtSec: number,
  opts?: { speed?: number; fov?: number },
): { x: number; y: number } {
  const speed =
    opts && typeof opts.speed === "number" ? opts.speed : CAMERA_PAN_SPEED;
  const fov =
    opts && typeof opts.fov === "number" && opts.fov > 0 ? opts.fov : 1;
  const px = clampPanAxis(pan.x);
  const py = clampPanAxis(pan.y);
  if (px === 0 && py === 0) return { x: realX, y: realY };
  const dist = speed * panFovSpeedFactor(fov) * Math.max(0, dtSec);
  return {
    x: realX + px * dist,
    y: realY + py * dist,
  };
}

/**
 * CSS-pixel drag → world delta (grab-the-map: drag right moves camera left).
 * FOV grows the logical buffer; sprite `scale` is world→buffer. Pure — tested.
 */
export function mouseDragWorldDelta(
  dxCss: number,
  dyCss: number,
  opts?: { scale?: number; fov?: number },
): { x: number; y: number } {
  const scale =
    opts && typeof opts.scale === "number" && opts.scale > 0 ? opts.scale : 1;
  const fov =
    opts && typeof opts.fov === "number" && opts.fov > 0 ? opts.fov : 1;
  const factor = fov / scale;
  return {
    x: -dxCss * factor,
    y: -dyCss * factor,
  };
}

/** Ignore tiny pointer jitter before a left-drag becomes a pan. */
export const MOUSE_PAN_DRAG_THRESHOLD_PX = 4;

/**
 * Follow soft edge — fraction of each half-viewport kept as a push band.
 * Subject may roam the center; the lock only moves when they enter the band,
 * and then only enough to sit them on the inner edge (no continuous centering).
 * Cuts Follow retiles vs locking map.real_* to the entity every frame.
 */
export const FOLLOW_EDGE_MARGIN = 0.22;

/** World half-extents of the logical buffer (stock width/height ÷ scale). */
export function followViewHalfExtents(
  width: number,
  height: number,
  scale: number,
): { halfW: number; halfH: number } {
  const s = scale > 0 && Number.isFinite(scale) ? scale : 1;
  const w = width > 0 && Number.isFinite(width) ? width : 1;
  const h = height > 0 && Number.isFinite(height) ? height : 1;
  return { halfW: Math.max(1, w / (2 * s)), halfH: Math.max(1, h / (2 * s)) };
}

/**
 * Next Follow camera lock for a subject. Pure — tested.
 * - Inside the safe rect → same lock (no retile churn).
 * - In the edge band → nudge lock so they sit on the inner edge.
 * - Fully off-screen (teleport / bad lock) → hard-center on the subject.
 */
export function followCameraLockForSubject(
  lockX: number,
  lockY: number,
  subjectX: number,
  subjectY: number,
  halfW: number,
  halfH: number,
  edgeMargin: number = FOLLOW_EDGE_MARGIN,
): { x: number; y: number } {
  const dx = subjectX - lockX;
  const dy = subjectY - lockY;
  if (Math.abs(dx) > halfW || Math.abs(dy) > halfH) {
    return { x: subjectX, y: subjectY };
  }
  const m = Math.max(0, Math.min(0.49, edgeMargin));
  const maxOffX = Math.max(0, halfW * (1 - m));
  const maxOffY = Math.max(0, halfH * (1 - m));
  let x = lockX;
  let y = lockY;
  if (dx > maxOffX) x = subjectX - maxOffX;
  else if (dx < -maxOffX) x = subjectX + maxOffX;
  if (dy > maxOffY) y = subjectY - maxOffY;
  else if (dy < -maxOffY) y = subjectY + maxOffY;
  return { x, y };
}
