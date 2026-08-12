/**
 * Details-style edge-snap window groups for meter panels.
 * snap sides: 1 left · 2 bottom · 3 right · 4 top → neighbor instance id
 */

import type { PanelPos } from "../lib/layout";
import type { MeterInstance } from "./meterTypes";

export type SnapSide = 1 | 2 | 3 | 4;

export type MeterSnapMap = {
  1?: string;
  2?: string;
  3?: string;
  4?: string;
};

/** Opposite side index. */
export function oppositeSnapSide(side: SnapSide): SnapSide {
  if (side === 1) return 3;
  if (side === 3) return 1;
  if (side === 2) return 4;
  return 2;
}

export function emptySnap(): MeterSnapMap {
  return {};
}

export function meterHasSnap(inst: MeterInstance): boolean {
  const s = inst.snap;
  if (!s) return false;
  return !!(s[1] || s[2] || s[3] || s[4]);
}

/** Clear snap-orientation flags from snap map (Details horizontalSnap / verticalSnap). */
export function refreshSnapFlags(inst: MeterInstance): MeterInstance {
  if (!meterHasSnap(inst)) {
    const next = { ...inst };
    delete next.horizontalSnap;
    delete next.verticalSnap;
    return next;
  }
  const s = inst.snap || {};
  const horizontal = !!(s[1] || s[3]);
  const vertical = !!(s[2] || s[4]);
  return {
    ...inst,
    horizontalSnap: horizontal || undefined,
    verticalSnap: vertical || undefined,
  };
}

/**
 * Propagate frame size within a snap group (Details resize rules).
 * Horizontal row: share height; width stays per-window.
 * Vertical stack: share width; height stays per-window.
 */
export function applyGroupFrameSize(
  instances: MeterInstance[],
  resizedId: string,
  size: { frameW?: number; frameH?: number },
): MeterInstance[] {
  const source = instances.find((m) => m.id === resizedId);
  if (!source) return instances;
  if (!meterHasSnap(source)) {
    return instances.map((m) => (m.id === resizedId ? { ...m, ...size } : m));
  }
  const group = getMeterGroup(instances, resizedId);
  const ids = new Set(group.map((g) => g.id));
  const snap = source.snap || {};
  const shareH = !!source.horizontalSnap || !!(snap[1] || snap[3]);
  const shareW = !!source.verticalSnap || !!(snap[2] || snap[4]);
  return instances.map((m) => {
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

/** BFS collect all meters in the same snap group. */
export function getMeterGroup(
  instances: MeterInstance[],
  startId: string,
): MeterInstance[] {
  const byId: Record<string, MeterInstance> = {};
  for (let i = 0; i < instances.length; i++) {
    byId[instances[i].id] = instances[i];
  }
  const start = byId[startId];
  if (!start) return [];
  const out: MeterInstance[] = [];
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
    const sides: SnapSide[] = [1, 2, 3, 4];
    for (let i = 0; i < sides.length; i++) {
      const nid = snap[sides[i]];
      if (nid && !seen.has(nid)) queue.push(nid);
    }
  }
  return out;
}

/** Clear all snap links involving `id`. */
export function ungroupMeter(
  instances: MeterInstance[],
  id: string,
): MeterInstance[] {
  return instances.map((m) => {
    if (m.id === id) {
      return refreshSnapFlags({ ...m, snap: emptySnap() });
    }
    const snap = m.snap;
    if (!snap) return m;
    const next: MeterSnapMap = { ...snap };
    let changed = false;
    const sides: SnapSide[] = [1, 2, 3, 4];
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
export function groupMeters(
  instances: MeterInstance[],
  aId: string,
  bId: string,
  sideOnA: SnapSide,
): MeterInstance[] {
  if (aId === bId) return instances;
  const opp = oppositeSnapSide(sideOnA);
  return instances.map((m) => {
    if (m.id === aId) {
      const snap: MeterSnapMap = { ...(m.snap || {}) };
      snap[sideOnA] = bId;
      return { ...m, snap };
    }
    if (m.id === bId) {
      const snap: MeterSnapMap = { ...(m.snap || {}) };
      snap[opp] = aId;
      return { ...m, snap };
    }
    return m;
  });
}

/** Propagate percent position delta to every member of the group (same anchors). */
export function moveMeterGroup(
  instances: MeterInstance[],
  movedId: string,
  newPos: PanelPos,
): MeterInstance[] {
  const byId: Record<string, MeterInstance> = {};
  for (let i = 0; i < instances.length; i++) {
    byId[instances[i].id] = instances[i];
  }
  const moved = byId[movedId];
  if (!moved) return instances;
  const old = moved.pos;
  const dx = newPos.x - old.x;
  const dy = newPos.y - old.y;
  if (dx === 0 && dy === 0) {
    return instances.map((m) =>
      m.id === movedId ? { ...m, pos: { ...newPos } } : m,
    );
  }
  const group = getMeterGroup(instances, movedId);
  if (group.length <= 1) {
    return instances.map((m) =>
      m.id === movedId ? { ...m, pos: { ...newPos } } : m,
    );
  }
  const groupIds = new Set(group.map((g) => g.id));
  return instances.map((m) => {
    if (!groupIds.has(m.id)) return m;
    if (m.id === movedId) return { ...m, pos: { ...newPos } };
    // Only shift peers that share the same anchor family.
    if ((m.pos.anchor || "tl") !== (newPos.anchor || old.anchor || "tl")) {
      return m;
    }
    return {
      ...m,
      pos: {
        ...m.pos,
        x: m.pos.x + dx,
        y: m.pos.y + dy,
      },
    };
  });
}

/** Match peer frame height when snapping horizontally. */
export function matchGroupHeight(
  instances: MeterInstance[],
  id: string,
  height: number,
): MeterInstance[] {
  const group = getMeterGroup(instances, id);
  if (group.length <= 1) {
    return instances.map((m) => (m.id === id ? { ...m, frameH: height } : m));
  }
  const ids = new Set(group.map((g) => g.id));
  return instances.map((m) => (ids.has(m.id) ? { ...m, frameH: height } : m));
}

export type EdgeCandidate = {
  otherId: string;
  sideOnSelf: SnapSide;
  gap: number;
};

const DEFAULT_SNAP_PX = 36;
const GROUP_GAP_PX = 0;

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
  thresholdPx = DEFAULT_SNAP_PX,
): EdgeCandidate | null {
  let best: EdgeCandidate | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    if (o.id === selfId) continue;
    const r = o.rect;
    const candidates: Array<{ side: SnapSide; gap: number; align: number }> = [
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
export function attachMeterEdge(
  instances: MeterInstance[],
  selfId: string,
  otherId: string,
  sideOnSelf: SnapSide,
  selfRect: { left: number; right: number; top: number; bottom: number },
  otherRect: { left: number; right: number; top: number; bottom: number },
  rootW: number,
  rootH: number,
): MeterInstance[] {
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

  const byId: Record<string, MeterInstance> = {};
  for (let i = 0; i < instances.length; i++)
    byId[instances[i].id] = instances[i];
  const self = byId[selfId];
  const other = byId[otherId];
  if (!self || !other) return instances;

  const alignedPos = nudgePosByPixels(self.pos, dx, dy, rootW, rootH);
  // Match height on horizontal attach.
  const matchH = sideOnSelf === 1 || sideOnSelf === 3;
  const h = matchH
    ? other.frameH ||
      self.frameH ||
      Math.round(otherRect.bottom - otherRect.top)
    : self.frameH;

  let next = instances.map((m) => {
    if (m.id !== selfId) return m;
    return {
      ...m,
      pos: alignedPos,
      frameH: h != null ? h : m.frameH,
    };
  });
  next = groupMeters(next, selfId, otherId, sideOnSelf);
  if (matchH && h != null) next = matchGroupHeight(next, selfId, h);
  return next.map(refreshSnapFlags);
}

function isMeterSnapPeer(inst: MeterInstance): boolean {
  if (inst.visible === false) return false;
  if (
    inst.presentation === "details" ||
    inst.presentation === "death_log" ||
    inst.presentation === "encounter" ||
    inst.presentation === "timeline"
  ) {
    return false;
  }
  return true;
}

function meterSnapPeerRects(
  instances: MeterInstance[],
  selfId: string,
): Array<{
  id: string;
  rect: { left: number; right: number; top: number; bottom: number };
}> {
  if (typeof document === "undefined") return [];
  const others: Array<{
    id: string;
    rect: { left: number; right: number; top: number; bottom: number };
  }> = [];
  for (let i = 0; i < instances.length; i++) {
    const m = instances[i];
    if (m.id === selfId || !isMeterSnapPeer(m)) continue;
    const el = document.querySelector(
      `.comm-pos-panel.comm-pos-${cssEscape(m.id)}`,
    ) as HTMLElement | null;
    if (!el) continue;
    others.push({ id: m.id, rect: el.getBoundingClientRect() });
  }
  return others;
}

/** Live snap target while dragging (highlights peer before drop). */
export function findMeterSnapPreviewTarget(
  instances: MeterInstance[],
  selfId: string,
  thresholdPx = DEFAULT_SNAP_PX,
): string | null {
  if (typeof document === "undefined") return null;
  const selfEl = document.querySelector(
    `.comm-pos-panel.comm-pos-${cssEscape(selfId)}`,
  ) as HTMLElement | null;
  if (!selfEl) return null;
  const selfRect = selfEl.getBoundingClientRect();
  const others = meterSnapPeerRects(instances, selfId);
  const cand = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
  return cand ? cand.otherId : null;
}

/**
 * Try to snap `selfId` to a nearby meter after a drag ends.
 */
export function trySnapMeterOnDrop(
  instances: MeterInstance[],
  selfId: string,
  thresholdPx = DEFAULT_SNAP_PX,
): MeterInstance[] {
  if (typeof document === "undefined") return instances;
  const selfEl = document.querySelector(
    `.comm-pos-panel.comm-pos-${cssEscape(selfId)}`,
  ) as HTMLElement | null;
  if (!selfEl) return instances;
  const selfRect = selfEl.getBoundingClientRect();
  const others = meterSnapPeerRects(instances, selfId);
  const cand = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
  if (!cand) return instances;
  const peer = others.find((o) => o.id === cand.otherId);
  if (!peer) return instances;
  const rootEl =
    (typeof document !== "undefined" &&
      (document.getElementById("comm-ui") ||
        document.getElementById("game") ||
        document.body)) ||
    null;
  const root = rootEl
    ? rootEl.getBoundingClientRect()
    : { width: window.innerWidth, height: window.innerHeight };
  return attachMeterEdge(
    instances,
    selfId,
    cand.otherId,
    cand.sideOnSelf,
    selfRect,
    peer.rect,
    root.width || window.innerWidth,
    root.height || window.innerHeight,
  );
}

function cssEscape(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
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
