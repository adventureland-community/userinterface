/**
 * Panel drag snap — grid vs free vs peer vs visual-edge.
 * Thresholds must stay in lockstep with PositionedPanel.
 */

import {
  snapDragToVisualEdges,
  snapPercent,
  type VisualSnapStart,
} from "./layout";
import { snapPosToFineGrid, squareGridMetrics } from "./layoutGrid";
import type { PercentDragStart } from "./percentDrag";

/** Peer / mid magnet — tighter than old 2.2% so near-edge stays placeable. */
export const PEER_SNAP_PCT = 1.0;
/** Only snap painted box to screen when this close (px). */
/** Max px to magnet painted edges to the screen. Grid mode further caps this
 * below half a cell so one interior grid row/column stays placeable. */
export const VISUAL_EDGE_SNAP_PX = 8;

export type PanelDragSnapInput = {
  rawX: number;
  rawY: number;
  clientX: number;
  clientY: number;
  start: PercentDragStart;
  visual: VisualSnapStart | null;
  free: boolean;
  gridStep: number;
  rootWidth: number;
  rootHeight: number;
  peerXs: number[];
  peerYs: number[];
};

/** Grid vs free vs peer vs visual-edge. Body stays intact. */
export function applyPanelDragMove(input: PanelDragSnapInput): {
  x: number;
  y: number;
} {
  let nextX = input.rawX;
  let nextY = input.rawY;
  let edgeThresholdPx = VISUAL_EDGE_SNAP_PX;
  let useVisualEdge = true;
  // Fine-grid snap applies in layout edit AND play-arrange (movable), whenever
  // Free is off. Same 1× square cell as LayoutEditGrid's finest lines.
  const free = input.free;
  if (!free) {
    const metrics = squareGridMetrics(
      input.gridStep,
      input.rootWidth,
      input.rootHeight,
    );
    const snapped = snapPosToFineGrid(
      nextX,
      nextY,
      input.gridStep,
      input.rootWidth,
      input.rootHeight,
    );
    nextX = snapped.x;
    nextY = snapped.y;
    // Peers may magnetize, but tighter than one fine cell so they don't
    // yank off the chosen grid line onto mid/peer anchors.
    const cellPctX = (metrics.cellPx / Math.max(1, input.rootWidth)) * 100;
    const cellPctY = (metrics.cellPx / Math.max(1, input.rootHeight)) * 100;
    const peerThresh = Math.min(
      PEER_SNAP_PCT,
      Math.max(0.2, Math.min(cellPctX, cellPctY) * 0.4),
    );
    nextX = snapPercent(nextX, peerThresh, input.peerXs);
    nextY = snapPercent(nextY, peerThresh, input.peerYs);
    useVisualEdge = false;
  } else {
    // Free: peer / mid magnets + tight painted-edge flush.
    nextX = snapPercent(nextX, PEER_SNAP_PCT, input.peerXs);
    nextY = snapPercent(nextY, PEER_SNAP_PCT, input.peerYs);
    edgeThresholdPx = VISUAL_EDGE_SNAP_PX;
  }
  const visual = input.visual;
  if (useVisualEdge && visual) {
    const edge = snapDragToVisualEdges(
      input.clientX,
      input.clientY,
      input.start,
      visual,
      edgeThresholdPx,
    );
    if (edge.snapX) nextX = edge.x;
    if (edge.snapY) nextY = edge.y;
  }
  return { x: nextX, y: nextY };
}
