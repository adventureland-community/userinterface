/**
 * Free camera on /comm — WASD + mouse drag + joystick pan; ignore observe
 * snaps while free.
 *
 * Stock `position_map` (game.js) only overwrites `map.real_*` when `character`
 * is set. On hub observe, `character` is null — we keep `map.real_*` at the
 * free-cam lock and let stock compute `map.x/y` + dtile. Never pre-set
 * `map.x/y` before calling stock: that makes `change === false` and skips
 * dtile re-anchor → black void while panning.
 */

import {
  CAMERA_PAN_SPEED,
  followCameraLockSmoothToward,
  followLockNeedsRecenter,
  followSubjectOffScreen,
  followViewHalfExtents,
  keysToPan,
  mouseDragWorldDelta,
  MOUSE_PAN_DRAG_THRESHOLD_PX,
  stepCameraPan,
  type CameraPanVec,
} from "../lib/cameraPan";
import { readAppliedWorldFov } from "../lib/worldFov";
import { detectViewportProfile } from "../lib/viewport";
import { readHostWorldZoom } from "../lib/worldZoom";

let installed = false;
let freeCamera = false;
/**
 * When true and not free-cam, keep map.real_* on the live observed character
 * every position_map (hub observe has no `character`, so stock will not).
 */
let followCamera = true;
/** Smooth Follow recenter in progress (edge left dead zone → ease to center). */
let followRecenter = false;
let followRecenterLastTs = 0;
let lockX = 0;
let lockY = 0;
/** Observer/spectator world pos frozen when free-cam starts (vision hole). */
let observerAnchorX = 0;
let observerAnchorY = 0;
let hasObserverAnchor = false;
/** Realm fingerprint when free-cam began — hop clears the lock. */
let freeCamRealmKey = "";
let keyUp = false;
let keyDown = false;
let keyLeft = false;
let keyRight = false;
let stickPan: CameraPanVec = { x: 0, y: 0 };
let rafId: number | null = null;
let lastTs = 0;
let origPositionMap: (() => void) | null = null;

/** Desktop mouse-drag pan (middle always; left on canvas after threshold). */
let mousePanPointerId: number | null = null;
let mousePanButton: number | null = null;
let mousePanLastX = 0;
let mousePanLastY = 0;
let mousePanActive = false;
let mousePanArmed = false;
/**
 * Coalesce mouse-drag `position_map` to one call per frame (pointermove can
 * fire hundreds of times/sec on desktop; stick/WASD already RAF-gate).
 */
let mapFlushRafId: number | null = null;
/** Stock default — restored when ECU is not driving the camera. */
const STOCK_MDRAW_BORDER = 40;
/**
 * Widen stock's retile early-out while the ECU camera lock is actively
 * moving (Follow recenter / free-cam pan). Idle Follow keeps stock border.
 * Phone/tablet use a milder bump (battery); large desktop buffers go wider.
 */
const PHONE_ECU_MDRAW_BORDER = 100;
const DESKTOP_ECU_MDRAW_BORDER = 140;
/** Logical px² at/above which we treat the buffer as desktop-sized. */
const LARGE_VIEW_AREA = 900 * 700;
/** Hold wide border briefly after a lock snap so the next retile sees it. */
const LOCK_MOVED_HOLD_MS = 250;
/** Slow fallback while free-cam — position_map already syncs on draw. */
const REALM_FALLBACK_MS = 2000;
let origRetileTheMap: (() => void) | null = null;
let lockMovedUntil = 0;
let realmFallbackId: number | null = null;

type FreeListener = (free: boolean) => void;
const freeListeners: FreeListener[] = [];
type FollowListener = (following: boolean) => void;
const followListeners: FollowListener[] = [];

function notifyFree(): void {
  for (let i = 0; i < freeListeners.length; i++) freeListeners[i](freeCamera);
}

function notifyFollow(): void {
  const on = followCamera && !freeCamera;
  for (let i = 0; i < followListeners.length; i++) followListeners[i](on);
}

export function subscribeFreeCamera(listener: FreeListener): () => void {
  freeListeners.push(listener);
  return () => {
    const idx = freeListeners.indexOf(listener);
    if (idx >= 0) freeListeners.splice(idx, 1);
  };
}

export function subscribeFollowCamera(listener: FollowListener): () => void {
  followListeners.push(listener);
  return () => {
    const idx = followListeners.indexOf(listener);
    if (idx >= 0) followListeners.splice(idx, 1);
  };
}

export function isFreeCamera(): boolean {
  return freeCamera;
}

/**
 * True when Follow is on. Dead-zone idle, then smooth recenter to the subject.
 */
export function isFollowCamera(): boolean {
  return followCamera && !freeCamera;
}

/**
 * World position the observer / watched character had when free-cam began.
 * Vision fog hole stays here while the camera pans away.
 */
export function readObserverCameraAnchor(): {
  x: number;
  y: number;
} | null {
  if (!hasObserverAnchor) return null;
  if (!Number.isFinite(observerAnchorX + observerAnchorY)) return null;
  return { x: observerAnchorX, y: observerAnchorY };
}

type HostMap = {
  real_x?: number;
  real_y?: number;
  x?: number;
  y?: number;
};

function hostMap(): HostMap | null {
  const m = (window as Window & { map?: HostMap }).map;
  return m || null;
}

function readHostSize(): { w: number; h: number } {
  const w = (window as Window & { width?: number; height?: number }).width;
  const h = (window as Window & { height?: number }).height;
  return {
    w: typeof w === "number" && w > 0 ? w : window.innerWidth || 1280,
    h: typeof h === "number" && h > 0 ? h : window.innerHeight || 720,
  };
}

/** True when ECU owns map.real_* via the lock (free-cam pan or Follow track). */
function lockDrivesCamera(): boolean {
  return freeCamera || followCamera;
}

/** Run stock position_map at most once per animation frame. */
function schedulePositionMapFlush(): void {
  if (mapFlushRafId != null) return;
  mapFlushRafId = window.requestAnimationFrame(() => {
    mapFlushRafId = null;
    const map = hostMap();
    if (lockDrivesCamera() && map) {
      map.real_x = lockX;
      map.real_y = lockY;
    }
    const pos = (window as Window & { position_map?: () => void }).position_map;
    if (typeof pos === "function") {
      try {
        pos();
      } catch {
        /* ignore */
      }
    }
  });
}

function clearFollowRecenter(): void {
  followRecenter = false;
  followRecenterLastTs = 0;
}

function nowMs(): number {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

/** Mark that lockX/Y moved — widen retile border for a short hold. */
function noteCameraLockMoved(): void {
  lockMovedUntil = nowMs() + LOCK_MOVED_HOLD_MS;
}

/**
 * True while ECU is actively driving the camera lock (not idle Follow).
 * Pure-ish for tests — pass live flags + whether the lock recently moved.
 */
export function ecuCameraLockMoving(opts: {
  followRecenter: boolean;
  mousePanActive: boolean;
  mapFlushPending: boolean;
  keyPan: boolean;
  stickPan: boolean;
  lockMovedHold: boolean;
}): boolean {
  return (
    opts.followRecenter ||
    opts.mousePanActive ||
    opts.mapFlushPending ||
    opts.keyPan ||
    opts.stickPan ||
    opts.lockMovedHold
  );
}

function readCameraLockMoving(): boolean {
  const keys = keysToPan({
    up: keyUp,
    down: keyDown,
    left: keyLeft,
    right: keyRight,
  });
  return ecuCameraLockMoving({
    followRecenter,
    mousePanActive,
    mapFlushPending: mapFlushRafId != null,
    keyPan: keys.x !== 0 || keys.y !== 0,
    stickPan: stickPan.x !== 0 || stickPan.y !== 0,
    lockMovedHold: nowMs() < lockMovedUntil,
  });
}

function syncRealmFallbackTimer(): void {
  if (
    typeof window === "undefined" ||
    typeof window.setInterval !== "function"
  ) {
    return;
  }
  if (freeCamera) {
    if (realmFallbackId != null) return;
    realmFallbackId = window.setInterval(() => {
      syncFreeCameraAfterRealmChange();
    }, REALM_FALLBACK_MS);
    return;
  }
  if (realmFallbackId == null) return;
  window.clearInterval(realmFallbackId);
  realmFallbackId = null;
}

/**
 * Follow: idle while the subject stays in the viewport dead zone; once they
 * near the edge, ease the lock onto them (true center) instead of edge-nudging.
 */
function panLockToObserved(): void {
  const at = readObservedWorldXY();
  if (!at) return;
  const size = readHostSize();
  const half = followViewHalfExtents(size.w, size.h, readHostWorldZoom());
  if (
    followSubjectOffScreen(lockX, lockY, at.x, at.y, half.halfW, half.halfH)
  ) {
    lockX = at.x;
    lockY = at.y;
    noteCameraLockMoved();
    clearFollowRecenter();
    return;
  }
  if (
    followLockNeedsRecenter(lockX, lockY, at.x, at.y, half.halfW, half.halfH)
  ) {
    followRecenter = true;
  }
  if (!followRecenter) return;

  const now = nowMs();
  const dt =
    followRecenterLastTs > 0
      ? Math.min(0.05, Math.max(0, (now - followRecenterLastTs) / 1000))
      : 1 / 60;
  followRecenterLastTs = now;
  const next = followCameraLockSmoothToward(lockX, lockY, at.x, at.y, dt);
  lockX = next.x;
  lockY = next.y;
  noteCameraLockMoved();
  if (next.arrived) clearFollowRecenter();
}

function syncLockFromMap(): void {
  const map = hostMap();
  if (!map) return;
  if (typeof map.real_x === "number" && Number.isFinite(map.real_x)) {
    lockX = map.real_x;
  }
  if (typeof map.real_y === "number" && Number.isFinite(map.real_y)) {
    lockY = map.real_y;
  }
}

/** After clearing observe, adopt whatever stock left in map.real_*. */
export function syncLockFromMapAfterObserveClear(): void {
  syncLockFromMap();
}

/**
 * Free-cam jump to a world XY (cursor-anchored FOV zoom). Calls position_map.
 */
export function setCameraWorldXY(x: number, y: number): void {
  if (!Number.isFinite(x + y)) return;
  unlockCamera();
  const map = hostMap();
  if (!map) return;
  lockX = x;
  lockY = y;
  noteCameraLockMoved();
  map.real_x = x;
  map.real_y = y;
  const pos = (window as Window & { position_map?: () => void }).position_map;
  if (typeof pos === "function") {
    try {
      pos();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Stable fingerprint for map + instance + realm. Pure-ish — reads host globals.
 * Free-cam locks are only valid while this stays put.
 */
export function readCameraRealmKey(): string {
  const w = window as Window & {
    current_map?: string;
    current_in?: string | number;
    server_region?: string;
    server_identifier?: string;
    map?: { map_name?: string };
  };
  const mapName =
    (w.current_map != null && String(w.current_map) !== ""
      ? String(w.current_map)
      : w.map && w.map.map_name != null
        ? String(w.map.map_name)
        : "") || "";
  const inst =
    w.current_in != null && String(w.current_in) !== ""
      ? String(w.current_in)
      : "";
  const region = w.server_region != null ? String(w.server_region) : "";
  const ident =
    w.server_identifier != null ? String(w.server_identifier) : "";
  return mapName + "|" + inst + "|" + region + "|" + ident;
}

/**
 * If the observed realm/map changed while free-cam was on, drop the lock so
 * vision + Follow use live coords (old lock.x/y are from the previous map).
 * Returns true when a stale lock was cleared.
 */
export function syncFreeCameraAfterRealmChange(): boolean {
  if (!freeCamera) return false;
  const key = readCameraRealmKey();
  if (!freeCamRealmKey || !key || key === freeCamRealmKey) return false;
  lockCamera();
  syncLockFromMap();
  return true;
}

function readObservedWorldXY(): { x: number; y: number } | null {
  const w = window as Window & {
    observing?: {
      id?: string;
      name?: string;
      real_x?: number;
      real_y?: number;
      x?: number;
      y?: number;
    } | null;
    character?: {
      real_x?: number;
      real_y?: number;
      x?: number;
      y?: number;
    } | null;
    entities?: Record<
      string,
      {
        id?: string;
        name?: string;
        real_x?: number;
        real_y?: number;
        x?: number;
        y?: number;
      } | null
    >;
  };
  const snap = w.observing;
  if (snap) {
    const ents = w.entities;
    if (ents && snap.id != null && ents[String(snap.id)]) {
      const live = ents[String(snap.id)];
      const x = Number(live && (live.real_x ?? live.x));
      const y = Number(live && (live.real_y ?? live.y));
      if (Number.isFinite(x + y)) return { x, y };
    }
    if (ents && snap.name != null) {
      const want = String(snap.name);
      for (const id in ents) {
        if (!Object.prototype.hasOwnProperty.call(ents, id)) continue;
        const live = ents[id];
        if (!live || live.name == null || String(live.name) !== want) continue;
        const x = Number(live.real_x ?? live.x);
        const y = Number(live.real_y ?? live.y);
        if (Number.isFinite(x + y)) return { x, y };
      }
    }
    const sx = Number(snap.real_x ?? snap.x);
    const sy = Number(snap.real_y ?? snap.y);
    if (Number.isFinite(sx + sy)) return { x: sx, y: sy };
  }
  const ch = w.character;
  if (ch) {
    const x = Number(ch.real_x ?? ch.x);
    const y = Number(ch.real_y ?? ch.y);
    if (Number.isFinite(x + y)) return { x, y };
  }
  return null;
}

/** Enter free camera at the current map position (idempotent). Panning clears Follow. */
export function unlockCamera(): void {
  syncFreeCameraAfterRealmChange();
  if (!freeCamera) {
    syncLockFromMap();
    // Vision hole must stay on the observer — never the camera lock. Camera
    // may already be mid-pan if unlock is re-entered after a soft reset.
    const at = readObservedWorldXY();
    if (at) {
      observerAnchorX = at.x;
      observerAnchorY = at.y;
    } else {
      observerAnchorX = lockX;
      observerAnchorY = lockY;
    }
    hasObserverAnchor = true;
    freeCamRealmKey = readCameraRealmKey();
    freeCamera = true;
    const wasFollow = followCamera;
    followCamera = false;
    clearFollowRecenter();
    notifyFree();
    if (wasFollow) notifyFollow();
  }
  syncRealmFallbackTimer();
  ensureRaf();
}

/**
 * Drop the free-cam vision lock (e.g. user cleared observe). Next unlock
 * re-captures from the live subject; fog must not keep a stale watch XY.
 */
export function clearObserverCameraAnchor(): void {
  hasObserverAnchor = false;
  observerAnchorX = 0;
  observerAnchorY = 0;
}

/** Exit free-cam (stock / Follow path can drive the view again). */
export function lockCamera(): void {
  freeCamera = false;
  stickPan = { x: 0, y: 0 };
  keyUp = keyDown = keyLeft = keyRight = false;
  freeCamRealmKey = "";
  hasObserverAnchor = false;
  endMousePan();
  stopRafIfIdle();
  notifyFree();
  // Next unlock will re-capture; while locked, vision follows live entity/map.
  hasObserverAnchor = false;
  syncRealmFallbackTimer();
}

function emitObserveHome(): void {
  const sock = window.socket as { emit?: (e: string) => void } | undefined;
  if (sock && typeof sock.emit === "function") sock.emit("o:home");
}

/** Snap map.real_* to the live observed (or self) world position. */
function snapMapToObserved(): boolean {
  const map = hostMap();
  const at = readObservedWorldXY();
  if (map && at) {
    lockX = at.x;
    lockY = at.y;
    noteCameraLockMoved();
    map.real_x = at.x;
    map.real_y = at.y;
    const pos = (window as Window & { position_map?: () => void }).position_map;
    if (typeof pos === "function") {
      try {
        pos();
      } catch {
        /* ignore */
      }
    }
    return true;
  }
  syncLockFromMap();
  return false;
}

/**
 * Nudge camera in world space. Activates free mode.
 * pan is a unit vector (screen: +x right, +y down).
 *
 * Only writes `map.real_*` — stock `position_map` / `draw` apply screen + tiles.
 */
export function panCamera(pan: CameraPanVec, dtSec: number): void {
  unlockCamera();
  const map = hostMap();
  if (!map) return;
  const next = stepCameraPan(lockX, lockY, pan, dtSec, {
    speed: CAMERA_PAN_SPEED,
    fov: readAppliedWorldFov(),
  });
  lockX = next.x;
  lockY = next.y;
  noteCameraLockMoved();
  map.real_x = lockX;
  map.real_y = lockY;
}

export function setJoystickPan(pan: CameraPanVec): void {
  stickPan = {
    x: pan.x,
    y: pan.y,
  };
  if (pan.x !== 0 || pan.y !== 0) unlockCamera();
  ensureRaf();
  stopRafIfIdle();
}

/**
 * Apply a one-shot world-space nudge (mouse drag). Writes `map.real_*` now;
 * stock `position_map` is RAF-coalesced so high-rate pointermove does not
 * outrun draw / retile the way the phone stick never does.
 */
export function panCameraByWorldDelta(dx: number, dy: number): void {
  if (!(Number.isFinite(dx + dy)) || (dx === 0 && dy === 0)) return;
  unlockCamera();
  const map = hostMap();
  if (!map) return;
  lockX += dx;
  lockY += dy;
  noteCameraLockMoved();
  map.real_x = lockX;
  map.real_y = lockY;
  schedulePositionMapFlush();
}

function typingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return !!el.closest(
    "input, textarea, select, [contenteditable='true'], .CodeMirror, .comm-bag-ctx, .ecu-phone-action-sheet",
  );
}

function uiBlocksMousePan(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  if (typingTarget(el)) return true;
  return !!el.closest(
    "#comm-ui button, #comm-ui a, #comm-ui input, #comm-ui textarea, #comm-ui select, #comm-ui [role='dialog'], .ecu-phone-dock, .ecu-cam-stick, .ecu-chrome-stack, .ecu-server-dd, .comm-pos-panel, .ecu-phone-sheet, .ecu-phone-sheet-scrim",
  );
}

/** Phone uses the on-screen stick — skip mouse pan there. */
function mousePanAllowed(): boolean {
  if (detectViewportProfile() === "phone") return false;
  if (document.documentElement.classList.contains("ecu-phone-dock-on")) {
    return false;
  }
  return true;
}

function endMousePan(): void {
  mousePanPointerId = null;
  mousePanButton = null;
  mousePanActive = false;
  mousePanArmed = false;
  try {
    if (document.body) document.body.style.removeProperty("cursor");
  } catch {
    /* ignore */
  }
}

function onMousePanDown(ev: PointerEvent): void {
  if (!mousePanAllowed()) return;
  if (ev.pointerType === "touch") return;
  if (uiBlocksMousePan(ev.target)) return;
  const isMiddle = ev.button === 1;
  const isLeft = ev.button === 0;
  if (!isMiddle && !isLeft) return;
  if (isLeft) {
    const t = ev.target;
    if (!(t instanceof Element) || t.tagName.toLowerCase() !== "canvas") {
      return;
    }
  }
  mousePanPointerId = ev.pointerId;
  mousePanButton = ev.button;
  mousePanLastX = ev.clientX;
  mousePanLastY = ev.clientY;
  mousePanArmed = true;
  mousePanActive = isMiddle;
  if (isMiddle) {
    unlockCamera();
    ev.preventDefault();
    try {
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
    } catch {
      /* ignore */
    }
    if (document.body) document.body.style.cursor = "grabbing";
  }
}

function onMousePanMove(ev: PointerEvent): void {
  if (!mousePanArmed || mousePanPointerId !== ev.pointerId) return;
  const dx = ev.clientX - mousePanLastX;
  const dy = ev.clientY - mousePanLastY;
  if (!mousePanActive) {
    if (
      mousePanButton === 0 &&
      Math.hypot(dx, dy) < MOUSE_PAN_DRAG_THRESHOLD_PX
    ) {
      return;
    }
    mousePanActive = true;
    unlockCamera();
    try {
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
    } catch {
      /* ignore */
    }
    if (document.body) document.body.style.cursor = "grabbing";
  }
  mousePanLastX = ev.clientX;
  mousePanLastY = ev.clientY;
  const delta = mouseDragWorldDelta(dx, dy, {
    scale: readHostWorldZoom(),
    fov: readAppliedWorldFov(),
  });
  panCameraByWorldDelta(delta.x, delta.y);
  ev.preventDefault();
}

function onMousePanUp(ev: PointerEvent): void {
  if (mousePanPointerId !== ev.pointerId) return;
  if (mousePanActive) ev.preventDefault();
  endMousePan();
}

function onMousePanAuxClick(ev: MouseEvent): void {
  // Middle-click otherwise pastes / opens autoscroll — swallow after pan.
  if (ev.button === 1 && mousePanAllowed()) ev.preventDefault();
}

function onKeyDown(ev: KeyboardEvent): void {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (typingTarget(ev.target)) return;
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  let used = false;
  if (k === "w" || k === "ArrowUp") {
    keyUp = true;
    used = true;
  } else if (k === "s" || k === "ArrowDown") {
    keyDown = true;
    used = true;
  } else if (k === "a" || k === "ArrowLeft") {
    keyLeft = true;
    used = true;
  } else if (k === "d" || k === "ArrowRight") {
    keyRight = true;
    used = true;
  }
  if (!used) return;
  ev.preventDefault();
  unlockCamera();
  ensureRaf();
}

function onKeyUp(ev: KeyboardEvent): void {
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  if (k === "w" || k === "ArrowUp") keyUp = false;
  else if (k === "s" || k === "ArrowDown") keyDown = false;
  else if (k === "a" || k === "ArrowLeft") keyLeft = false;
  else if (k === "d" || k === "ArrowRight") keyRight = false;
  stopRafIfIdle();
}

function combinedPan(): CameraPanVec {
  const fromKeys = keysToPan({
    up: keyUp,
    down: keyDown,
    left: keyLeft,
    right: keyRight,
  });
  const x = clampAdd(fromKeys.x, stickPan.x);
  const y = clampAdd(fromKeys.y, stickPan.y);
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const mag = Math.sqrt(x * x + y * y);
  return { x: x / mag, y: y / mag };
}

function clampAdd(a: number, b: number): number {
  const s = a + b;
  if (s > 1) return 1;
  if (s < -1) return -1;
  return s;
}

/**
 * Frame dt for the pan RAF. First frame after idle uses 1/60 so a stick tap
 * always moves; never reset lastTs when re-scheduling mid-gesture (that made
 * dt always 0 and froze the camera).
 */
export function panFrameDtSec(nowMs: number, prevMs: number): number {
  if (!(prevMs > 0)) return 1 / 60;
  return Math.min(0.05, Math.max(0, (nowMs - prevMs) / 1000));
}

function tick(ts: number): void {
  rafId = null;
  syncFreeCameraAfterRealmChange();
  const pan = combinedPan();
  if (pan.x === 0 && pan.y === 0) {
    lastTs = 0;
    return;
  }
  const dt = panFrameDtSec(ts, lastTs);
  lastTs = ts;
  panCamera(pan, dt);
  // Call stock position_map so map.x/y + dtile update this frame (draw may
  // lag a tick behind our RAF).
  const pos = (window as Window & { position_map?: () => void }).position_map;
  if (typeof pos === "function") {
    try {
      pos();
    } catch {
      /* ignore */
    }
  }
  ensureRaf();
}

function ensureRaf(): void {
  if (rafId != null) return;
  const pan = combinedPan();
  if (pan.x === 0 && pan.y === 0) return;
  rafId = window.requestAnimationFrame(tick);
}

function stopRafIfIdle(): void {
  if (combinedPan().x !== 0 || combinedPan().y !== 0) return;
  if (rafId != null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastTs = 0;
}

/**
 * Keep the ECU lock across stock `position_map` / `draw`.
 * Follow dead-zone + smooth recenter onto the observed entity, then the same
 * write path as free-cam. Never re-read live XY after stock.
 */
function patchedPositionMap(this: unknown): void {
  syncFreeCameraAfterRealmChange();
  const map = hostMap();
  const w = window as Window & { character?: unknown };
  if (followCamera && !freeCamera) {
    panLockToObserved();
  }
  if (lockDrivesCamera() && map) {
    map.real_x = lockX;
    map.real_y = lockY;
  }
  const savedChar = freeCamera && w.character ? w.character : null;
  if (savedChar) w.character = undefined;
  try {
    if (origPositionMap) origPositionMap.call(this);
  } finally {
    if (savedChar) w.character = savedChar;
  }
  if (lockDrivesCamera() && map) {
    // Stock observe path already used our real_*; playing path may have been
    // skipped via character null — ensure lock sticks for the next retile.
    map.real_x = lockX;
    map.real_y = lockY;
  }
}

function installPositionMapHook(): void {
  const w = window as Window & {
    position_map?: () => void;
    __ecuPositionMap?: () => void;
  };
  // Retile hook is independent — keep trying even if position_map was wrapped.
  installRetileBorderHook();
  if (typeof w.__ecuPositionMap === "function") return;
  if (typeof w.position_map !== "function") return;
  origPositionMap = w.position_map;
  w.__ecuPositionMap = patchedPositionMap;
  w.position_map = patchedPositionMap;
}

/**
 * One-shot recenter on the observed character.
 * Keeps free-cam if you were panning (center without engaging Follow).
 * If already following, just snaps / o:home.
 */
export function centerOnObservedCamera(): void {
  const stayFree = freeCamera;
  snapMapToObserved();
  emitObserveHome();
  if (stayFree) {
    freeCamera = true;
    const at = readObservedWorldXY();
    if (at) {
      observerAnchorX = at.x;
      observerAnchorY = at.y;
      hasObserverAnchor = true;
    }
    freeCamRealmKey = readCameraRealmKey();
    notifyFree();
  }
  window.setTimeout(() => {
    if (stayFree && freeCamera) {
      snapMapToObserved();
      // Stay free at the snapped lock.
      freeCamera = true;
    } else if (!freeCamera) {
      snapMapToObserved();
    }
  }, 400);
}

/**
 * Toggle Follow (exits free-cam when on). Snaps once, then dead-zone idle with
 * smooth recenter to center when they near the edge. Pan clears Follow.
 */
export function setFollowCamera(on: boolean): void {
  if (on) {
    followCamera = true;
    lockCamera();
    snapMapToObserved();
    clearFollowRecenter();
    emitObserveHome();
    notifyFollow();
    window.setTimeout(() => {
      if (followCamera && !freeCamera) snapMapToObserved();
    }, 400);
    return;
  }
  followCamera = false;
  clearFollowRecenter();
  notifyFollow();
  unlockCamera();
}

/**
 * Enable Follow (legacy chrome / `__ecuFollowObserved`). Prefer setFollowCamera.
 */
export function followObservedCamera(): void {
  setFollowCamera(true);
}

export function installCameraPan(): void {
  if (installed) return;
  installed = true;
  installPositionMapHook();
  if (!origPositionMap) {
    const started = Date.now();
    const id = window.setInterval(() => {
      installPositionMapHook();
      if (origPositionMap || Date.now() - started > 30000) {
        window.clearInterval(id);
      }
    }, 250);
  }
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("pointerdown", onMousePanDown, true);
  window.addEventListener("pointermove", onMousePanMove, true);
  window.addEventListener("pointerup", onMousePanUp, true);
  window.addEventListener("pointercancel", onMousePanUp, true);
  window.addEventListener("auxclick", onMousePanAuxClick, true);
  // Middle-button autoscroll / paste chrome — kill while we own the gesture.
  window.addEventListener(
    "mousedown",
    (ev) => {
      if (ev.button === 1 && mousePanAllowed() && !uiBlocksMousePan(ev.target)) {
        ev.preventDefault();
      }
    },
    true,
  );
  window.addEventListener("blur", () => {
    keyUp = keyDown = keyLeft = keyRight = false;
    endMousePan();
    stopRafIfIdle();
  });
  // Realm hops while free-cam: position_map syncs; slow fallback while unlocked.
  syncRealmFallbackTimer();
  const w = window as Window & {
    __ecuFollowObserved?: () => void;
    __ecuCenterObserved?: () => void;
    __ecuSetFollowCamera?: (on: boolean) => void;
    __ecuPanCameraByWorldDelta?: (dx: number, dy: number) => void;
  };
  w.__ecuFollowObserved = followObservedCamera;
  w.__ecuCenterObserved = centerOnObservedCamera;
  w.__ecuSetFollowCamera = setFollowCamera;
  w.__ecuPanCameraByWorldDelta = panCameraByWorldDelta;
}

export function isCameraPanInstalled(): boolean {
  return installed;
}

/** Match stock `c_round` (game.js) so Follow's pixel gate agrees with draw. */
export function stockCRound(n: number): number {
  const w =
    typeof window !== "undefined"
      ? (window as Window & { floor_xy?: boolean; round_xy?: boolean })
      : undefined;
  if (w && w.floor_xy) return Math.floor(n);
  // Stock defaults `round_xy = true`; node tests have no window.
  if (w && !w.round_xy) return n;
  return Math.round(n);
}

/** Test seam — stock-like change detection for map.x/y. */
export function stockMapScreenWouldChange(
  map: { x?: number; y?: number; real_x: number; real_y: number },
  width: number,
  height: number,
  scale: number,
): boolean {
  const x = stockCRound(width / 2.0 - map.real_x * scale);
  const y = stockCRound(height / 2.0 - map.real_y * scale);
  return map.x !== x || map.y !== y;
}

/**
 * Retile border while the ECU lock is moving. Idle Follow / idle free-cam
 * keep stock 40 so standing still does not keep the expensive rebuild path.
 */
export function ecuRetileBorderForView(opts: {
  lockMoving: boolean;
  viewArea: number;
}): number {
  if (!opts.lockMoving) return STOCK_MDRAW_BORDER;
  if (opts.viewArea >= LARGE_VIEW_AREA) return DESKTOP_ECU_MDRAW_BORDER;
  return PHONE_ECU_MDRAW_BORDER;
}

function readEcuRetileBorder(): number {
  const size = readHostSize();
  // Do not multiply border by FOV — zoom-out already multiplies tile count
  // with the logical buffer; a wider border makes Follow lag worse.
  return ecuRetileBorderForView({
    lockMoving: readCameraLockMoving(),
    viewArea: size.w * size.h,
  });
}

/**
 * Stock calls `retile_the_map` every draw. The expensive uncached rebuild only
 * runs when `last_max_*` moves by `mdraw_border * scale`. ECU Follow / pan
 * trips that on phone and desktop; widen the border while we drive the camera.
 */
function installRetileBorderHook(): void {
  const w = window as Window & {
    retile_the_map?: () => void;
    __ecuRetileTheMap?: () => void;
    mdraw_border?: number;
  };
  if (typeof w.__ecuRetileTheMap === "function") return;
  if (typeof w.retile_the_map !== "function") return;
  origRetileTheMap = w.retile_the_map;
  const patched = function (this: unknown): void {
    const prev =
      typeof w.mdraw_border === "number" && Number.isFinite(w.mdraw_border)
        ? w.mdraw_border
        : STOCK_MDRAW_BORDER;
    const want = readEcuRetileBorder();
    if (want > prev) w.mdraw_border = want;
    try {
      if (origRetileTheMap) origRetileTheMap.call(this);
    } finally {
      w.mdraw_border = prev;
    }
  };
  w.__ecuRetileTheMap = patched;
  w.retile_the_map = patched;
}
