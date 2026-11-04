/**
 * Boot + persist stock PIXI `scale` (sprite density), and route wheel/pinch
 * to camera FOV zoom (`worldFov`) so zooming does not change render scale.
 *
 * Do not re-apply scale while create_map is painting — that races the first
 * tile pass and blacks the canvas. Stock already seeded `scale` from the
 * cookie/URL; we only heal fractional cookies and apply after game_loaded
 * when ECU settings disagree with the host.
 */
import { getSettings, patchSettings } from "../lib/settings";
import { detectViewportProfile } from "../lib/viewport";
import {
  WORLD_FOV_STEP,
  clampWorldFov,
  readAppliedWorldFov,
} from "../lib/worldFov";
import {
  WORLD_ZOOM_DEFAULT,
  WORLD_ZOOM_MIN,
  applyWorldZoom,
  clampWorldZoom,
  healFractionalScaleCookie,
  readHostWorldZoom,
  writeWorldZoomCookie,
} from "../lib/worldZoom";
import {
  installWorldFov,
  setWorldFov,
  zoomFovIn,
  zoomFovOut,
} from "./worldFov";

let installed = false;
let appliedOnce = false;
let wheelInstalled = false;
let pinchInstalled = false;
let lastWheelApplyMs = 0;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pinchStartDist = 0;
let pinchBaseFov = 1;
/** DevTools Shift+drag pinch (Chrome often emits only one touch). */
let shiftPinchActive = false;
let shiftPinchStartY = 0;
let shiftPinchBaseFov = 1;

type ZoomListener = (zoom: number) => void;
const zoomListeners: ZoomListener[] = [];

const WHEEL_MIN_MS = 80;
const PERSIST_DEBOUNCE_MS = 200;
/** Pinch ratio must cross this vs start before an integer zoom step. */
const PINCH_STEP_RATIO = 1.12;
/** Pixels of Shift+drag (DevTools pinch) per world-zoom step. */
export const SHIFT_PINCH_PX_PER_STEP = 72;

/**
 * Drag up → zoom in (tighter FOV); drag down → zoom out (wider FOV).
 * Positive return = zoom-in steps for the caller to subtract from FOV.
 */
export function shiftDragZoomSteps(startY: number, currentY: number): number {
  return Math.trunc((startY - currentY) / SHIFT_PINCH_PX_PER_STEP);
}

/** Map chip — FOV wider (see more). */
export function zoomWorldOut(): number {
  return zoomFovOut();
}

/** Map chip — FOV tighter (see less). */
export function zoomWorldIn(): number {
  return zoomFovIn();
}

function notifyZoomListeners(zoom: number): void {
  for (let i = 0; i < zoomListeners.length; i++) zoomListeners[i](zoom);
}

/** Map chip / overlays subscribe — fires after every applied zoom change. */
export function subscribeWorldZoom(listener: ZoomListener): () => void {
  zoomListeners.push(listener);
  return () => {
    const idx = zoomListeners.indexOf(listener);
    if (idx >= 0) zoomListeners.splice(idx, 1);
  };
}

function gameLoaded(): boolean {
  return !!(window as Window & { game_loaded?: boolean }).game_loaded;
}

function tryApplySaved(): boolean {
  const map = (window as Window & { map?: unknown }).map;
  if (!map || !gameLoaded()) return false;

  const savedRaw = getSettings().worldZoom;
  const phoneDefault =
    detectViewportProfile() === "phone" ? WORLD_ZOOM_MIN : WORLD_ZOOM_DEFAULT;
  const preferred =
    typeof savedRaw === "number" ? clampWorldZoom(savedRaw) : phoneDefault;

  // Rewrite bad fractional cookies for the *next* refresh.
  healFractionalScaleCookie(
    typeof savedRaw === "number" ? preferred : readHostWorldZoom(),
  );

  // No ECU preference — on phone seed zoom-out so more map fits; desktop
  // leaves stock URL/cookie scale alone for this session.
  if (typeof savedRaw !== "number") {
    if (detectViewportProfile() === "phone") {
      if (readHostWorldZoom() !== preferred) {
        applyWorldZoom(preferred);
        persistZoom(preferred);
        notifyZoomListeners(preferred);
      } else {
        writeWorldZoomCookie(preferred);
      }
    }
    appliedOnce = true;
    return true;
  }

  // Already matches what the page loaded with — do not invalidate tiles.
  if (readHostWorldZoom() === preferred) {
    writeWorldZoomCookie(preferred);
    appliedOnce = true;
    return true;
  }

  applyWorldZoom(preferred);
  writeWorldZoomCookie(preferred);
  appliedOnce = true;
  return true;
}

function persistZoom(zoom: number): void {
  writeWorldZoomCookie(zoom);
  if (persistTimer != null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    patchSettings({ worldZoom: zoom });
  }, PERSIST_DEBOUNCE_MS);
}

/** Set zoom from UI; updates host, cookie, and (debounced) ECU settings. */
export function setWorldZoom(next: number): number {
  const before = readHostWorldZoom();
  const zoom = applyWorldZoom(next);
  if (zoom !== before) {
    persistZoom(zoom);
    notifyZoomListeners(zoom);
  }
  return zoom;
}

function rendererView(): Element | null {
  const renderer = (
    window as Window & {
      renderer?: { view?: Element | null };
    }
  ).renderer;
  if (renderer && renderer.view) return renderer.view;
  // Fallbacks when stock host has not exposed renderer.view yet.
  const stage =
    document.getElementById("stage") ||
    document.getElementById("game") ||
    document.body;
  if (stage) {
    const nested = stage.querySelector("canvas");
    if (nested) return nested;
  }
  const all = document.querySelectorAll("canvas");
  let best: Element | null = null;
  let bestArea = 0;
  for (let i = 0; i < all.length; i++) {
    const c = all[i];
    const r = c.getBoundingClientRect();
    const area = Math.max(0, r.width) * Math.max(0, r.height);
    if (area > bestArea) {
      bestArea = area;
      best = c;
    }
  }
  return best;
}

/** Panels / dock / modals — never steal wheel or pinch from these. */
function isInteractiveChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-ecu-phone-dock]") ||
    target.closest(".ecu-phone-sheet") ||
    target.closest(".ecu-phone-shade") ||
    target.closest(".ecu-phone-sheet-scrim") ||
    target.closest(".ecu-phone-shade-scrim") ||
    target.closest("[data-panel]") ||
    target.closest(".ecu-meter-shell") ||
    target.closest(".ecu-chrome-stack") ||
    target.closest(".modal") ||
    target.closest(".imodal") ||
    target.closest("#bottomleftcorner") ||
    target.closest("#bottomrightcorner") ||
    target.closest("input, textarea, select, [contenteditable='true']") ||
    target.closest(".CodeMirror")
  );
}

/**
 * Broader chrome check for plain (non-pinch) wheel — include the ECU root so
 * scrolling over empty HUD space does not zoom.
 */
function isUiChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (isInteractiveChromeTarget(target)) return true;
  return !!(
    target.closest("#comm-ui") ||
    target.closest("#topleftcorner") ||
    target.closest("#toprightcorner")
  );
}

function pointOverCanvas(clientX: number, clientY: number): boolean {
  const view = rendererView();
  if (!view) return false;
  const r = view.getBoundingClientRect();
  return (
    clientX >= r.left &&
    clientX <= r.right &&
    clientY >= r.top &&
    clientY <= r.bottom
  );
}

function targetOnCanvas(target: EventTarget | null): boolean {
  const view = rendererView();
  if (!view) return false;
  return (
    target === view ||
    (target instanceof Node && view.contains(target))
  );
}

function onWorldWheel(ev: WheelEvent): void {
  const phone = detectViewportProfile() === "phone";
  // Desktop: leave modifier+wheel to the browser. Phone / DevTools device
  // mode: Ctrl/Meta/Shift+wheel simulate pinch — map to world zoom.
  const pinchSim =
    phone && (ev.ctrlKey || ev.metaKey || ev.shiftKey);
  if ((ev.ctrlKey || ev.metaKey) && !phone) return;
  if (isInteractiveChromeTarget(ev.target)) return;
  // Pinch-sim: zoom whenever the cursor is over the map rect (HUD root may
  // be the event target even with pointer-events:none ancestors).
  if (pinchSim) {
    if (!pointOverCanvas(ev.clientX, ev.clientY)) return;
  } else {
    if (isUiChromeTarget(ev.target)) return;
    if (!targetOnCanvas(ev.target) && !pointOverCanvas(ev.clientX, ev.clientY)) {
      return;
    }
  }

  const now = Date.now();
  if (now - lastWheelApplyMs < WHEEL_MIN_MS) {
    ev.preventDefault();
    return;
  }

  // Wheel down → wider FOV (out); wheel up → tighter FOV (in).
  const before = readAppliedWorldFov();
  const next =
    ev.deltaY > 0
      ? before + WORLD_FOV_STEP
      : ev.deltaY < 0
        ? before - WORLD_FOV_STEP
        : before;
  if (clampWorldFov(next) === before) {
    return;
  }

  lastWheelApplyMs = now;
  ev.preventDefault();
  setWorldFov(next);
}

function touchDistance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Pure — midpoint of two touches inside a canvas rect? */
export function pinchMidpointInRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rect: { left: number; right: number; top: number; bottom: number },
): boolean {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  return (
    mx >= rect.left &&
    mx <= rect.right &&
    my >= rect.top &&
    my <= rect.bottom
  );
}

/**
 * True when a two-finger gesture should drive world zoom.
 * Uses pinch midpoint so a full-screen transparent #comm-ui does not block.
 */
export function pinchOverCanvas(ev: TouchEvent): boolean {
  if (ev.touches.length < 2) {
    if (isInteractiveChromeTarget(ev.target)) return false;
    return targetOnCanvas(ev.target);
  }
  const a = ev.touches[0];
  const b = ev.touches[1];
  // Both fingers on dock/sheet/panel → leave alone.
  if (typeof document !== "undefined" && document.elementFromPoint) {
    const elA = document.elementFromPoint(a.clientX, a.clientY);
    const elB = document.elementFromPoint(b.clientX, b.clientY);
    if (isInteractiveChromeTarget(elA) && isInteractiveChromeTarget(elB)) {
      return false;
    }
  }
  const view = rendererView();
  if (!view) return false;
  return pinchMidpointInRect(
    a.clientX,
    a.clientY,
    b.clientX,
    b.clientY,
    view.getBoundingClientRect(),
  );
}

function pointAllowsMapZoom(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
): boolean {
  if (isInteractiveChromeTarget(target)) {
    return pointOverCanvas(clientX, clientY);
  }
  return targetOnCanvas(target) || pointOverCanvas(clientX, clientY);
}

function onPinchStart(ev: TouchEvent): void {
  // Real two-finger pinch.
  if (ev.touches.length === 2) {
    shiftPinchActive = false;
    if (!pinchOverCanvas(ev)) return;
    pinchStartDist = touchDistance(ev.touches[0], ev.touches[1]);
    pinchBaseFov = readAppliedWorldFov();
    return;
  }
  // Chrome DevTools: Shift+drag emits a single touch with shiftKey, not two.
  if (
    ev.touches.length === 1 &&
    ev.shiftKey &&
    detectViewportProfile() === "phone"
  ) {
    const t = ev.touches[0];
    if (!pointAllowsMapZoom(ev.target, t.clientX, t.clientY)) return;
    pinchStartDist = 0;
    shiftPinchActive = true;
    shiftPinchStartY = t.clientY;
    shiftPinchBaseFov = readAppliedWorldFov();
  }
}

function onPinchMove(ev: TouchEvent): void {
  // DevTools Shift+drag pinch (one finger; started with Shift held).
  if (shiftPinchActive && ev.touches.length === 1) {
    const t = ev.touches[0];
    const steps = shiftDragZoomSteps(shiftPinchStartY, t.clientY);
    if (steps === 0) {
      ev.preventDefault();
      return;
    }
    // steps>0 = drag up = zoom in = lower FOV
    const next = clampWorldFov(shiftPinchBaseFov - steps * WORLD_FOV_STEP);
    ev.preventDefault();
    if (next !== readAppliedWorldFov()) setWorldFov(next);
    shiftPinchBaseFov = next;
    shiftPinchStartY = t.clientY;
    return;
  }

  if (ev.touches.length !== 2 || pinchStartDist <= 0) return;
  if (!pinchOverCanvas(ev)) return;
  const dist = touchDistance(ev.touches[0], ev.touches[1]);
  if (dist <= 0) return;
  const ratio = dist / pinchStartDist;
  let step = 0;
  // Fingers apart → wider FOV; pinch together → tighter.
  if (ratio >= PINCH_STEP_RATIO) step = 1;
  else if (ratio <= 1 / PINCH_STEP_RATIO) step = -1;
  if (step === 0) return;
  const next = clampWorldFov(pinchBaseFov + step * WORLD_FOV_STEP);
  if (next === readAppliedWorldFov()) {
    ev.preventDefault();
    return;
  }
  ev.preventDefault();
  setWorldFov(next);
  pinchBaseFov = next;
  pinchStartDist = dist;
}

function onPinchEnd(ev: TouchEvent): void {
  if (ev.touches.length < 2) {
    pinchStartDist = 0;
  }
  if (ev.touches.length === 0) {
    shiftPinchActive = false;
  }
}

/**
 * Pointer fallback for Shift+drag when DevTools does not synthesize touches
 * (e.g. Mobile (no touch) / some Chrome builds).
 */
function onShiftPointerDown(ev: PointerEvent): void {
  if (detectViewportProfile() !== "phone") return;
  if (!ev.shiftKey || ev.button !== 0) return;
  if (ev.pointerType === "touch") return; // touch path owns these
  if (!pointAllowsMapZoom(ev.target, ev.clientX, ev.clientY)) return;
  shiftPinchActive = true;
  shiftPinchStartY = ev.clientY;
  shiftPinchBaseFov = readAppliedWorldFov();
}

function onShiftPointerMove(ev: PointerEvent): void {
  if (!shiftPinchActive || !ev.shiftKey) return;
  if (ev.pointerType === "touch") return;
  const steps = shiftDragZoomSteps(shiftPinchStartY, ev.clientY);
  if (steps === 0) {
    ev.preventDefault();
    return;
  }
  const next = clampWorldFov(shiftPinchBaseFov - steps * WORLD_FOV_STEP);
  ev.preventDefault();
  if (next !== readAppliedWorldFov()) setWorldFov(next);
  shiftPinchBaseFov = next;
  shiftPinchStartY = ev.clientY;
}

function onShiftPointerUp(): void {
  shiftPinchActive = false;
}

function installWheelZoom(): void {
  if (wheelInstalled) return;
  wheelInstalled = true;
  window.addEventListener("wheel", onWorldWheel, {
    passive: false,
    capture: true,
  });
}

function installPinchZoom(): void {
  if (pinchInstalled) return;
  pinchInstalled = true;
  window.addEventListener("touchstart", onPinchStart, {
    passive: true,
    capture: true,
  });
  window.addEventListener("touchmove", onPinchMove, {
    passive: false,
    capture: true,
  });
  window.addEventListener("touchend", onPinchEnd, {
    passive: true,
    capture: true,
  });
  window.addEventListener("touchcancel", onPinchEnd, {
    passive: true,
    capture: true,
  });
  // Shift+drag without touch synthesis (pointer path).
  window.addEventListener("pointerdown", onShiftPointerDown, {
    passive: true,
    capture: true,
  });
  window.addEventListener("pointermove", onShiftPointerMove, {
    passive: false,
    capture: true,
  });
  window.addEventListener("pointerup", onShiftPointerUp, {
    passive: true,
    capture: true,
  });
  window.addEventListener("pointercancel", onShiftPointerUp, {
    passive: true,
    capture: true,
  });
}

/** Apply saved zoom once the game finished loading; safe to call repeatedly. */
export function installWorldZoom(): void {
  if (installed) return;
  installed = true;
  installWheelZoom();
  installPinchZoom();
  installWorldFov();

  // Heal cookie ASAP so the *next* refresh is safe even if game_loaded is late.
  const saved = getSettings().worldZoom;
  healFractionalScaleCookie(
    typeof saved === "number" ? saved : WORLD_ZOOM_DEFAULT,
  );

  if (tryApplySaved()) return;

  const started = Date.now();
  const poll = window.setInterval(() => {
    if (tryApplySaved() || Date.now() - started > 60000) {
      window.clearInterval(poll);
    }
  }, 250);
}

export function isWorldZoomApplied(): boolean {
  return appliedOnce;
}
