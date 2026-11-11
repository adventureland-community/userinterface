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
 * Subject may roam the center; leaving the band starts a smooth recenter
 * onto the subject (camera lock → subject XY). Idle lock = no retile churn.
 * Standing still past {@link FOLLOW_IDLE_CENTER_MS} also recenters (see
 * {@link followIdleShouldCenter}).
 */
export const FOLLOW_EDGE_MARGIN = 0.22;
/**
 * Phone: tighter band so the watched character does not walk into vision fog
 * / under the dock before Follow starts easing.
 */
export const FOLLOW_EDGE_MARGIN_PHONE = 0.4;
/** Exponential recenter rate (1/s) — ~center in a few tenths of a second. */
export const FOLLOW_RECENTER_SPEED = 5.5;
/** Phone: catch up faster once the edge band is hit. */
export const FOLLOW_RECENTER_SPEED_PHONE = 7.5;
/** World units — treat lock as arrived on the subject. */
export const FOLLOW_RECENTER_SNAP = 3;
/**
 * Fraction of the shorter view half-extent between forced Follow retiles.
 * Keeps tiles ahead of the lock without thrashing every frame.
 */
export const FOLLOW_RETILE_STEP_FRAC = 0.35;
/**
 * How long the Follow subject must stand still before we ease the camera
 * onto them (even inside the dead zone). Keeps walk/fight framing idle-free.
 */
export const FOLLOW_IDLE_CENTER_MS = 900;
/** World units — subject motion below this counts as standing still. */
export const FOLLOW_IDLE_MOVE_EPS = 2;
/**
 * World units — subject jump from the prior Follow sample that counts as a
 * teleport (town / door / transport). Hard-snaps instead of easing, including
 * same-map hops that never change the map/instance fingerprint.
 */
export const FOLLOW_TELEPORT_JUMP = 180;

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

/** Max subject offset from lock before Follow starts recentering. */
export function followSafeOffset(
  halfW: number,
  halfH: number,
  edgeMargin: number = FOLLOW_EDGE_MARGIN,
): { maxOffX: number; maxOffY: number } {
  const m = Math.max(0, Math.min(0.49, edgeMargin));
  return {
    maxOffX: Math.max(0, halfW * (1 - m)),
    maxOffY: Math.max(0, halfH * (1 - m)),
  };
}

/** Edge margin for the current surface — phone keeps the subject more centered. */
export function followEdgeMarginForProfile(
  profile: "phone" | "tablet" | "desktop" | string,
): number {
  return profile === "phone" ? FOLLOW_EDGE_MARGIN_PHONE : FOLLOW_EDGE_MARGIN;
}

/** Recenter ease rate for the current surface. */
export function followRecenterSpeedForProfile(
  profile: "phone" | "tablet" | "desktop" | string,
): number {
  return profile === "phone"
    ? FOLLOW_RECENTER_SPEED_PHONE
    : FOLLOW_RECENTER_SPEED;
}

/**
 * Shrink usable Follow half-extents by a bottom CSS inset (phone dock), so the
 * dead zone is measured against what the player can actually see.
 */
export function followHalfExtentsWithBottomInset(
  halfW: number,
  halfH: number,
  viewHeightPx: number,
  bottomInsetPx: number,
): { halfW: number; halfH: number } {
  const h = halfH > 0 && Number.isFinite(halfH) ? halfH : 1;
  const viewH =
    viewHeightPx > 0 && Number.isFinite(viewHeightPx) ? viewHeightPx : 0;
  const inset =
    bottomInsetPx > 0 && Number.isFinite(bottomInsetPx) ? bottomInsetPx : 0;
  if (!(viewH > 0) || !(inset > 0)) return { halfW, halfH: h };
  const frac = Math.min(0.28, inset / viewH);
  return { halfW, halfH: Math.max(32, h * (1 - frac)) };
}

/** True when the subject is outside the Follow dead zone (needs recenter). */
export function followLockNeedsRecenter(
  lockX: number,
  lockY: number,
  subjectX: number,
  subjectY: number,
  halfW: number,
  halfH: number,
  edgeMargin: number = FOLLOW_EDGE_MARGIN,
): boolean {
  const { maxOffX, maxOffY } = followSafeOffset(halfW, halfH, edgeMargin);
  return (
    Math.abs(subjectX - lockX) > maxOffX ||
    Math.abs(subjectY - lockY) > maxOffY
  );
}

/** True when the subject has not moved more than `eps` since the prior sample. */
export function followSubjectIsStill(
  prevX: number | null | undefined,
  prevY: number | null | undefined,
  subjectX: number,
  subjectY: number,
  eps: number = FOLLOW_IDLE_MOVE_EPS,
): boolean {
  if (prevX == null || prevY == null) return false;
  if (!Number.isFinite(prevX + prevY + subjectX + subjectY)) return false;
  const lim = eps > 0 && Number.isFinite(eps) ? eps : FOLLOW_IDLE_MOVE_EPS;
  return Math.hypot(subjectX - prevX, subjectY - prevY) <= lim;
}

/**
 * Standing still long enough and off-center → start a Follow recenter.
 * Pure — host tracks idle duration from {@link followSubjectIsStill}.
 */
export function followIdleShouldCenter(
  idleForMs: number,
  lockX: number,
  lockY: number,
  subjectX: number,
  subjectY: number,
  idleMs: number = FOLLOW_IDLE_CENTER_MS,
): boolean {
  const need = idleMs > 0 && Number.isFinite(idleMs) ? idleMs : FOLLOW_IDLE_CENTER_MS;
  if (!(idleForMs >= need)) return false;
  if (!Number.isFinite(lockX + lockY + subjectX + subjectY)) return false;
  return Math.hypot(subjectX - lockX, subjectY - lockY) > FOLLOW_RECENTER_SNAP;
}

/** True when the subject is fully outside the logical viewport. */
export function followSubjectOffScreen(
  lockX: number,
  lockY: number,
  subjectX: number,
  subjectY: number,
  halfW: number,
  halfH: number,
): boolean {
  return (
    Math.abs(subjectX - lockX) > halfW || Math.abs(subjectY - lockY) > halfH
  );
}

/**
 * True when the Follow subject jumped far enough between samples to treat as
 * a teleport (town on the same map, late entity XY after a door, etc.).
 */
export function followSubjectTeleported(
  prevX: number | null | undefined,
  prevY: number | null | undefined,
  subjectX: number,
  subjectY: number,
  jump: number = FOLLOW_TELEPORT_JUMP,
): boolean {
  if (prevX == null || prevY == null) return false;
  if (!Number.isFinite(prevX + prevY + subjectX + subjectY)) return false;
  const lim = jump > 0 && Number.isFinite(jump) ? jump : FOLLOW_TELEPORT_JUMP;
  return Math.hypot(subjectX - prevX, subjectY - prevY) >= lim;
}

/**
 * True when Follow should hard-snap the lock (off-screen or teleport jump)
 * instead of easing through the dead zone.
 */
export function followLockNeedsHardSnap(
  lockX: number,
  lockY: number,
  subjectX: number,
  subjectY: number,
  halfW: number,
  halfH: number,
  prevSubjectX?: number | null,
  prevSubjectY?: number | null,
): boolean {
  if (followSubjectOffScreen(lockX, lockY, subjectX, subjectY, halfW, halfH)) {
    return true;
  }
  return followSubjectTeleported(
    prevSubjectX,
    prevSubjectY,
    subjectX,
    subjectY,
  );
}

/** World step between forced Follow retiles (FOV/zoom aware). */
export function followRetileStepWorld(
  halfW: number,
  halfH: number,
  frac: number = FOLLOW_RETILE_STEP_FRAC,
): number {
  const short = Math.min(
    halfW > 0 && Number.isFinite(halfW) ? halfW : 1,
    halfH > 0 && Number.isFinite(halfH) ? halfH : 1,
  );
  const f = frac > 0 && Number.isFinite(frac) ? frac : FOLLOW_RETILE_STEP_FRAC;
  return Math.max(FOLLOW_RECENTER_SNAP * 2, short * f);
}

/**
 * True when the Follow lock has traveled far enough since the last forced
 * retile that we should rebuild tiles ahead again.
 */
export function followShouldForceRetileAhead(
  lockX: number,
  lockY: number,
  lastRetileX: number,
  lastRetileY: number,
  stepWorld: number,
): boolean {
  if (!(stepWorld > 0) || !Number.isFinite(stepWorld)) return false;
  const dist = Math.hypot(lockX - lastRetileX, lockY - lastRetileY);
  return dist >= stepWorld;
}

/**
 * Smoothly ease the Follow lock toward the subject (screen center target).
 * Pure — tested. `arrived` when within {@link FOLLOW_RECENTER_SNAP}.
 */
export function followCameraLockSmoothToward(
  lockX: number,
  lockY: number,
  subjectX: number,
  subjectY: number,
  dtSec: number,
  speed: number = FOLLOW_RECENTER_SPEED,
): { x: number; y: number; arrived: boolean } {
  const dx = subjectX - lockX;
  const dy = subjectY - lockY;
  const dist = Math.hypot(dx, dy);
  if (!(dist > FOLLOW_RECENTER_SNAP)) {
    return { x: subjectX, y: subjectY, arrived: true };
  }
  const rate = speed > 0 && Number.isFinite(speed) ? speed : FOLLOW_RECENTER_SPEED;
  const t = 1 - Math.exp(-rate * Math.max(0, dtSec));
  const x = lockX + dx * t;
  const y = lockY + dy * t;
  if (Math.hypot(subjectX - x, subjectY - y) <= FOLLOW_RECENTER_SNAP) {
    return { x: subjectX, y: subjectY, arrived: true };
  }
  return { x, y, arrived: false };
}
