/**
 * Meter helpers that are not the unified Comm edge-group graph.
 * Group move/snap/ungroup live in lib/commWindowGroup + useCommWindowActions.
 */

import type { MeterInstance } from "./meterTypes";
import {
  applyGroupFrameSize as applyPanelGroupFrameSize,
  getEdgeGroup,
  panelHasSnap,
  type EdgeSnapMap,
  type EdgeSnapSide,
} from "../lib/panelEdgeGroup";

/** @deprecated Prefer EdgeSnapSide from lib/panelEdgeGroup. */
export type SnapSide = EdgeSnapSide;

/** @deprecated Prefer EdgeSnapMap — identical shape on MeterInstance.snap. */
export type MeterSnapMap = EdgeSnapMap;

export function meterHasSnap(inst: MeterInstance): boolean {
  return panelHasSnap(inst);
}

export function applyGroupFrameSize(
  instances: MeterInstance[],
  resizedId: string,
  size: { frameW?: number; frameH?: number },
): MeterInstance[] {
  return applyPanelGroupFrameSize(instances, resizedId, size);
}

export function getMeterGroup(
  instances: MeterInstance[],
  startId: string,
): MeterInstance[] {
  return getEdgeGroup(instances, startId);
}

/**
 * Pin self at bottom of the visible window when off-screen in the top ranks.
 * `rows` should already be value-sorted; preserves true 1-based ranks via `rank`.
 */
export function pinAlwaysShowSelf<T extends { id: string; rank?: number }>(
  rows: T[],
  maxRows: number,
  youId: string | null | undefined,
  enabled: boolean,
): T[] {
  const capped = maxRows > 0 ? maxRows : rows.length;
  if (!enabled || !youId || rows.length <= capped) {
    return rows
      .slice(0, capped)
      .map((r, i) => (r.rank != null ? r : { ...r, rank: i + 1 }));
  }
  const ranked = rows.map((r, i) =>
    r.rank != null ? r : { ...r, rank: i + 1 },
  );
  let youIdx = -1;
  for (let i = 0; i < ranked.length; i++) {
    if (ranked[i].id === youId) {
      youIdx = i;
      break;
    }
  }
  if (youIdx < 0 || youIdx < capped) return ranked.slice(0, capped);
  const out = ranked.slice(0, capped - 1);
  out.push(ranked[youIdx]);
  return out;
}

/** Approx visible bar slots from frame height. */
export function maxRowsForFrameHeight(frameH: number | undefined): number {
  const h = frameH && frameH > 0 ? frameH : 180;
  const chrome = 52;
  const row = 16;
  return Math.max(3, Math.floor((h - chrome) / row));
}
