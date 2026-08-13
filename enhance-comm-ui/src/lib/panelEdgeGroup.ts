/**
 * Generic Comm UI edge-snap panel groups.
 * snap sides: 1 left · 2 bottom · 3 right · 4 top → neighbor panel id
 */

import type { PanelPos } from "./layout";

export type EdgeSnapSide = 1 | 2 | 3 | 4;

export type EdgeSnapMap = {
  1?: string;
  2?: string;
  3?: string;
  4?: string;
};

/** Minimum shape for edge-group operations. */
export type EdgeGroupPanel = {
  id: string;
  pos: PanelPos;
  snap?: EdgeSnapMap;
  frameW?: number;
  frameH?: number;
  horizontalSnap?: boolean;
  verticalSnap?: boolean;
};

export type EdgeCandidate = {
  otherId: string;
  sideOnSelf: EdgeSnapSide;
  gap: number;
};

export type EdgeGroupPeerFilter<T extends EdgeGroupPanel> = (
  panel: T,
  selfId: string,
) => boolean;

export const DEFAULT_EDGE_SNAP_PX = 36;
const GROUP_GAP_PX = 0;

/** Opposite side index. */
export function oppositeSnapSide(side: EdgeSnapSide): EdgeSnapSide {
  if (side === 1) return 3;
  if (side === 3) return 1;
  if (side === 2) return 4;
  return 2;
}

export function emptySnap(): EdgeSnapMap {
  return {};
}

export function panelHasSnap(panel: EdgeGroupPanel): boolean {
  const s = panel.snap;
  if (!s) return false;
  return !!(s[1] || s[2] || s[3] || s[4]);
}

/** Clear snap-orientation flags from snap map (Details horizontalSnap / verticalSnap). */
export function refreshSnapFlags<T extends EdgeGroupPanel>(panel: T): T {
  if (!panelHasSnap(panel)) {
    const next = { ...panel };
    delete next.horizontalSnap;
    delete next.verticalSnap;
    return next;
  }
  const s = panel.snap || {};
  const horizontal = !!(s[1] || s[3]);
  const vertical = !!(s[2] || s[4]);
  return {
    ...panel,
    horizontalSnap: horizontal || undefined,
    verticalSnap: vertical || undefined,
  };
}

/**
 * Propagate frame size within a snap group (Details resize rules).
 * Horizontal row: share height; width stays per-window.
 * Vertical stack: share width; height stays per-window.
 */
export function applyGroupFrameSize<T extends EdgeGroupPanel>(
  panels: T[],
  resizedId: string,
  size: { frameW?: number; frameH?: number },
): T[] {
  const source = panels.find((m) => m.id === resizedId);
  if (!source) return panels;
  if (!panelHasSnap(source)) {
    return panels.map((m) => (m.id === resizedId ? { ...m, ...size } : m));
  }
  const group = getEdgeGroup(panels, resizedId);
  const ids = new Set(group.map((g) => g.id));
  const snap = source.snap || {};
  const shareH = !!source.horizontalSnap || !!(snap[1] || snap[3]);
  const shareW = !!source.verticalSnap || !!(snap[2] || snap[4]);
  return panels.map((m) => {
    if (!ids.has(m.id)) return m;
    const next = { ...m };
    if (size.frameW != null) {
      if (shareW) next.frameW = size.frameW;
      else if (m.id === resizedId) next.frameW = size.frameW;
    }
    if (size.frameH != null) {
      if (shareH) next.frameH = size.frameH;
      else if (m.id === resizedId) next.frameH = size.frameH;
    }
    return next;
  });
}

/** BFS collect all panels in the same snap group. */
export function getEdgeGroup<T extends EdgeGroupPanel>(
  panels: T[],
  startId: string,
): T[] {
  const byId: Record<string, T> = {};
  for (let i = 0; i < panels.length; i++) {
    byId[panels[i].id] = panels[i];
  }
  const start = byId[startId];
  if (!start) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const inst = byId[id];
    if (!inst) continue;
    out.push(inst);
    const snap = inst.snap || {};
    const sides: EdgeSnapSide[] = [1, 2, 3, 4];
    for (let i = 0; i < sides.length; i++) {
      const nid = snap[sides[i]];
      if (nid && !seen.has(nid)) queue.push(nid);
    }
  }
  return out;
}

/** Clear all snap links involving `id`. */
export function ungroupPanel<T extends EdgeGroupPanel>(
  panels: T[],
  id: string,
): T[] {
  return panels.map((m) => {
    if (m.id === id) {
      return refreshSnapFlags({ ...m, snap: emptySnap() });
    }
    const snap = m.snap;
    if (!snap) return m;
    const next: EdgeSnapMap = { ...snap };
    let changed = false;
    const sides: EdgeSnapSide[] = [1, 2, 3, 4];
    for (let i = 0; i < sides.length; i++) {
      const side = sides[i];
      if (next[side] === id) {
        delete next[side];
        changed = true;
      }
    }
    return changed ? refreshSnapFlags({ ...m, snap: next }) : m;
  });
}

/**
 * Link A and B on a side of A (B attaches on the opposite edge).
 * Clears any previous occupant of those edges.
 */
export function groupPanels<T extends EdgeGroupPanel>(
  panels: T[],
  aId: string,
  bId: string,
  sideOnA: EdgeSnapSide,
): T[] {
  if (aId === bId) return panels;
  const opp = oppositeSnapSide(sideOnA);
  return panels.map((m) => {
    if (m.id === aId) {
      const snap: EdgeSnapMap = { ...(m.snap || {}) };
      snap[sideOnA] = bId;
      return { ...m, snap };
    }
    if (m.id === bId) {
      const snap: EdgeSnapMap = { ...(m.snap || {}) };
      snap[opp] = aId;
      return { ...m, snap };
    }
    return m;
  });
}

/**
 * Convert a moved panel's % delta into screen-direction % (right/down positive),
 * then apply that screen delta to any peer anchor via the same rules as
 * nudgePosByPixels. Mixed anchors must stay glued when the group moves.
 */
function applyScreenPctDelta(pos: PanelPos, dxScreen: number, dyScreen: number): PanelPos {
  const ax = pos.anchor || "tl";
  let x = pos.x;
  let y = pos.y;
  if (ax === "tr" || ax === "br") x -= dxScreen;
  else x += dxScreen;
  if (ax === "bl" || ax === "br" || ax === "bc") y -= dyScreen;
  else y += dyScreen;
  return {
    ...pos,
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

function screenPctDeltaFromMove(oldPos: PanelPos, newPos: PanelPos): {
  dx: number;
  dy: number;
} {
  const ax = oldPos.anchor || "tl";
  const dx = newPos.x - oldPos.x;
  const dy = newPos.y - oldPos.y;
  return {
    dx: ax === "tr" || ax === "br" ? -dx : dx,
    dy: ax === "bl" || ax === "br" || ax === "bc" ? -dy : dy,
  };
}

export function moveEdgeGroup<T extends EdgeGroupPanel>(
  panels: T[],
  movedId: string,
  newPos: PanelPos,
): T[] {
  const byId: Record<string, T> = {};
  for (let i = 0; i < panels.length; i++) {
    byId[panels[i].id] = panels[i];
  }
  const moved = byId[movedId];
  if (!moved) return panels;
  const old = moved.pos;
  const dx = newPos.x - old.x;
  const dy = newPos.y - old.y;
  if (dx === 0 && dy === 0) {
    return panels.map((m) =>
      m.id === movedId ? { ...m, pos: { ...newPos } } : m,
    );
  }
  const group = getEdgeGroup(panels, movedId);
  if (group.length <= 1) {
    return panels.map((m) =>
      m.id === movedId ? { ...m, pos: { ...newPos } } : m,
    );
  }
  const groupIds = new Set(group.map((g) => g.id));
  const screen = screenPctDeltaFromMove(old, newPos);
  return panels.map((m) => {
    if (!groupIds.has(m.id)) return m;
    if (m.id === movedId) return { ...m, pos: { ...newPos } };
    return {
      ...m,
      pos: applyScreenPctDelta(m.pos, screen.dx, screen.dy),
    };
  });
}

/** Match peer frame height when snapping horizontally. */
export function matchGroupHeight<T extends EdgeGroupPanel>(
  panels: T[],
  id: string,
  height: number,
): T[] {
  const group = getEdgeGroup(panels, id);
  if (group.length <= 1) {
    return panels.map((m) => (m.id === id ? { ...m, frameH: height } : m));
  }
  const ids = new Set(group.map((g) => g.id));
  return panels.map((m) => (ids.has(m.id) ? { ...m, frameH: height } : m));
}

/** Match peer frame width when snapping vertically (Details SetPoint left+right). */
export function matchGroupWidth<T extends EdgeGroupPanel>(
  panels: T[],
  id: string,
  width: number,
): T[] {
  const group = getEdgeGroup(panels, id);
  if (group.length <= 1) {
    return panels.map((m) => (m.id === id ? { ...m, frameW: width } : m));
  }
  const ids = new Set(group.map((g) => g.id));
  return panels.map((m) => (ids.has(m.id) ? { ...m, frameW: width } : m));
}

/**
 * Pick best edge pairing from DOM rects while dragging `selfId`.
 * Returns null when nothing is within threshold.
 */
export function findEdgeSnapCandidate(
  selfId: string,
  selfRect: { left: number; right: number; top: number; bottom: number },
  others: Array<{
    id: string;
    rect: { left: number; right: number; top: number; bottom: number };
  }>,
  thresholdPx = DEFAULT_EDGE_SNAP_PX,
): EdgeCandidate | null {
  let best: EdgeCandidate | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    if (o.id === selfId) continue;
    const r = o.rect;
    const candidates: Array<{
      side: EdgeSnapSide;
      gap: number;
      align: number;
    }> = [
      {
        side: 3,
        gap: Math.abs(selfRect.right - r.left),
        align: Math.abs(selfRect.top - r.top),
      },
      {
        side: 1,
        gap: Math.abs(selfRect.left - r.right),
        align: Math.abs(selfRect.top - r.top),
      },
      {
        side: 2,
        gap: Math.abs(selfRect.bottom - r.top),
        align: Math.abs(selfRect.left - r.left),
      },
      {
        side: 4,
        gap: Math.abs(selfRect.top - r.bottom),
        align: Math.abs(selfRect.left - r.left),
      },
    ];
    for (let c = 0; c < candidates.length; c++) {
      const cand = candidates[c];
      if (cand.gap > thresholdPx || cand.align > 80) continue;
      const score = cand.gap + cand.align * 0.25;
      if (score < bestScore) {
        bestScore = score;
        best = { otherId: o.id, sideOnSelf: cand.side, gap: score };
      }
    }
  }
  return best;
}

/** Nudge PanelPos by a painted-pixel delta, respecting anchor. */
export function nudgePosByPixels(
  pos: PanelPos,
  dxPx: number,
  dyPx: number,
  rootW: number,
  rootH: number,
): PanelPos {
  const ax = pos.anchor || "tl";
  const dxPct = rootW > 0 ? (dxPx / rootW) * 100 : 0;
  const dyPct = rootH > 0 ? (dyPx / rootH) * 100 : 0;
  let x = pos.x;
  let y = pos.y;
  // Right-anchored: increasing x moves the panel left on screen.
  if (ax === "tr" || ax === "br") x -= dxPct;
  else if (ax === "tc" || ax === "bc" || ax === "center") x += dxPct;
  else x += dxPct;
  // Bottom-anchored: increasing y moves the panel up on screen.
  if (ax === "bl" || ax === "br" || ax === "bc") y -= dyPct;
  else if (ax === "center") y += dyPct;
  else y += dyPct;
  return {
    ...pos,
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

/**
 * Group + align `selfId` flush against `otherId` on the given side.
 * Uses live DOM rects so the panels actually touch (Details SetPoint).
 */
export function attachPanelEdge<T extends EdgeGroupPanel>(
  panels: T[],
  selfId: string,
  otherId: string,
  sideOnSelf: EdgeSnapSide,
  selfRect: { left: number; right: number; top: number; bottom: number },
  otherRect: { left: number; right: number; top: number; bottom: number },
  rootW: number,
  rootH: number,
): T[] {
  let dx = 0;
  let dy = 0;
  if (sideOnSelf === 3) {
    // self right → other left, top-aligned
    dx = otherRect.left - GROUP_GAP_PX - selfRect.right;
    dy = otherRect.top - selfRect.top;
  } else if (sideOnSelf === 1) {
    dx = otherRect.right + GROUP_GAP_PX - selfRect.left;
    dy = otherRect.top - selfRect.top;
  } else if (sideOnSelf === 2) {
    dy = otherRect.top - GROUP_GAP_PX - selfRect.bottom;
    dx = otherRect.left - selfRect.left;
  } else {
    dy = otherRect.bottom + GROUP_GAP_PX - selfRect.top;
    dx = otherRect.left - selfRect.left;
  }

  const byId: Record<string, T> = {};
  for (let i = 0; i < panels.length; i++) byId[panels[i].id] = panels[i];
  const self = byId[selfId];
  const other = byId[otherId];
  if (!self || !other) return panels;

  const alignedPos = nudgePosByPixels(self.pos, dx, dy, rootW, rootH);
  // Details agrupar_janelas: horizontal attach shares height; vertical shares width.
  const matchH = sideOnSelf === 1 || sideOnSelf === 3;
  const matchW = sideOnSelf === 2 || sideOnSelf === 4;
  const peerH =
    other.frameH || Math.round(otherRect.bottom - otherRect.top) || undefined;
  const peerW =
    other.frameW || Math.round(otherRect.right - otherRect.left) || undefined;
  const h = matchH ? peerH || self.frameH : self.frameH;
  const w = matchW ? peerW || self.frameW : self.frameW;

  let next = panels.map((m) => {
    if (m.id !== selfId) return m;
    return {
      ...m,
      pos: alignedPos,
      frameH: h != null ? h : m.frameH,
      frameW: w != null ? w : m.frameW,
    };
  });
  next = groupPanels(next, selfId, otherId, sideOnSelf);
  if (matchH && h != null) next = matchGroupHeight(next, selfId, h);
  if (matchW && w != null) next = matchGroupWidth(next, selfId, w);
  return next.map(refreshSnapFlags);
}

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

/** Live snap target while dragging (highlights peer before drop). */
export function findEdgeSnapPreviewTarget<T extends EdgeGroupPanel>(
  panels: T[],
  selfId: string,
  canSnap: EdgeGroupPeerFilter<T>,
  thresholdPx = DEFAULT_EDGE_SNAP_PX,
): string | null {
  if (typeof document === "undefined") return null;
  const selfEl = document.querySelector(
    `.comm-pos-panel.comm-pos-${cssEscapePanelId(selfId)}`,
  ) as HTMLElement | null;
  if (!selfEl) return null;
  const selfRect = selfEl.getBoundingClientRect();
  const others = collectEdgePeerRects(panels, selfId, canSnap);
  const cand = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
  return cand ? cand.otherId : null;
}

/**
 * Details guide-ball target: nearest attachable peer.
 * `canSnap` is true when within the hard edge-snap threshold (green balls).
 */
export function findSnapGuideTarget<T extends EdgeGroupPanel>(
  panels: T[],
  selfId: string,
  canSnap: EdgeGroupPeerFilter<T>,
  nearPx = 140,
  thresholdPx = DEFAULT_EDGE_SNAP_PX,
): { id: string; canSnap: boolean } | null {
  if (typeof document === "undefined") return null;
  const selfEl = document.querySelector(
    `.comm-pos-panel.comm-pos-${cssEscapePanelId(selfId)}`,
  ) as HTMLElement | null;
  if (!selfEl) return null;
  const selfRect = selfEl.getBoundingClientRect();
  const others = collectEdgePeerRects(panels, selfId, canSnap);
  const tight = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
  if (tight) return { id: tight.otherId, canSnap: true };
  const loose = findEdgeSnapCandidate(selfId, selfRect, others, nearPx);
  if (loose) return { id: loose.otherId, canSnap: false };
  return null;
}

/** Try to snap `selfId` to a nearby panel after a drag ends. */
export function trySnapOnDrop<T extends EdgeGroupPanel>(
  panels: T[],
  selfId: string,
  canSnap: EdgeGroupPeerFilter<T>,
  thresholdPx = DEFAULT_EDGE_SNAP_PX,
): T[] {
  if (typeof document === "undefined") return panels;
  const selfEl = document.querySelector(
    `.comm-pos-panel.comm-pos-${cssEscapePanelId(selfId)}`,
  ) as HTMLElement | null;
  if (!selfEl) return panels;
  const selfRect = selfEl.getBoundingClientRect();
  const others = collectEdgePeerRects(panels, selfId, canSnap);
  const cand = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
  if (!cand) return panels;
  const peer = others.find((o) => o.id === cand.otherId);
  if (!peer) return panels;
  const rootEl =
    (typeof document !== "undefined" &&
      (document.getElementById("comm-ui") ||
        document.getElementById("game") ||
        document.body)) ||
    null;
  const root = rootEl
    ? rootEl.getBoundingClientRect()
    : { width: window.innerWidth, height: window.innerHeight };
  return attachPanelEdge(
    panels,
    selfId,
    cand.otherId,
    cand.sideOnSelf,
    selfRect,
    peer.rect,
    root.width || window.innerWidth,
    root.height || window.innerHeight,
  );
}
