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
  destroyOverlayHandle,
  ensureOverlayHandle,
  mapOverlayBlocked,
  type OverlayHandle,
} from "./mapHost";
import { resetAnniversaryKissFx } from "./anniversaryKiss";
import { paintWorldOverlay } from "./paintWorldOverlay";
import { subscribeVizSettings } from "./vizSettings";

/** Desktop cadence — vision fog tracks a walking observe target. */
const TICK_MS_DESKTOP = 100;

let timerId: number | null = null;
let handle: OverlayHandle | null = null;
let unsubSettings: (() => void) | null = null;
let unsubZoom: (() => void) | null = null;
let unsubFov: (() => void) | null = null;
let selectedId: string | undefined;

export function setWorldOverlaySelectedId(id: string | undefined): void {
  selectedId = id;
}

function resolveFocus(entities: EntityLike[]): EntityLike | null {
  return resolveAbilityTimelineTarget(entities, selectedId, getObserving());
}

function overlayTickMs(): number {
  return scalePollMs(TICK_MS_DESKTOP, "ui");
}

function tick(): void {
  if (getSettings().worldOverlayEnabled === false) return;
  if (mapOverlayBlocked()) {
    if (handle) {
      destroyOverlayHandle(handle);
      handle = null;
    }
    return;
  }
  handle = ensureOverlayHandle(handle);
  if (!handle) return;
  const entities = getEntitiesList();
  paintWorldOverlay(handle, {
    entities,
    focus: resolveFocus(entities),
  });
}

export function startWorldOverlay(): void {
  if (timerId != null) return;
  if (getSettings().worldOverlayEnabled === false) return;
  unsubSettings = subscribeVizSettings(() => tick());
  unsubZoom = subscribeWorldZoom(() => tick());
  unsubFov = subscribeWorldFov(() => tick());
  tick();
  timerId = window.setInterval(tick, overlayTickMs());
}

export function stopWorldOverlay(): void {
  if (timerId != null) {
    window.clearInterval(timerId);
    timerId = null;
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
  resetAnniversaryKissFx();
}
