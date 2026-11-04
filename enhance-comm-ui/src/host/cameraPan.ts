/**
 * Free camera on /comm — WASD + joystick pan; ignore observe snaps while free.
 */

import {
  CAMERA_PAN_SPEED,
  keysToPan,
  stepCameraPan,
  type CameraPanVec,
} from "../lib/cameraPan";
import { readAppliedWorldFov } from "../lib/worldFov";
import { detectViewportProfile } from "../lib/viewport";

let installed = false;
let freeCamera = false;
let lockX = 0;
let lockY = 0;
let keyUp = false;
let keyDown = false;
let keyLeft = false;
let keyRight = false;
let stickPan: CameraPanVec = { x: 0, y: 0 };
let rafId: number | null = null;
let lastTs = 0;
let origPositionMap: (() => void) | null = null;

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

function readScale(): number {
  const s = (window as Window & { scale?: number }).scale;
  return typeof s === "number" && s > 0 ? s : 2;
}

function readSize(): { w: number; h: number } {
  const w = (window as Window & { width?: number; height?: number }).width;
  const h = (window as Window & { height?: number }).height;
  return {
    w: typeof w === "number" && w > 0 ? w : window.innerWidth || 1280,
    h: typeof h === "number" && h > 0 ? h : window.innerHeight || 720,
  };
}

function roundCoord(n: number): number {
  return Math.round(n);
}

function applyMapScreen(map: HostMap): void {
  const { w, h } = readSize();
  const scale = readScale();
  const rx = typeof map.real_x === "number" ? map.real_x : 0;
  const ry = typeof map.real_y === "number" ? map.real_y : 0;
  map.x = roundCoord(w / 2.0 - rx * scale);
  map.y = roundCoord(h / 2.0 - ry * scale);
}

function syncLockFromMap(): void {
  const map = hostMap();
  if (!map) return;
  if (typeof map.real_x === "number") lockX = map.real_x;
  if (typeof map.real_y === "number") lockY = map.real_y;
}

/** Enter free camera at the current map position (idempotent). */
export function unlockCamera(): void {
  syncLockFromMap();
  if (!freeCamera) {
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
  stopRafIfIdle();
  notifyFree();
}

/**
 * Nudge camera in world space. Activates free mode.
 * pan is a unit vector (screen: +x right, +y down).
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
  applyMapScreen(map);
  const pos = (window as Window & { position_map?: () => void }).position_map;
  if (typeof pos === "function") pos();
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

function typingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return !!el.closest(
    "input, textarea, select, [contenteditable='true'], .CodeMirror, .comm-bag-ctx, .ecu-phone-action-sheet",
  );
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

function tick(ts: number): void {
  rafId = null;
  const pan = combinedPan();
  if (pan.x === 0 && pan.y === 0) {
    lastTs = 0;
    return;
  }
  const prev = lastTs || ts;
  lastTs = ts;
  const dt = Math.min(0.05, Math.max(0, (ts - prev) / 1000));
  panCamera(pan, dt);
  ensureRaf();
}

function ensureRaf(): void {
  if (rafId != null) return;
  const pan = combinedPan();
  if (pan.x === 0 && pan.y === 0 && !freeCamera) return;
  if (pan.x === 0 && pan.y === 0) return;
  lastTs = 0;
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

function patchedPositionMap(this: unknown): void {
  const map = hostMap();
  if (freeCamera && map) {
    map.real_x = lockX;
    map.real_y = lockY;
  }
  if (origPositionMap) origPositionMap.call(this);
  if (freeCamera && map) {
    map.real_x = lockX;
    map.real_y = lockY;
    applyMapScreen(map);
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
 * Follow chrome — re-lock free camera and ask the server to home.
 */
export function followObservedCamera(): void {
  lockCamera();
  const sock = window.socket as { emit?: (e: string) => void } | undefined;
  if (sock && typeof sock.emit === "function") sock.emit("o:home");
  // After o:home / new_map, adopt the snapped coords once unlocked.
  window.setTimeout(() => {
    if (!freeCamera) syncLockFromMap();
  }, 400);
}

export function installCameraPan(): void {
  if (installed) return;
  installed = true;
  installPositionMapHook();
  // position_map may appear after game_loaded — poll briefly.
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
  // Blur clears stuck keys.
  window.addEventListener("blur", () => {
    keyUp = keyDown = keyLeft = keyRight = false;
    stopRafIfIdle();
  });
  (window as Window & { __ecuFollowObserved?: () => void }).__ecuFollowObserved =
    followObservedCamera;
  void detectViewportProfile;
}

export function isCameraPanInstalled(): boolean {
  return installed;
}
