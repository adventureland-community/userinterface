/** Viewport-relative panel placement (percent of #comm-ui / screen). */

import type { ViewportProfile } from "./viewport";
import type { EdgeSnapMap } from "./panelEdgeGroup";
import { defaultLayoutFor } from "./layoutDefaults";
import { applyFrameMigrations } from "./layoutFrameMigrations";
import {
  PANEL_IDS,
  PANEL_LABELS,
  applyWindowFramePersist,
  isPanelId,
  type PanelId,
} from "./panelCatalog";

export type { PanelId };
export { PANEL_IDS, PANEL_LABELS, isPanelId };

export type LayoutAnchor = "tl" | "tr" | "bl" | "br" | "tc" | "bc" | "center";

export type PanelPos = {
  /** 0–100, percent of container width */
  x: number;
  /** 0–100, percent of container height */
  y: number;
  /** Which point of the panel sits on (x,y). */
  anchor: LayoutAnchor;
  /** Edge-snap neighbor links (Comm panel groups). */
  snap?: EdgeSnapMap;
  /** Side-by-side group — share height when frame sizes exist. */
  horizontalSnap?: boolean;
  /** Stacked group — share width when frame sizes exist. */
  verticalSnap?: boolean;
  /**
   * Per-window lock (Details). `undefined` follows global windowsLocked.
   * `false` = unlocked arrange; `true` = locked.
   */
  locked?: boolean;
  /** Details window_scale — applied to snap group when changed from options/wheel. */
  scale?: number;
  /** Persisted outer box size (HUD PositionedPanel resize). */
  frameW?: number;
  frameH?: number;
  /**
   * When true, ignore frameW/H and hug content. Party defaults on.
   * Corner-resize turns this off.
   */
  autoSize?: boolean;
};

/** Legacy meter panel ids — migrated into settings.meterInstances. */
export const LEGACY_METER_PANEL_IDS = [
  "combat",
  "pdps",
  "hitDps",
  "coopV1",
  "coopV2",
] as const;

export {
  DEFAULT_LAYOUT_DESKTOP,
  DEFAULT_LAYOUT_TABLET,
  DEFAULT_LAYOUT_PHONE,
  DEFAULT_LAYOUT,
  defaultLayoutFor,
} from "./layoutDefaults";

export type PanelLayoutMap = Partial<Record<PanelId, PanelPos>>;

function copyLegacyPos(legacy: PanelPos, extra?: Partial<PanelPos>): PanelPos {
  const out: PanelPos = {
    x: legacy.x,
    y: legacy.y,
    anchor: legacy.anchor,
  };
  if (legacy.locked != null) out.locked = legacy.locked;
  if (legacy.scale != null) out.scale = legacy.scale;
  if (legacy.snap) out.snap = legacy.snap;
  if (legacy.horizontalSnap) out.horizontalSnap = true;
  if (legacy.verticalSnap) out.verticalSnap = true;
  if (legacy.frameW != null) out.frameW = legacy.frameW;
  if (legacy.frameH != null) out.frameH = legacy.frameH;
  if (legacy.autoSize != null) out.autoSize = legacy.autoSize;
  if (extra) Object.assign(out, extra);
  return out;
}

/**
 * Split retired panel ids: infoDialog → buffInfo+itemInfo,
 * topCenter → serverInfo+mapInfo, crypt → instance+instanceRun.
 * Used by mergeLayout and layout import sanitize — one copy only.
 */
export function migrateLegacyPanelIds(
  partial?: PanelLayoutMap | null,
): PanelLayoutMap | null | undefined {
  if (!partial || typeof partial !== "object") return partial;
  const raw = partial as Record<string, PanelPos | undefined>;
  const out: PanelLayoutMap = { ...partial };
  let changed = false;

  if (raw.infoDialog) {
    const legacy = raw.infoDialog;
    delete (out as Record<string, unknown>).infoDialog;
    if (!out.buffInfo) out.buffInfo = copyLegacyPos(legacy);
    if (!out.itemInfo) {
      const x =
        typeof legacy.x === "number" ? Math.min(100, legacy.x + 16) : 16;
      out.itemInfo = copyLegacyPos(legacy, { x });
    }
    changed = true;
  }

  if (raw.topCenter) {
    const legacy = raw.topCenter;
    delete (out as Record<string, unknown>).topCenter;
    if (!out.serverInfo) {
      out.serverInfo = applyWindowFramePersist(
        copyLegacyPos(legacy),
        "serverInfo",
      );
    }
    if (!out.mapInfo) {
      const y =
        typeof legacy.y === "number" ? Math.min(100, legacy.y + 4.5) : 5;
      out.mapInfo = applyWindowFramePersist(
        copyLegacyPos(legacy, { y }),
        "mapInfo",
      );
    }
    changed = true;
  }

  if (raw.crypt) {
    const legacy = raw.crypt;
    delete (out as Record<string, unknown>).crypt;
    if (!out.instance) out.instance = copyLegacyPos(legacy);
    if (!out.instanceRun) {
      const y = typeof legacy.y === "number" ? Math.max(0, legacy.y - 4) : 14;
      out.instanceRun = copyLegacyPos(legacy, {
        y,
        frameW: 220,
        frameH: 70,
      });
    }
    changed = true;
  }

  return changed ? out : partial;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function normalizePos(raw: any, fallback: PanelPos): PanelPos {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const anchor = (raw.anchor || fallback.anchor) as LayoutAnchor;
  const valid: LayoutAnchor[] = ["tl", "tr", "bl", "br", "tc", "bc", "center"];
  const out: PanelPos = {
    x: clamp(Number(raw.x), 0, 100) || 0,
    y: clamp(Number(raw.y), 0, 100) || 0,
    anchor: valid.indexOf(anchor) >= 0 ? anchor : fallback.anchor,
  };
  if (raw.snap && typeof raw.snap === "object") {
    const snap: EdgeSnapMap = {};
    const sides = [1, 2, 3, 4] as const;
    for (let i = 0; i < sides.length; i++) {
      const side = sides[i];
      const nid = raw.snap[side];
      if (typeof nid === "string" && nid) snap[side] = nid;
    }
    if (snap[1] || snap[2] || snap[3] || snap[4]) out.snap = snap;
  }
  if (raw.horizontalSnap) out.horizontalSnap = true;
  if (raw.verticalSnap) out.verticalSnap = true;
  if (typeof raw.locked === "boolean") out.locked = raw.locked;
  if (
    typeof raw.scale === "number" &&
    Number.isFinite(raw.scale) &&
    raw.scale > 0
  ) {
    out.scale = raw.scale;
  }
  if (typeof raw.frameW === "number" && raw.frameW > 0) {
    out.frameW = raw.frameW;
  }
  if (typeof raw.frameH === "number" && raw.frameH > 0) {
    out.frameH = raw.frameH;
  }
  if (typeof raw.autoSize === "boolean") out.autoSize = raw.autoSize;
  else if (typeof fallback.autoSize === "boolean") {
    out.autoSize = fallback.autoSize;
  }
  return out;
}

export function mergeLayout(
  partial?: PanelLayoutMap | null,
  profile: ViewportProfile = "desktop",
  opts?: { migrateFrames?: boolean },
): Record<PanelId, PanelPos> {
  const migrated = migrateLegacyPanelIds(partial);
  const defaults = defaultLayoutFor(profile);
  const out = {} as Record<PanelId, PanelPos>;
  for (let i = 0; i < PANEL_IDS.length; i++) {
    const id = PANEL_IDS[i];
    out[id] = applyWindowFramePersist(
      normalizePos(migrated && migrated[id], defaults[id]),
      id,
    );
  }
  if (opts?.migrateFrames) applyFrameMigrations(out, defaults);
  return out;
}

export function anchorTransform(anchor: LayoutAnchor): string {
  switch (anchor) {
    case "tl":
      return "translate(0, 0)";
    case "tr":
      return "translate(-100%, 0)";
    case "bl":
      return "translate(0, -100%)";
    case "br":
      return "translate(-100%, -100%)";
    case "tc":
      return "translate(-50%, 0)";
    case "bc":
      return "translate(-50%, -100%)";
    case "center":
      return "translate(-50%, -50%)";
    default: {
      const _exhaustive: never = anchor;
      return _exhaustive;
    }
  }
}

/** Keep the anchored corner fixed when applying window scale. */
export function anchorOrigin(anchor: LayoutAnchor): string {
  switch (anchor) {
    case "tl":
      return "0% 0%";
    case "tr":
      return "100% 0%";
    case "bl":
      return "0% 100%";
    case "br":
      return "100% 100%";
    case "tc":
      return "50% 0%";
    case "bc":
      return "50% 100%";
    case "center":
      return "50% 50%";
    default: {
      const _exhaustive: never = anchor;
      return _exhaustive;
    }
  }
}

/** Offset from the anchored (x,y) point to the panel's top-left corner. */
export function anchorToTopLeftOffset(
  anchor: LayoutAnchor,
  widthPx: number,
  heightPx: number,
): { ox: number; oy: number } {
  switch (anchor) {
    case "tl":
      return { ox: 0, oy: 0 };
    case "tr":
      return { ox: -widthPx, oy: 0 };
    case "bl":
      return { ox: 0, oy: -heightPx };
    case "br":
      return { ox: -widthPx, oy: -heightPx };
    case "tc":
      return { ox: -widthPx / 2, oy: 0 };
    case "bc":
      return { ox: -widthPx / 2, oy: -heightPx };
    case "center":
      return { ox: -widthPx / 2, oy: -heightPx / 2 };
    default: {
      const _exhaustive: never = anchor;
      return _exhaustive;
    }
  }
}

/**
 * Switch stretch/anchor while keeping the painted box in place.
 * Falls back to `{ ...pos, anchor }` if sizes are unusable.
 */
export function reanchorKeepingVisual(
  pos: PanelPos,
  nextAnchor: LayoutAnchor,
  panelW: number,
  panelH: number,
  rootW: number,
  rootH: number,
): PanelPos {
  if (pos.anchor === nextAnchor) return pos;
  if (!(panelW > 0 && panelH > 0 && rootW > 0 && rootH > 0)) {
    return { ...pos, anchor: nextAnchor };
  }
  const ax = (pos.x / 100) * rootW;
  const ay = (pos.y / 100) * rootH;
  const cur = anchorToTopLeftOffset(pos.anchor, panelW, panelH);
  const left = ax + cur.ox;
  const top = ay + cur.oy;
  const next = anchorToTopLeftOffset(nextAnchor, panelW, panelH);
  const newAx = left - next.ox;
  const newAy = top - next.oy;
  return {
    x: clamp((newAx / rootW) * 100, 0, 100),
    y: clamp((newAy / rootH) * 100, 0, 100),
    anchor: nextAnchor,
  };
}

/**
 * Build a PanelPos whose anchor point places the painted box at top-left
 * `(leftPx, topPx)` inside the root (Details-style restore after sizing).
 */
export function panelPosFromTopLeft(
  leftPx: number,
  topPx: number,
  widthPx: number,
  heightPx: number,
  anchor: LayoutAnchor,
  rootW: number,
  rootH: number,
  keep?: Partial<PanelPos>,
): PanelPos {
  const off = anchorToTopLeftOffset(anchor, widthPx, heightPx);
  const ax = leftPx - off.ox;
  const ay = topPx - off.oy;
  const next: PanelPos = {
    x: clamp(rootW > 0 ? (ax / rootW) * 100 : 0, 0, 100),
    y: clamp(rootH > 0 ? (ay / rootH) * 100 : 0, 0, 100),
    anchor,
  };
  if (keep?.snap) next.snap = keep.snap;
  if (keep?.horizontalSnap) next.horizontalSnap = keep.horizontalSnap;
  if (keep?.verticalSnap) next.verticalSnap = keep.verticalSnap;
  if (keep?.locked != null) next.locked = keep.locked;
  if (keep?.scale != null) next.scale = keep.scale;
  if (keep?.frameW != null) next.frameW = keep.frameW;
  if (keep?.frameH != null) next.frameH = keep.frameH;
  if (keep?.autoSize != null) next.autoSize = keep.autoSize;
  return next;
}

/**
 * Painted top-left of a panel inside the root (CSS px), for the current anchor.
 * `paintedW` / `paintedH` must be the on-screen box size (include scale).
 */
export function paintedBoxInRoot(
  pos: PanelPos,
  paintedW: number,
  paintedH: number,
  rootW: number,
  rootH: number,
): { left: number; top: number; right: number; bottom: number } {
  const ax = (pos.x / 100) * rootW;
  const ay = (pos.y / 100) * rootH;
  const off = anchorToTopLeftOffset(pos.anchor, paintedW, paintedH);
  const left = ax + off.ox;
  const top = ay + off.oy;
  return {
    left,
    top,
    right: left + paintedW,
    bottom: top + paintedH,
  };
}

/**
 * Keep the *painted* box inside the root. Anchor % alone is not enough —
 * center/bottom anchors at y≈0 put Command (and friends) above the screen.
 * If the panel is taller/wider than the root, pin to the top/left so the
 * titlebar / drag chrome stays reachable.
 */
export function clampPanelPosInRoot(
  pos: PanelPos,
  paintedW: number,
  paintedH: number,
  rootW: number,
  rootH: number,
  pad = 0,
): PanelPos {
  if (!(paintedW > 0 && paintedH > 0 && rootW > 0 && rootH > 0)) {
    return {
      ...pos,
      x: clamp(pos.x, 0, 100),
      y: clamp(pos.y, 0, 100),
    };
  }
  const box = paintedBoxInRoot(pos, paintedW, paintedH, rootW, rootH);
  let left = box.left;
  let top = box.top;
  const maxLeft = Math.max(pad, rootW - paintedW - pad);
  const maxTop = Math.max(pad, rootH - paintedH - pad);
  left = clamp(left, pad, maxLeft);
  top = clamp(top, pad, maxTop);
  if (left === box.left && top === box.top) {
    return {
      ...pos,
      x: clamp(pos.x, 0, 100),
      y: clamp(pos.y, 0, 100),
    };
  }
  return panelPosFromTopLeft(
    left,
    top,
    paintedW,
    paintedH,
    pos.anchor,
    rootW,
    rootH,
    pos,
  );
}

/**
 * Rigid-shift a snap group so the union of painted boxes stays in the root.
 * Prefers top/left when the group is larger than the viewport.
 */
export function clampPanelGroupInRoot(
  members: { pos: PanelPos; paintedW: number; paintedH: number }[],
  rootW: number,
  rootH: number,
  pad = 0,
): PanelPos[] {
  if (!members.length || !(rootW > 0 && rootH > 0)) {
    return members.map((m) => m.pos);
  }
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    if (!(m.paintedW > 0 && m.paintedH > 0)) continue;
    const box = paintedBoxInRoot(m.pos, m.paintedW, m.paintedH, rootW, rootH);
    if (box.left < minL) minL = box.left;
    if (box.top < minT) minT = box.top;
    if (box.right > maxR) maxR = box.right;
    if (box.bottom > maxB) maxB = box.bottom;
  }
  if (!Number.isFinite(minL)) return members.map((m) => m.pos);

  let dx = 0;
  let dy = 0;
  const spanW = maxR - minL;
  const spanH = maxB - minT;
  if (spanW >= rootW - 2 * pad) dx = pad - minL;
  else if (minL < pad) dx = pad - minL;
  else if (maxR > rootW - pad) dx = rootW - pad - maxR;
  if (spanH >= rootH - 2 * pad) dy = pad - minT;
  else if (minT < pad) dy = pad - minT;
  else if (maxB > rootH - pad) dy = rootH - pad - maxB;

  if (dx === 0 && dy === 0) return members.map((m) => m.pos);
  return members.map((m) => ({
    ...m.pos,
    x: m.pos.x + (dx / rootW) * 100,
    y: m.pos.y + (dy / rootH) * 100,
  }));
}

/** Compact labels for layout-edit anchor pad. */
export const LAYOUT_ANCHOR_OPTIONS: {
  id: LayoutAnchor;
  glyph: string;
  title: string;
}[] = [
  { id: "tl", glyph: "⌜", title: "Top-left — grows down & right" },
  { id: "tc", glyph: "⌃", title: "Top-center — grows down" },
  { id: "tr", glyph: "⌝", title: "Top-right — grows down & left" },
  { id: "center", glyph: "◆", title: "Center — grows both ways" },
  { id: "bl", glyph: "⌞", title: "Bottom-left — grows up & right" },
  { id: "bc", glyph: "⌄", title: "Bottom-center — grows up" },
  { id: "br", glyph: "⌟", title: "Bottom-right — grows up & left" },
];

/** 3×3 pad slots (null = no mid-side anchor). */
export const LAYOUT_ANCHOR_PAD: (LayoutAnchor | null)[][] = [
  ["tl", "tc", "tr"],
  [null, "center", null],
  ["bl", "bc", "br"],
];

/** Absolute style placing the panel at x%/y% of its offset parent. */
export function panelStyle(
  pos: PanelPos,
  editing?: boolean,
): Record<string, any> {
  const scale =
    typeof pos.scale === "number" && Number.isFinite(pos.scale) && pos.scale > 0
      ? pos.scale
      : 1;
  const base = anchorTransform(pos.anchor);
  const style: Record<string, any> = {
    position: "absolute",
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: scale === 1 ? base : `${base} scale(${scale})`,
    transformOrigin: anchorOrigin(pos.anchor),
    pointerEvents: "none",
    zIndex: editing ? 40 : 20,
    // Hug children so layout chrome matches real frame footprints.
    width: "fit-content",
    height: "fit-content",
    // Viewport ceiling so windows can fill the screen (was 96vw/96vh).
    maxWidth: "100vw",
    maxHeight: "100vh",
    boxSizing: "border-box",
  };
  // Saved frameW/H define the panel box — content reflows inside (scroll when tall).
  if (typeof pos.frameW === "number" && pos.frameW > 0) {
    const w = Math.round(pos.frameW);
    style.width = w + "px";
    style.minWidth = 0;
    style.maxWidth = "100vw";
    style.overflowX = "hidden";
  }
  if (typeof pos.frameH === "number" && pos.frameH > 0) {
    const h = Math.round(pos.frameH);
    style.height = h + "px";
    style.minHeight = 0;
    style.maxHeight = "100vh";
    style.overflowY = "auto";
  }
  return style;
}

/**
 * `panelStyle` always stamps idle z 20/40. Callers pass raise / meter stack
 * z on `props.style` — re-apply after Object.assign so click-to-front sticks.
 */
export function applyCallerStackZ(
  shellStyle: Record<string, any>,
  propsStyle: Record<string, any> | null | undefined,
): void {
  if (propsStyle && typeof propsStyle.zIndex === "number") {
    shellStyle.zIndex = propsStyle.zIndex;
  }
}

/**
 * Fill-frame shells keep overflow visible so above-frame arrange chrome
 * (lock / Window Control / hide × / drag grip) is not clipped.
 * `panelStyle` sets overflowX/Y as separate keys; those beat `overflow`.
 */
export function unclipShellOverflow(
  style: Record<string, any>,
): Record<string, any> {
  style.overflow = "visible";
  style.overflowX = "visible";
  style.overflowY = "visible";
  return style;
}

/** Convert a dragged screen delta into % of a container. */
export function deltaToPercent(
  dx: number,
  dy: number,
  containerW: number,
  containerH: number,
): { dxPct: number; dyPct: number } {
  return {
    dxPct: containerW > 0 ? (dx / containerW) * 100 : 0,
    dyPct: containerH > 0 ? (dy / containerH) * 100 : 0,
  };
}

/** Snap axis percent to mid / peer panel anchors when within threshold.
 * Screen edges (0/100) are intentionally omitted — use visual-box snap instead
 * so flush matches the painted panel, not the anchor point.
 */
export function snapPercent(
  n: number,
  threshold = 1.0,
  peerValues?: number[],
): number {
  const targets = [50];
  if (peerValues && peerValues.length) {
    for (let i = 0; i < peerValues.length; i++) {
      const v = peerValues[i];
      if (Number.isFinite(v)) targets.push(v);
    }
  }
  let best = n;
  let bestDist = threshold + 1;
  for (let i = 0; i < targets.length; i++) {
    const d = Math.abs(n - targets[i]);
    if (d < bestDist) {
      bestDist = d;
      best = targets[i];
    }
  }
  return bestDist <= threshold ? best : n;
}

export type VisualSnapStart = {
  panelLeft: number;
  panelTop: number;
  panelRight: number;
  panelBottom: number;
  rootLeft: number;
  rootTop: number;
  rootW: number;
  rootH: number;
  posX: number;
  posY: number;
};

/** Capture panel + container boxes at drag start for visual edge snap. */
export function captureVisualSnapStart(
  panelEl: HTMLElement | null,
  rootEl: HTMLElement | null,
  pos: PanelPos,
): VisualSnapStart | null {
  if (!panelEl || !rootEl) return null;
  const p = panelEl.getBoundingClientRect();
  const c = rootEl.getBoundingClientRect();
  if (c.width <= 0 || c.height <= 0) return null;
  return {
    panelLeft: p.left,
    panelTop: p.top,
    panelRight: p.right,
    panelBottom: p.bottom,
    rootLeft: c.left,
    rootTop: c.top,
    rootW: c.width,
    rootH: c.height,
    posX: pos.x,
    posY: pos.y,
  };
}

/**
 * Snap so the *painted* panel edges flush to the container — not the anchor %.
 * `thresholdPx` is intentionally small so near-edge placement stays free until
 * the box is almost touching.
 *
 * `snapX` / `snapY` stay true while within threshold — including already flush
 * (shift 0) — so callers must prefer these coords over grid snap, otherwise
 * grid pulls the panel a cell away from the edge every frame.
 */
export function snapDragToVisualEdges(
  clientX: number,
  clientY: number,
  pointerStart: { clientX: number; clientY: number },
  visual: VisualSnapStart,
  thresholdPx = 8,
): { x: number; y: number; snapX: boolean; snapY: boolean } {
  const dx = clientX - pointerStart.clientX;
  const dy = clientY - pointerStart.clientY;

  let left = visual.panelLeft + dx;
  let right = visual.panelRight + dx;
  let top = visual.panelTop + dy;
  let bottom = visual.panelBottom + dy;

  const cLeft = visual.rootLeft;
  const cRight = visual.rootLeft + visual.rootW;
  const cTop = visual.rootTop;
  const cBottom = visual.rootTop + visual.rootH;

  const distL = left - cLeft;
  const distR = cRight - right;
  const distT = top - cTop;
  const distB = cBottom - bottom;

  let shiftX = 0;
  let shiftY = 0;
  let snapX = false;
  let snapY = false;

  // Prefer the nearer side when both are close (avoid fighting).
  if (Math.abs(distL) <= thresholdPx || Math.abs(distR) <= thresholdPx) {
    if (Math.abs(distL) <= Math.abs(distR) && Math.abs(distL) <= thresholdPx) {
      shiftX = -distL;
      snapX = true;
    } else if (Math.abs(distR) <= thresholdPx) {
      shiftX = distR;
      snapX = true;
    }
  }
  if (Math.abs(distT) <= thresholdPx || Math.abs(distB) <= thresholdPx) {
    if (Math.abs(distT) <= Math.abs(distB) && Math.abs(distT) <= thresholdPx) {
      shiftY = -distT;
      snapY = true;
    } else if (Math.abs(distB) <= thresholdPx) {
      shiftY = distB;
      snapY = true;
    }
  }

  const x = clamp(visual.posX + ((dx + shiftX) / visual.rootW) * 100, 0, 100);
  const y = clamp(visual.posY + ((dy + shiftY) / visual.rootH) * 100, 0, 100);
  return { x, y, snapX, snapY };
}

/**
 * Soft nudge when a dropped panel lands nearly on top of another
 * (same anchor family). Keeps layouts readable without hard collision.
 */
export function softAvoidOverlap(
  id: PanelId | string,
  pos: PanelPos,
  others: Partial<Record<string, PanelPos>>,
  nudge = 3.2,
): PanelPos {
  const ids = Object.keys(others) as PanelId[];
  let x = pos.x;
  let y = pos.y;
  for (let i = 0; i < ids.length; i++) {
    const otherId = ids[i];
    if (otherId === id) continue;
    const o = others[otherId];
    if (!o || o.anchor !== pos.anchor) continue;
    const dx = Math.abs(o.x - x);
    const dy = Math.abs(o.y - y);
    if (dx < nudge && dy < nudge) {
      // Prefer sliding along the axis with more room.
      if (dx <= dy) {
        x = clamp(o.x + (x >= o.x ? nudge : -nudge), 0, 100);
      } else {
        y = clamp(o.y + (y >= o.y ? nudge : -nudge), 0, 100);
      }
    }
  }
  if (x === pos.x && y === pos.y) return pos;
  return { ...pos, x, y };
}
