/**
 * Generic Comm UI edge-snap panel groups.
 * snap sides: 1 left · 2 bottom · 3 right · 4 top → neighbor panel id
 *
 * Hold Ctrl while dragging to place without joining a group (preview + drop).
 * Live: releasing Ctrl mid-drag re-enables snap for the rest of the gesture.
 * Does not ungroup an already-grouped window. Alt is unlock-drag; Shift is
 * free-size resize — both taken during arrange.
 */

import {
  clampPanelGroupInRoot,
  clampPanelPosInRoot,
  type PanelPos,
} from "./layout";

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
 *
 * When `rootW`/`rootH` are provided, every member is nudged so the flush edge
 * stays put (left for shared width, top for shared height) — use this for
 * corner resize. Omit root for Stretch ↕ so panels grow/shrink on their CSS
 * anchors and unstretch returns to the prior painted box.
 */
export function applyGroupFrameSize<T extends EdgeGroupPanel>(
  panels: T[],
  resizedId: string,
  size: { frameW?: number; frameH?: number },
  opts?: { rootW?: number; rootH?: number },
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
  const rootW = opts?.rootW;
  const rootH = opts?.rootH;
  const canAlign =
    typeof rootW === "number" &&
    rootW > 0 &&
    typeof rootH === "number" &&
    rootH > 0;

  return panels.map((m) => {
    if (!ids.has(m.id)) return m;
    const next = { ...m };
    const oldW = typeof m.frameW === "number" && m.frameW > 0 ? m.frameW : null;
    const oldH = typeof m.frameH === "number" && m.frameH > 0 ? m.frameH : null;
    if (size.frameW != null) {
      if (shareW) next.frameW = size.frameW;
      else if (m.id === resizedId) next.frameW = size.frameW;
    }
    if (size.frameH != null) {
      if (shareH) next.frameH = size.frameH;
      else if (m.id === resizedId) next.frameH = size.frameH;
    }
    if (!canAlign) return next;
    // Keep painted flush edges for the whole group (source + peers). When the
    // caller already applied the same nudge to the resized panel, old===new
    // after the pre-map and these shifts are no-ops.
    if (shareW && size.frameW != null && oldW != null && oldW !== size.frameW) {
      next.pos = shiftPosKeepLeftEdge(
        next.pos,
        oldW,
        size.frameW,
        rootW!,
        rootH!,
      );
    }
    if (shareH && size.frameH != null && oldH != null && oldH !== size.frameH) {
      next.pos = shiftPosKeepTopEdge(
        next.pos,
        oldH,
        size.frameH,
        rootW!,
        rootH!,
      );
    }
    return next;
  });
}

/** Keep painted left edge fixed when width changes (tl/bl no-op). */
export function shiftPosKeepLeftEdge(
  pos: PanelPos,
  oldW: number,
  newW: number,
  rootW: number,
  rootH: number,
): PanelPos {
  const dW = newW - oldW;
  if (!dW) return pos;
  const anchor = pos.anchor || "tl";
  if (anchor === "tl" || anchor === "bl") return pos;
  if (anchor === "tc" || anchor === "bc" || anchor === "center") {
    return nudgePosByPixels(pos, dW / 2, 0, rootW, rootH);
  }
  // tr / br — width grows leftward from the anchor; push anchor right by dW.
  return nudgePosByPixels(pos, dW, 0, rootW, rootH);
}

/** Keep painted top edge fixed when height changes (tl/tr/tc no-op). */
export function shiftPosKeepTopEdge(
  pos: PanelPos,
  oldH: number,
  newH: number,
  rootW: number,
  rootH: number,
): PanelPos {
  const dH = newH - oldH;
  if (!dH) return pos;
  const anchor = pos.anchor || "tl";
  if (anchor === "tl" || anchor === "tr" || anchor === "tc") return pos;
  if (anchor === "center") {
    return nudgePosByPixels(pos, 0, dH / 2, rootW, rootH);
  }
  // bl / br / bc — height grows upward from the anchor; push anchor down by dH.
  return nudgePosByPixels(pos, 0, dH, rootW, rootH);
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
 * Clears any previous occupant of those edges (both directions).
 */
export function groupPanels<T extends EdgeGroupPanel>(
  panels: T[],
  aId: string,
  bId: string,
  sideOnA: EdgeSnapSide,
): T[] {
  if (aId === bId) return panels;
  const opp = oppositeSnapSide(sideOnA);
  const byId: Record<string, T> = {};
  for (let i = 0; i < panels.length; i++) byId[panels[i].id] = panels[i];
  const a = byId[aId];
  const b = byId[bId];
  if (!a || !b) return panels;
  const oldOnA = (a.snap || {})[sideOnA];
  const oldOnB = (b.snap || {})[opp];
  const stale = new Set<string>();
  if (oldOnA && oldOnA !== bId) stale.add(oldOnA);
  if (oldOnB && oldOnB !== aId) stale.add(oldOnB);

  return panels.map((m) => {
    if (m.id === aId) {
      const snap: EdgeSnapMap = { ...(m.snap || {}) };
      snap[sideOnA] = bId;
      return refreshSnapFlags({ ...m, snap });
    }
    if (m.id === bId) {
      const snap: EdgeSnapMap = { ...(m.snap || {}) };
      snap[opp] = aId;
      return refreshSnapFlags({ ...m, snap });
    }
    if (!stale.has(m.id)) return m;
    const snap: EdgeSnapMap = { ...(m.snap || {}) };
    let changed = false;
    const sides: EdgeSnapSide[] = [1, 2, 3, 4];
    for (let i = 0; i < sides.length; i++) {
      const side = sides[i];
      if (snap[side] === aId || snap[side] === bId) {
        delete snap[side];
        changed = true;
      }
    }
    return changed ? refreshSnapFlags({ ...m, snap }) : m;
  });
}

/**
 * Move a snap group by applying the same % delta to every member.
 * PanelPos uses left%/top% of the CSS anchor point for all anchors
 * (`panelStyle` + translate) — do not invert for tr/br/bl.
 * When root size is known, keep the group's painted union on-screen.
 */
export function moveEdgeGroup<T extends EdgeGroupPanel>(
  panels: T[],
  movedId: string,
  newPos: PanelPos,
  root?: { w: number; h: number },
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
    let pos = { ...newPos };
    if (root && root.w > 0 && root.h > 0) {
      const pw =
        moved.frameW ||
        (typeof moved.pos.frameW === "number" ? moved.pos.frameW : 0) ||
        200;
      const ph =
        moved.frameH ||
        (typeof moved.pos.frameH === "number" ? moved.pos.frameH : 0) ||
        150;
      const scale =
        typeof pos.scale === "number" && pos.scale > 0 ? pos.scale : 1;
      pos = clampPanelPosInRoot(pos, pw * scale, ph * scale, root.w, root.h);
    } else {
      pos = {
        ...pos,
        x: Math.max(0, Math.min(100, pos.x)),
        y: Math.max(0, Math.min(100, pos.y)),
      };
    }
    return panels.map((m) => (m.id === movedId ? { ...m, pos } : m));
  }
  const groupIds = new Set(group.map((g) => g.id));
  let next = panels.map((m) => {
    if (!groupIds.has(m.id)) return m;
    if (m.id === movedId) return { ...m, pos: { ...newPos } };
    return {
      ...m,
      pos: {
        ...m.pos,
        x: m.pos.x + dx,
        y: m.pos.y + dy,
      },
    };
  });
  if (root && root.w > 0 && root.h > 0) {
    const members = next
      .filter((m) => groupIds.has(m.id))
      .map((m) => {
        const pw = m.frameW || m.pos.frameW || 200;
        const ph = m.frameH || m.pos.frameH || 150;
        const scale =
          typeof m.pos.scale === "number" && m.pos.scale > 0 ? m.pos.scale : 1;
        return {
          id: m.id,
          pos: m.pos,
          paintedW: pw * scale,
          paintedH: ph * scale,
        };
      });
    const clamped = clampPanelGroupInRoot(members, root.w, root.h);
    const byClamped: Record<string, PanelPos> = {};
    for (let i = 0; i < members.length; i++) {
      byClamped[members[i].id] = clamped[i];
    }
    next = next.map((m) =>
      byClamped[m.id] ? { ...m, pos: byClamped[m.id] } : m,
    );
  } else {
    next = next.map((m) => {
      if (!groupIds.has(m.id)) return m;
      return {
        ...m,
        pos: {
          ...m.pos,
          x: Math.max(0, Math.min(100, m.pos.x)),
          y: Math.max(0, Math.min(100, m.pos.y)),
        },
      };
    });
  }
  return next;
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

type EdgeRect = { left: number; right: number; top: number; bottom: number };

/**
 * How `panelStyle` grows the painted box when frameW/H change for an anchor.
 * Used so attach-align math matches the size that will actually paint.
 */
function projectRectForSize(
  rect: EdgeRect,
  anchor: string | undefined,
  nextW: number | undefined,
  nextH: number | undefined,
): EdgeRect {
  const ax = anchor || "tl";
  const oldW = rect.right - rect.left;
  const oldH = rect.bottom - rect.top;
  const w = nextW != null && nextW > 0 ? nextW : oldW;
  const h = nextH != null && nextH > 0 ? nextH : oldH;
  const dW = w - oldW;
  const dH = h - oldH;
  let left = rect.left;
  let top = rect.top;
  if (dW) {
    if (ax === "tr" || ax === "br") left -= dW;
    else if (ax === "tc" || ax === "bc" || ax === "center") left -= dW / 2;
  }
  if (dH) {
    if (ax === "bl" || ax === "br" || ax === "bc") top -= dH;
    else if (ax === "center") top -= dH / 2;
  }
  return { left, top, right: left + w, bottom: top + h };
}

/**
 * Pick best edge pairing from DOM rects while dragging `selfId`.
 * Returns null when nothing is within threshold.
 * Only accepts the geometrically natural side (self left of other → right
 * attach, etc.) so overlap does not flip to the wrong edge.
 */
export function findEdgeSnapCandidate(
  selfId: string,
  selfRect: EdgeRect,
  others: Array<{ id: string; rect: EdgeRect }>,
  thresholdPx = DEFAULT_EDGE_SNAP_PX,
): EdgeCandidate | null {
  let best: EdgeCandidate | null = null;
  let bestScore = Infinity;
  const selfCx = (selfRect.left + selfRect.right) / 2;
  const selfCy = (selfRect.top + selfRect.bottom) / 2;
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    if (o.id === selfId) continue;
    const r = o.rect;
    // Zero-size / out-of-layout peers (display:none, unmounted footprint).
    if (!(r.right - r.left > 0) || !(r.bottom - r.top > 0)) continue;
    const oCx = (r.left + r.right) / 2;
    const oCy = (r.top + r.bottom) / 2;
    const candidates: Array<{
      side: EdgeSnapSide;
      gap: number;
      align: number;
      natural: boolean;
    }> = [
      {
        side: 3,
        gap: Math.abs(selfRect.right - r.left),
        align: Math.abs(selfRect.top - r.top),
        natural: selfCx <= oCx,
      },
      {
        side: 1,
        gap: Math.abs(selfRect.left - r.right),
        align: Math.abs(selfRect.top - r.top),
        natural: selfCx >= oCx,
      },
      {
        side: 2,
        gap: Math.abs(selfRect.bottom - r.top),
        align: Math.abs(selfRect.left - r.left),
        natural: selfCy <= oCy,
      },
      {
        side: 4,
        gap: Math.abs(selfRect.top - r.bottom),
        align: Math.abs(selfRect.left - r.left),
        natural: selfCy >= oCy,
      },
    ];
    for (let c = 0; c < candidates.length; c++) {
      const cand = candidates[c];
      if (!cand.natural) continue;
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

/**
 * Nudge PanelPos by a painted-pixel delta.
 * `panelStyle` always places the anchor at left%/top%, so +x/+y is always
 * screen right/down for every LayoutAnchor.
 */
export function nudgePosByPixels(
  pos: PanelPos,
  dxPx: number,
  dyPx: number,
  rootW: number,
  rootH: number,
  painted?: { w: number; h: number },
): PanelPos {
  const dxPct = rootW > 0 ? (dxPx / rootW) * 100 : 0;
  const dyPct = rootH > 0 ? (dyPx / rootH) * 100 : 0;
  const next: PanelPos = {
    ...pos,
    x: pos.x + dxPct,
    y: pos.y + dyPct,
  };
  if (painted && painted.w > 0 && painted.h > 0) {
    return clampPanelPosInRoot(next, painted.w, painted.h, rootW, rootH);
  }
  return {
    ...next,
    x: Math.max(0, Math.min(100, next.x)),
    y: Math.max(0, Math.min(100, next.y)),
  };
}

/**
 * Group + align `selfId` flush against `otherId` on the given side.
 * Uses live DOM rects so the panels actually touch (Details SetPoint).
 * Size matching is projected into the rect before the nudge so anchors that
 * grow opposite the attach edge stay flush after frameW/H update.
 */
export function attachPanelEdge<T extends EdgeGroupPanel>(
  panels: T[],
  selfId: string,
  otherId: string,
  sideOnSelf: EdgeSnapSide,
  selfRect: EdgeRect,
  otherRect: EdgeRect,
  rootW: number,
  rootH: number,
): T[] {
  const byId: Record<string, T> = {};
  for (let i = 0; i < panels.length; i++) byId[panels[i].id] = panels[i];
  const self = byId[selfId];
  const other = byId[otherId];
  if (!self || !other) return panels;

  // Details agrupar_janelas: horizontal attach shares height; vertical shares width.
  const matchH = sideOnSelf === 1 || sideOnSelf === 3;
  const matchW = sideOnSelf === 2 || sideOnSelf === 4;
  const peerH =
    other.frameH || Math.round(otherRect.bottom - otherRect.top) || undefined;
  const peerW =
    other.frameW || Math.round(otherRect.right - otherRect.left) || undefined;
  const h = matchH ? peerH || self.frameH : self.frameH;
  const w = matchW ? peerW || self.frameW : self.frameW;
  const projected = projectRectForSize(
    selfRect,
    self.pos.anchor,
    matchW ? w : undefined,
    matchH ? h : undefined,
  );

  let dx = 0;
  let dy = 0;
  if (sideOnSelf === 3) {
    // self right → other left, top-aligned
    dx = otherRect.left - GROUP_GAP_PX - projected.right;
    dy = otherRect.top - projected.top;
  } else if (sideOnSelf === 1) {
    dx = otherRect.right + GROUP_GAP_PX - projected.left;
    dy = otherRect.top - projected.top;
  } else if (sideOnSelf === 2) {
    dy = otherRect.top - GROUP_GAP_PX - projected.bottom;
    dx = otherRect.left - projected.left;
  } else {
    dy = otherRect.bottom + GROUP_GAP_PX - projected.top;
    dx = otherRect.left - projected.left;
  }

  const alignedPos = nudgePosByPixels(self.pos, dx, dy, rootW, rootH, {
    w: projected.right - projected.left,
    h: projected.bottom - projected.top,
  });

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
