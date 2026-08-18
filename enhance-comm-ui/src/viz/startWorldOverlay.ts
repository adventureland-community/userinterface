/**
 * ~4 Hz world overlay loop for /comm — attaches Graphics to window.map.
 */

import { getEntitiesList, getObserving } from "../host/al";
import type { EntityLike } from "../host/globals";
import { resolveAbilityTimelineTarget } from "../instance/abilityTimelineModel";
import {
  destroyOverlayHandle,
  ensureOverlayHandle,
  mapOverlayBlocked,
  type OverlayHandle,
} from "./mapHost";
import { paintWorldOverlay } from "./paintWorldOverlay";
import { subscribeVizSettings } from "./vizSettings";

const TICK_MS = 250;

let timerId: number | null = null;
let handle: OverlayHandle | null = null;
let unsubSettings: (() => void) | null = null;
let selectedId: string | undefined;

export function setWorldOverlaySelectedId(id: string | undefined): void {
  selectedId = id;
}

function resolveFocus(entities: EntityLike[]): EntityLike | null {
  return resolveAbilityTimelineTarget(entities, selectedId, getObserving());
}

function tick(): void {
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
  unsubSettings = subscribeVizSettings(() => tick());
  tick();
  timerId = window.setInterval(tick, TICK_MS);
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
  destroyOverlayHandle(handle);
  handle = null;
}
