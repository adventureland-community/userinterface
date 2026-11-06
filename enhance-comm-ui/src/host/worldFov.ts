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
  applyPhoneWorldCover,
  applyWorldFov,
  cameraRealAfterFovTowardCursor,
  clampWorldFov,
  clampWorldFovForDisplay,
  readAppliedWorldFov,
  readWindowCssSize,
} from "../lib/worldFov";
import { readHostWorldZoom } from "../lib/worldZoom";
import { setCameraWorldXY, unlockCamera } from "./cameraPan";
import { installViewportRefit } from "./viewportRefit";

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

/**
 * Wheel / pinch FOV zoom that keeps the world under the pointer stable.
 * Enters free-cam so Follow does not yank the view mid-zoom.
 * Anchors using the buffer size *after* apply — GPU texture caps can shrink
 * the requested logical size; pre-computing from uncapped FOV caused a pan.
 */
export function setWorldFovTowardClient(
  next: number,
  clientX: number,
  clientY: number,
): number {
  const before = readAppliedWorldFov();
  const css = readWindowCssSize();
  const after = clampWorldFovForDisplay(next, css.w, css.h);
  if (after === before) {
    return setWorldFov(after);
  }

  const host = window as Window & {
    width?: number;
    height?: number;
    map?: { real_x?: number; real_y?: number };
    renderer?: { view?: HTMLElement | null };
  };
  const map = host.map;
  const view = host.renderer && host.renderer.view;
  const realX =
    map && typeof map.real_x === "number" && Number.isFinite(map.real_x)
      ? map.real_x
      : 0;
  const realY =
    map && typeof map.real_y === "number" && Number.isFinite(map.real_y)
      ? map.real_y
      : 0;

  const w0 =
    typeof host.width === "number" && host.width > 0 ? host.width : css.w;
  const h0 =
    typeof host.height === "number" && host.height > 0 ? host.height : css.h;

  let fracX = 0.5;
  let fracY = 0.5;
  if (view && typeof view.getBoundingClientRect === "function") {
    const r = view.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      fracX = (clientX - r.left) / r.width;
      fracY = (clientY - r.top) / r.height;
    }
  }

  // Leave Follow before resize — position_map would otherwise snap mid-zoom.
  unlockCamera();
  const fov = setWorldFov(after);
  const w1 =
    typeof host.width === "number" && host.width > 0 ? host.width : w0;
  const h1 =
    typeof host.height === "number" && host.height > 0 ? host.height : h0;
  // Buffer did not grow (GPU cap / same size) — do not shift the camera.
  if (w1 === w0 && h1 === h0) {
    return fov;
  }
  const anchored = cameraRealAfterFovTowardCursor({
    realX,
    realY,
    scale: readHostWorldZoom(),
    widthBefore: w0,
    heightBefore: h0,
    widthAfter: w1,
    heightAfter: h1,
    fracX,
    fracY,
  });
  setCameraWorldXY(anchored.x, anchored.y);
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
  // Phone: start at 1× (not 1.5× wider) so sprites fill the tall frame;
  // cover CSS still crops gutters. Nameplates stay sharp via sharpness pass.
  return WORLD_FOV_DEFAULT;
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

/**
 * Phone→desktop races can leave `ecu-phone-dock-on` / cover scale after the
 * dock unmounts. Re-scrub cheaply while Comm UI is desktop/tablet.
 */
function installDesktopPhoneChromeWatchdog(): void {
  window.setInterval(() => {
    try {
      const comm = document.getElementById("comm-ui");
      const vp = comm && comm.getAttribute("data-viewport");
      if (vp !== "desktop" && vp !== "tablet") return;
      const dockOn = document.documentElement.classList.contains(
        "ecu-phone-dock-on",
      );
      const view = (
        window as Window & {
          renderer?: { view?: HTMLElement | null };
        }
      ).renderer?.view;
      const st = view && view.style;
      const coverLeaked =
        !!st &&
        (st.position === "fixed" ||
          (typeof st.transform === "string" &&
            st.transform.indexOf("scale(") !== -1) ||
          (typeof view.getAttribute === "function" &&
            view.getAttribute("data-ecu-phone-cover") === "1"));
      if (!dockOn && !coverLeaked) return;
      const { w, h } = readWindowCssSize();
      applyPhoneWorldCover(w, h);
    } catch {
      /* ignore */
    }
  }, 2000);
}

/** Apply saved FOV once the game finished loading; safe to call repeatedly. */
export function installWorldFov(): void {
  if (installed) return;
  installed = true;
  installResizeHook();
  installViewportRefit();
  installDesktopPhoneChromeWatchdog();

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
