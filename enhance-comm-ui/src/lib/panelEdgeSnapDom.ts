/**
 * DOM walks for edge-snap preview / guide / drop.
 * Pure geometry lives in panelEdgeGroup.
 */

import {
  attachPanelEdge,
  DEFAULT_EDGE_SNAP_PX,
  findEdgeSnapCandidate,
  getEdgeGroup,
  type EdgeCandidate,
  type EdgeGroupPanel,
  type EdgeGroupPeerFilter,
} from "./panelEdgeGroup";

export function cssEscapePanelId(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}

/** Collect live DOM rects for snap peers under the Comm positioned-panel convention. */
export function collectEdgePeerRects<T extends EdgeGroupPanel>(
  panels: T[],
  selfId: string,
  canSnap: EdgeGroupPeerFilter<T>,
): Array<{
  id: string;
  rect: { left: number; right: number; top: number; bottom: number };
}> {
  if (typeof document === "undefined") return [];
  const others: Array<{
    id: string;
    rect: { left: number; right: number; top: number; bottom: number };
  }> = [];
  for (let i = 0; i < panels.length; i++) {
    const m = panels[i];
    if (m.id === selfId || !canSnap(m, selfId)) continue;
    const el = document.querySelector(
      `.comm-pos-panel.comm-pos-${cssEscapePanelId(m.id)}`,
    ) as HTMLElement | null;
    if (!el) continue;
    others.push({ id: m.id, rect: el.getBoundingClientRect() });
  }
  return others;
}

/** Peers that may join — never re-snap to members already in self's group. */
function snapJoinPeerFilter<T extends EdgeGroupPanel>(
  panels: T[],
  selfId: string,
  canSnap: EdgeGroupPeerFilter<T>,
): EdgeGroupPeerFilter<T> {
  const own = new Set(getEdgeGroup(panels, selfId).map((g) => g.id));
  return (panel, sid) => {
    if (own.has(panel.id)) return false;
    return canSnap(panel, sid);
  };
}

export type FindSnapTargetOpts<T extends EdgeGroupPanel> = {
  thresholdPx: number;
  /** When set, also compute a looser candidate for guide balls. */
  nearPx?: number;
  skipGroupJoin?: boolean;
  peerFilter?: EdgeGroupPeerFilter<T>;
  /**
   * When true (default), skip peers already in self's edge group (join/drop).
   * Guides set false after join-miss so already-linked windows still get a line.
   */
  excludeOwnGroup?: boolean;
};

export type SnapPeerRect = {
  id: string;
  rect: { left: number; right: number; top: number; bottom: number };
};

export type SnapTargetResult = {
  tight: EdgeCandidate | null;
  /** Populated when nearPx is set; may equal tight when both match. */
  loose: EdgeCandidate | null;
  selfRect: DOMRect;
  peers: SnapPeerRect[];
};

/**
 * One snap finder: tight within thresholdPx; optional loose within nearPx.
 * Preview / drop use tight only; guides prefer tight then loose.
 */
export function findSnapTarget<T extends EdgeGroupPanel>(
  selfId: string,
  panels: T[],
  opts: FindSnapTargetOpts<T>,
): SnapTargetResult | null {
  if (opts.skipGroupJoin) return null;
  if (typeof document === "undefined") return null;
  const peerFilter = opts.peerFilter || (() => true);
  const selfEl = document.querySelector(
    `.comm-pos-panel.comm-pos-${cssEscapePanelId(selfId)}`,
  ) as HTMLElement | null;
  if (!selfEl) return null;
  const selfRect = selfEl.getBoundingClientRect();
  const excludeOwn = opts.excludeOwnGroup !== false;
  const joinFilter = excludeOwn
    ? snapJoinPeerFilter(panels, selfId, peerFilter)
    : peerFilter;
  const peers = collectEdgePeerRects(panels, selfId, joinFilter);
  const tight = findEdgeSnapCandidate(
    selfId,
    selfRect,
    peers,
    opts.thresholdPx,
  );
  let loose: EdgeCandidate | null = null;
  if (opts.nearPx != null) {
    loose = findEdgeSnapCandidate(selfId, selfRect, peers, opts.nearPx);
  }
  return { tight, loose, selfRect, peers };
}

/** Try to snap `selfId` to a nearby panel after a drag ends. */
export function trySnapOnDrop<T extends EdgeGroupPanel>(
  panels: T[],
  selfId: string,
  canSnap: EdgeGroupPeerFilter<T>,
  opts?: { skipGroupJoin?: boolean; thresholdPx?: number },
): T[] {
  const result = findSnapTarget(selfId, panels, {
    thresholdPx: opts?.thresholdPx ?? DEFAULT_EDGE_SNAP_PX,
    skipGroupJoin: opts?.skipGroupJoin,
    peerFilter: canSnap,
  });
  const cand = result?.tight;
  if (!result || !cand) return panels;
  let peer: SnapPeerRect | null = null;
  for (let i = 0; i < result.peers.length; i++) {
    if (result.peers[i].id === cand.otherId) {
      peer = result.peers[i];
      break;
    }
  }
  if (!peer) return panels;
  const rootEl =
    document.getElementById("comm-ui") ||
    document.getElementById("game") ||
    document.body;
  const root = rootEl
    ? rootEl.getBoundingClientRect()
    : { width: window.innerWidth, height: window.innerHeight };
  return attachPanelEdge(
    panels,
    selfId,
    cand.otherId,
    cand.sideOnSelf,
    result.selfRect,
    peer.rect,
    root.width || window.innerWidth,
    root.height || window.innerHeight,
  );
}
