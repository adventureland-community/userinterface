/**
 * Boot + persist world zoom for /hub (stock PIXI `scale`).
 * Wheel over the game canvas nudges zoom; Ctrl+wheel left to the browser.
 *
 * Do not re-apply scale while create_map is painting — that races the first
 * tile pass and blacks the canvas. Stock already seeded `scale` from the
 * cookie/URL; we only heal fractional cookies and apply after game_loaded
 * when ECU settings disagree with the host.
 */
import { getSettings, patchSettings } from "../lib/settings";
import {
  WORLD_ZOOM_DEFAULT,
  WORLD_ZOOM_STEP,
  applyWorldZoom,
  clampWorldZoom,
  healFractionalScaleCookie,
  readHostWorldZoom,
  writeWorldZoomCookie,
} from "../lib/worldZoom";

let installed = false;
let appliedOnce = false;
let wheelInstalled = false;
let lastWheelApplyMs = 0;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

type ZoomListener = (zoom: number) => void;
const zoomListeners: ZoomListener[] = [];

const WHEEL_MIN_MS = 80;
const PERSIST_DEBOUNCE_MS = 200;

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
  const preferred =
    typeof savedRaw === "number" ? clampWorldZoom(savedRaw) : WORLD_ZOOM_DEFAULT;

  // Rewrite bad fractional cookies for the *next* refresh.
  healFractionalScaleCookie(
    typeof savedRaw === "number" ? preferred : readHostWorldZoom(),
  );

  // No ECU preference — leave stock URL/cookie scale alone for this session.
  if (typeof savedRaw !== "number") {
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

export function zoomWorldIn(): number {
  return setWorldZoom(readHostWorldZoom() + WORLD_ZOOM_STEP);
}

export function zoomWorldOut(): number {
  return setWorldZoom(readHostWorldZoom() - WORLD_ZOOM_STEP);
}

function rendererView(): Element | null {
  const renderer = (
    window as Window & {
      renderer?: { view?: Element | null };
    }
  ).renderer;
  const view = renderer && renderer.view;
  return view || null;
}

function isUiChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("#comm-ui") ||
    target.closest(".ecu-chrome-stack") ||
    target.closest(".modal") ||
    target.closest(".imodal") ||
    target.closest("#topleftcorner") ||
    target.closest("#bottomleftcorner") ||
    target.closest("#bottomrightcorner") ||
    target.closest("#toprightcorner")
  );
}

function onWorldWheel(ev: WheelEvent): void {
  if (ev.ctrlKey || ev.metaKey) return;
  if (isUiChromeTarget(ev.target)) return;
  const view = rendererView();
  if (!view) return;
  const overCanvas =
    ev.target === view ||
    (ev.target instanceof Node && view.contains(ev.target));
  if (!overCanvas) return;

  const now = Date.now();
  if (now - lastWheelApplyMs < WHEEL_MIN_MS) {
    ev.preventDefault();
    return;
  }

  const before = readHostWorldZoom();
  const next =
    ev.deltaY > 0
      ? before - WORLD_ZOOM_STEP
      : ev.deltaY < 0
        ? before + WORLD_ZOOM_STEP
        : before;
  if (clampWorldZoom(next) === before) {
    return;
  }

  lastWheelApplyMs = now;
  ev.preventDefault();
  setWorldZoom(next);
}

function installWheelZoom(): void {
  if (wheelInstalled) return;
  wheelInstalled = true;
  window.addEventListener("wheel", onWorldWheel, {
    passive: false,
    capture: true,
  });
}

/** Apply saved zoom once the game finished loading; safe to call repeatedly. */
export function installWorldZoom(): void {
  if (installed) return;
  installed = true;
  installWheelZoom();

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
