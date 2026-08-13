/**
 * Stacking + open defaults for meter windows (Details-like bring-to-front).
 * Z range sits above HUD panels (paperdoll ~36, panelStyle 20/40) and below
 * layout chrome (~80) / Add dialog (90) / guide overlay (LAYOUT_GUIDE_OVERLAY_Z).
 */

import type { MeterInstance } from "./meterTypes";

/** Floor for meter stack — above typical HUD Absolute panels. */
export const METER_STACK_BASE = 50;
/** Soft ceiling before renormalize — below layout-edit chrome / add dialog. */
export const METER_STACK_MAX = 77;
/**
 * Snap guide balls + window-id badges. Above meters (≤77) and toggles (100);
 * pointer-events: none so drag/resize still hit panels underneath.
 */
export const LAYOUT_GUIDE_OVERLAY_Z = 110;

export function maxMeterStackZ(peers: MeterInstance[]): number {
  let max = METER_STACK_BASE - 1;
  for (let i = 0; i < peers.length; i++) {
    const z = peers[i].zIndex;
    if (typeof z === "number" && z > max) max = z;
  }
  return max;
}

/** Next z-index above all peers; compresses peer stack if near ceiling. */
export function nextMeterStackZ(peers: MeterInstance[]): {
  zIndex: number;
  peers: MeterInstance[];
} {
  const max = maxMeterStackZ(peers);
  if (max < METER_STACK_MAX) {
    return { zIndex: max + 1, peers };
  }
  // Rebase existing stack order so we stay under chrome overlays.
  const ranked = peers
    .map((m, i) => ({
      i,
      z: typeof m.zIndex === "number" ? m.zIndex : METER_STACK_BASE - 1,
    }))
    .sort((a, b) => a.z - b.z || a.i - b.i);
  const next = peers.slice();
  for (let r = 0; r < ranked.length; r++) {
    const row = next[ranked[r].i];
    next[ranked[r].i] = { ...row, zIndex: METER_STACK_BASE + r };
  }
  return {
    zIndex: METER_STACK_BASE + ranked.length,
    peers: next,
  };
}

/**
 * New window defaults: unlocked (unless caller set locked), top of stack.
 * Does not mutate existing peers except when stack must renormalize.
 */
export function prepareNewMeterWindow(
  inst: MeterInstance,
  peers: MeterInstance[],
): { inst: MeterInstance; peers: MeterInstance[] } {
  const { zIndex, peers: nextPeers } = nextMeterStackZ(peers);
  return {
    peers: nextPeers,
    inst: {
      ...inst,
      locked: typeof inst.locked === "boolean" ? inst.locked : false,
      zIndex,
    },
  };
}

/** Raise an existing instance without changing lock. No-op if already top. */
export function bringMeterToFront(
  peers: MeterInstance[],
  id: string,
): MeterInstance[] {
  let target: MeterInstance | null = null;
  for (let i = 0; i < peers.length; i++) {
    if (peers[i].id === id) {
      target = peers[i];
      break;
    }
  }
  if (!target) return peers;
  const max = maxMeterStackZ(peers);
  if (
    typeof target.zIndex === "number" &&
    target.zIndex === max &&
    max >= METER_STACK_BASE
  ) {
    return peers;
  }
  const { zIndex, peers: base } = nextMeterStackZ(peers);
  return base.map((m) => (m.id === id ? { ...m, zIndex } : m));
}
