/**
 * Stacking + open defaults for meter / HUD windows (Details-like bring-to-front).
 * Z range sits above idle HUD Absolute panels (panelStyle 20/40) and below
 * layout chrome (80) / Add dialog (90) / toggles (100) / guide overlay.
 */

import type { MeterInstance } from "./meterTypes";

/** Floor for window stack — above typical idle HUD Absolute panels. */
export const METER_STACK_BASE = 50;
/** Soft ceiling before renormalize — below layout-edit chrome (80). */
export const METER_STACK_MAX = 79;
/**
 * Snap guide balls + window-id badges. Above window stack (≤79) and toggles (100);
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

/** Highest z among a sparse id→z map (HUD bring-to-front). */
export function maxRecordStackZ(
  zs: Record<string, number | undefined> | null | undefined,
): number {
  if (!zs) return METER_STACK_BASE - 1;
  let max = METER_STACK_BASE - 1;
  const keys = Object.keys(zs);
  for (let i = 0; i < keys.length; i++) {
    const z = zs[keys[i]];
    if (typeof z === "number" && z > max) max = z;
  }
  return max;
}

/**
 * Next front z above meters + HUD ephemeral zs. Compresses meter peers when
 * the shared ceiling is hit so mail/bag/threat can still rise over meters.
 */
export function nextWindowFrontZ(
  peers: MeterInstance[],
  hudZs: Record<string, number | undefined>,
): { zIndex: number; peers: MeterInstance[] } {
  const floor = Math.max(maxMeterStackZ(peers), maxRecordStackZ(hudZs));
  if (floor < METER_STACK_MAX) {
    return { zIndex: floor + 1, peers };
  }
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
    zIndex: Math.min(
      METER_STACK_BASE + ranked.length,
      METER_STACK_MAX,
    ),
    peers: next,
  };
}

/** Next z-index above all peers; compresses peer stack if near ceiling. */
export function nextMeterStackZ(peers: MeterInstance[]): {
  zIndex: number;
  peers: MeterInstance[];
} {
  return nextWindowFrontZ(peers, {});
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

/**
 * Raise an existing instance without changing lock. No-op if already top of
 * meters and above any HUD ephemeral z (`above`).
 */
export function bringMeterToFront(
  peers: MeterInstance[],
  id: string,
  above = 0,
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
    target.zIndex > above &&
    max >= METER_STACK_BASE
  ) {
    return peers;
  }
  const { zIndex, peers: base } = nextWindowFrontZ(peers, {
    __hud: above > 0 ? above : undefined,
  });
  return base.map((m) => (m.id === id ? { ...m, zIndex } : m));
}
