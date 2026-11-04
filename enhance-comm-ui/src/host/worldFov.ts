/**
 * FOV zoom host — wheel / pinch / Map chip without mutating stock `scale`.
 */

import { getSettings, patchSettings } from "../lib/settings";
import { detectViewportProfile } from "../lib/viewport";
import {
  WORLD_FOV_DEFAULT,
  WORLD_FOV_MAX,
  WORLD_FOV_MIN,
  WORLD_FOV_STEP,
  applyWorldFov,
  clampWorldFov,
  readAppliedWorldFov,
} from "../lib/worldFov";

let installed = false;
let appliedOnce = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let resizeHooked = false;

type FovListener = (fov: number) => void;
const listeners: FovListener[] = [];

const PERSIST_DEBOUNCE_MS = 200;

function notify(fov: number): void {
  for (let i = 0; i < listeners.length; i++) listeners[i](fov);
}

export function subscribeWorldFov(listener: FovListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function persistFov(fov: number): void {
  if (persistTimer != null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    patchSettings({ worldFov: fov });
  }, PERSIST_DEBOUNCE_MS);
}

export function setWorldFov(next: number): number {
  const before = readAppliedWorldFov();
  const fov = applyWorldFov(next);
  if (fov !== before) {
    persistFov(fov);
    notify(fov);
  } else {
    // Still re-fit in case the window size changed under us.
    applyWorldFov(fov);
  }
  return fov;
}

export function zoomFovOut(): number {
  return setWorldFov(readAppliedWorldFov() + WORLD_FOV_STEP);
}

export function zoomFovIn(): number {
  return setWorldFov(readAppliedWorldFov() - WORLD_FOV_STEP);
}

function preferredBootFov(): number {
  const saved = getSettings().worldFov;
  if (typeof saved === "number") return clampWorldFov(saved);
  // Phone: slightly wider FOV so more map fits without lowering sprite scale.
  return detectViewportProfile() === "phone" ? 1.5 : WORLD_FOV_DEFAULT;
}

function gameLoaded(): boolean {
  return !!(window as Window & { game_loaded?: boolean }).game_loaded;
}

function tryApplySaved(): boolean {
  const map = (window as Window & { map?: unknown }).map;
  const renderer = (window as Window & { renderer?: unknown }).renderer;
  if (!map || !renderer || !gameLoaded()) return false;
  const preferred = preferredBootFov();
  applyWorldFov(preferred);
  appliedOnce = true;
  notify(preferred);
  return true;
}

function installResizeHook(): void {
  if (resizeHooked) return;
  resizeHooked = true;
  const w = window as Window & {
    on_resize?: (...args: unknown[]) => void;
    __ecuOnResize?: (...args: unknown[]) => void;
  };
  if (typeof w.__ecuOnResize === "function") return;
  const prev = w.on_resize;
  const hooked = function (this: unknown, ...args: unknown[]) {
    if (typeof prev === "function") {
      prev.apply(this, args);
    }
    // Stock just set width/height = window; re-expand to FOV logical size.
    applyWorldFov(readAppliedWorldFov());
  };
  w.__ecuOnResize = hooked;
  w.on_resize = hooked;
}

/** Apply saved FOV once the game finished loading; safe to call repeatedly. */
export function installWorldFov(): void {
  if (installed) return;
  installed = true;
  installResizeHook();

  if (tryApplySaved()) return;

  const started = Date.now();
  const poll = window.setInterval(() => {
    if (tryApplySaved() || Date.now() - started > 60000) {
      window.clearInterval(poll);
    }
  }, 250);
}

export function isWorldFovApplied(): boolean {
  return appliedOnce;
}

export {
  WORLD_FOV_DEFAULT,
  WORLD_FOV_MAX,
  WORLD_FOV_MIN,
  WORLD_FOV_STEP,
  clampWorldFov,
  readAppliedWorldFov,
};
