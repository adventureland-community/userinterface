/**
 * World overlay loop for /comm — attaches Graphics to window.map.
 * Cadence slows on phone; meter/socket trackers are separate and stay live.
 */

import { getEntitiesList, getObserving } from "../host/al";
import type { EntityLike } from "../host/globals";
import { subscribeWorldFov } from "../host/worldFov";
import { subscribeWorldZoom } from "../host/worldZoom";
import { getSettings } from "../lib/settings";
import { scalePollMs } from "../lib/perfPrefs";
import { resolveAbilityTimelineTarget } from "../instance/abilityTimelineModel";
import {
  clearOverlayLabels,
  destroyOverlayHandle,
  ensureOverlayHandle,
  mapOverlayBlocked,
  type OverlayHandle,
} from "./mapHost";
import { resetAnniversaryKissFx } from "./anniversaryKiss";
import {
  paintWorldOverlay,
  worldOverlayNeedsPaint,
} from "./paintWorldOverlay";
import { getVizSettings, subscribeVizSettings } from "./vizSettings";

/** Desktop cadence — vision fog tracks a walking observe target. */
const TICK_MS_DESKTOP = 100;

let rafId: number | null = null;
let loopActive = false;
let lastPaintAt = 0;
let handle: OverlayHandle | null = null;
let unsubSettings: (() => void) | null = null;
let unsubZoom: (() => void) | null = null;
let unsubFov: (() => void) | null = null;
let visBound = false;
let selectedId: string | undefined;
/** After a one-shot clear when all paint features are off. */
let clearedWhileIdle = false;

export function setWorldOverlaySelectedId(id: string | undefined): void {
  selectedId = id;
}

function resolveFocus(entities: EntityLike[]): EntityLike | null {
  return resolveAbilityTimelineTarget(entities, selectedId, getObserving());
}

function overlayTickMs(): number {
  return scalePollMs(TICK_MS_DESKTOP, "ui");
}

function clearHandleOnce(): void {
  if (!handle || clearedWhileIdle) return;
  handle.gfx.clear();
  clearOverlayLabels(handle.labels);
  clearedWhileIdle = true;
}

function tick(): void {
  if (typeof document !== "undefined" && document.hidden) return;
  if (getSettings().worldOverlayEnabled === false) return;
  if (mapOverlayBlocked()) {
    if (handle) {
      destroyOverlayHandle(handle);
      handle = null;
    }
    clearedWhileIdle = false;
    return;
  }
  const settings = getVizSettings();
  if (!worldOverlayNeedsPaint(settings)) {
    handle = ensureOverlayHandle(handle);
    clearHandleOnce();
    return;
  }
  clearedWhileIdle = false;
  handle = ensureOverlayHandle(handle);
  if (!handle) return;
  const entities = getEntitiesList();
  paintWorldOverlay(handle, {
    entities,
    focus: resolveFocus(entities),
    settings,
  });
}

/**
 * Gap-limited rAF while paint features are on. Sleeps when needsPaint is
 * false (or the tab is hidden); wake via settings/zoom/fov/visibility.
 */
function scheduleLoop(): void {
  if (!loopActive || rafId != null) return;
  if (typeof document !== "undefined" && document.hidden) return;
  if (!worldOverlayNeedsPaint(getVizSettings())) return;
  rafId = window.requestAnimationFrame((now) => {
    rafId = null;
    if (!loopActive) return;
    const gap = overlayTickMs();
    if (now - lastPaintAt >= gap) {
      lastPaintAt = now;
      tick();
    }
    scheduleLoop();
  });
}

function wakeLoop(): void {
  if (!loopActive) return;
  tick();
  scheduleLoop();
}

function onOverlayVisibility(): void {
  if (typeof document === "undefined") return;
  if (document.hidden) return;
  wakeLoop();
}

export function startWorldOverlay(): void {
  if (loopActive) return;
  if (getSettings().worldOverlayEnabled === false) return;
  loopActive = true;
  unsubSettings = subscribeVizSettings(() => {
    clearedWhileIdle = false;
    wakeLoop();
  });
  unsubZoom = subscribeWorldZoom(() => wakeLoop());
  unsubFov = subscribeWorldFov(() => wakeLoop());
  if (!visBound && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onOverlayVisibility);
    visBound = true;
  }
  lastPaintAt =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  wakeLoop();
}

export function stopWorldOverlay(): void {
  loopActive = false;
  if (rafId != null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (unsubSettings) {
    unsubSettings();
    unsubSettings = null;
  }
  if (unsubZoom) {
    unsubZoom();
    unsubZoom = null;
  }
  if (unsubFov) {
    unsubFov();
    unsubFov = null;
  }
  destroyOverlayHandle(handle);
  handle = null;
  clearedWhileIdle = false;
  resetAnniversaryKissFx();
}
