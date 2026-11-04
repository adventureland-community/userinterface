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

type FreeListener = (free: boolean) => void;
const freeListeners: FreeListener[] = [];

function notifyFree(): void {
  for (let i = 0; i < freeListeners.length; i++) freeListeners[i](freeCamera);
}

export function subscribeFreeCamera(listener: FreeListener): () => void {
  freeListeners.push(listener);
  return () => {
    const idx = freeListeners.indexOf(listener);
    if (idx >= 0) freeListeners.splice(idx, 1);
  };
}

export function isFreeCamera(): boolean {
  return freeCamera;
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

/** Enter free camera at the current map position (idempotent). */
export function unlockCamera(): void {
  syncFreeCameraAfterRealmChange();
  if (!freeCamera) {
    syncLockFromMap();
    // Freeze vision-hole anchor at the observer position before we pan away.
    observerAnchorX = lockX;
    observerAnchorY = lockY;
    hasObserverAnchor = true;
    freeCamRealmKey = readCameraRealmKey();
    freeCamera = true;
    notifyFree();
  }
  ensureRaf();
}

/** Reattach camera to observe follow (call before or with o:home). */
export function lockCamera(): void {
  freeCamera = false;
  stickPan = { x: 0, y: 0 };
  keyUp = keyDown = keyLeft = keyRight = false;
  freeCamRealmKey = "";
  endMousePan();
  stopRafIfIdle();
  notifyFree();
  // Next unlock will re-capture; while locked, vision follows live entity/map.
  hasObserverAnchor = false;
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
 * Apply a one-shot world-space nudge (mouse drag). Calls stock position_map
 * so tiles catch up the same frame.
 */
export function panCameraByWorldDelta(dx: number, dy: number): void {
  if (!(Number.isFinite(dx + dy)) || (dx === 0 && dy === 0)) return;
  unlockCamera();
  const map = hostMap();
  if (!map) return;
  lockX += dx;
  lockY += dy;
  map.real_x = lockX;
  map.real_y = lockY;
  const pos = (window as Window & { position_map?: () => void }).position_map;
  if (typeof pos === "function") {
    try {
      pos();
    } catch {
      /* ignore */
    }
  }
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
 * Keep free-cam lock across stock `position_map` / `draw`.
 * Temporarily clear `character` so stock does not yank `map.real_*` back
 * while still running the map.x/y + dtile path on our lock.
 */
function patchedPositionMap(this: unknown): void {
  syncFreeCameraAfterRealmChange();
  const map = hostMap();
  const w = window as Window & { character?: unknown };
  if (freeCamera && map) {
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
  if (freeCamera && map) {
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
  if (typeof w.__ecuPositionMap === "function") return;
  if (typeof w.position_map !== "function") return;
  origPositionMap = w.position_map;
  w.__ecuPositionMap = patchedPositionMap;
  w.position_map = patchedPositionMap;
}

/**
 * Follow chrome — re-lock free camera, snap to the live observer, then o:home.
 * Snapping first avoids landing on stale free-cam lock coords after a map hop.
 */
export function followObservedCamera(): void {
  lockCamera();
  const map = hostMap();
  const at = readObservedWorldXY();
  if (map && at) {
    lockX = at.x;
    lockY = at.y;
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
  } else {
    syncLockFromMap();
  }
  const sock = window.socket as { emit?: (e: string) => void } | undefined;
  if (sock && typeof sock.emit === "function") sock.emit("o:home");
  window.setTimeout(() => {
    if (!freeCamera) {
      const again = readObservedWorldXY();
      const m = hostMap();
      if (m && again) {
        lockX = again.x;
        lockY = again.y;
        m.real_x = again.x;
        m.real_y = again.y;
      } else {
        syncLockFromMap();
      }
    }
  }, 400);
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
  // Map/server hops while free-cam would keep writing old lock coords.
  const realmPoll = window.setInterval(() => {
    syncFreeCameraAfterRealmChange();
  }, 250);
  void realmPoll;
  (window as Window & { __ecuFollowObserved?: () => void }).__ecuFollowObserved =
    followObservedCamera;
}

export function isCameraPanInstalled(): boolean {
  return installed;
}

/** Test seam — stock-like change detection for map.x/y. */
export function stockMapScreenWouldChange(
  map: { x?: number; y?: number; real_x: number; real_y: number },
  width: number,
  height: number,
  scale: number,
): boolean {
  const x = Math.round(width / 2.0 - map.real_x * scale);
  const y = Math.round(height / 2.0 - map.real_y * scale);
  return map.x !== x || map.y !== y;
}
