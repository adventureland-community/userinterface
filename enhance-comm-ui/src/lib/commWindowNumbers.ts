/**
 * Stable Comm window numbers (Details meu_id) — one pool for HUD + meters.
 */

import { PANEL_IDS, type PanelId } from "./layout";
import { getSettings, patchSettings } from "./settings";

export type WindowNumberMap = Record<string, number>;

/** Seed HUD panels with stable 1..N so numbers stay recognizable across sessions. */
export function seedHudWindowNumbers(): WindowNumberMap {
  const out: WindowNumberMap = {};
  for (let i = 0; i < PANEL_IDS.length; i++) {
    out[PANEL_IDS[i]] = i + 1;
  }
  return out;
}

function maxAssigned(map: WindowNumberMap): number {
  let max = 0;
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) {
    const n = map[keys[i]];
    if (typeof n === "number" && n > max) max = n;
  }
  return max;
}

/**
 * Ensure every id has a stable number. Mutates settings when anything is missing.
 * Returns the full map (settings + in-memory seeds).
 */
export function ensureWindowNumbers(ids: string[]): WindowNumberMap {
  const s = getSettings();
  const map: WindowNumberMap = {
    ...seedHudWindowNumbers(),
    ...(s.windowNumberById || {}),
  };
  let next = Math.max(
    typeof s.nextWindowNumber === "number" ? s.nextWindowNumber : 1,
    maxAssigned(map) + 1,
  );
  let dirty = false;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (map[id] != null) continue;
    map[id] = next;
    next += 1;
    dirty = true;
  }
  // Keep HUD seeds persisted so reopen is consistent.
  for (let i = 0; i < PANEL_IDS.length; i++) {
    const id = PANEL_IDS[i];
    if (s.windowNumberById && s.windowNumberById[id] === map[id]) continue;
    dirty = true;
  }
  if (dirty || !s.windowNumberById || s.nextWindowNumber !== next) {
    patchSettings({ windowNumberById: map, nextWindowNumber: next });
  }
  return map;
}

export function windowNumberOf(
  map: WindowNumberMap,
  id: string,
): number | undefined {
  return map[id];
}

/** HUD panel default numbers (1-based PANEL_IDS order). */
export function hudWindowNumber(id: PanelId): number {
  for (let i = 0; i < PANEL_IDS.length; i++) {
    if (PANEL_IDS[i] === id) return i + 1;
  }
  return 0;
}
