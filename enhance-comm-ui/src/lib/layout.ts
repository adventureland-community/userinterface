/** Viewport-relative panel placement (percent of #comm-ui / screen). */

import type { ViewportProfile } from "./viewport";
import type { EdgeSnapMap } from "./panelEdgeGroup";

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
};

export type PanelId =
  | "players"
  | "enemies"
  | "topCenter"
  | "paperdoll"
  | "buffInfo"
  | "itemInfo"
  | "kills"
  | "playerFrame"
  | "targetFrame"
  | "bossBar"
  | "crypt"
  | "threat"
  | "command"
  | "bag"
  | "toggles";

export const PANEL_IDS: PanelId[] = [
  "players",
  "enemies",
  "topCenter",
  "paperdoll",
  "buffInfo",
  "itemInfo",
  "kills",
  "playerFrame",
  "targetFrame",
  "bossBar",
  "crypt",
  "threat",
  "command",
  "bag",
  "toggles",
];

export const PANEL_LABELS: Record<PanelId, string> = {
  players: "Players",
  enemies: "Enemies",
  topCenter: "Server / Map",
  paperdoll: "Paperdoll",
  buffInfo: "Buff info",
  itemInfo: "Item info",
  kills: "Kills",
  playerFrame: "Player frame",
  targetFrame: "Target frame",
  bossBar: "Boss bar",
  crypt: "Crypt progress",
  threat: "Threat",
  command: "Command",
  bag: "Bag",
  toggles: "Layout",
};

/** Legacy meter panel ids — migrated into settings.meterInstances. */
export const LEGACY_METER_PANEL_IDS = [
  "combat",
  "pdps",
  "hitDps",
  "coopV1",
  "coopV2",
] as const;

/**
 * Desktop default from playtested export (2026-08-13 v2).
 * Saved layouts need Layout → Reset positions (desktop profile) to pick these up.
 */
export const DEFAULT_LAYOUT_DESKTOP: Record<PanelId, PanelPos> = {
  players: {
    x: 0.4,
    y: 0.4,
    anchor: "tl",
    locked: true,
    frameW: 522,
    frameH: 65.25,
  },
  enemies: { x: 99.6, y: 0.4, anchor: "tr", frameW: 169.65, frameH: 52.2 },
  topCenter: { x: 50, y: 0.4, anchor: "tc", frameW: 78.3, frameH: 78.3 },
  paperdoll: { x: 0.5, y: 30, anchor: "tl", frameW: 274.05, frameH: 535.05 },
  buffInfo: { x: 0.8, y: 10, anchor: "tl", frameW: 195.75, frameH: 247.95 },
  itemInfo: { x: 16.8, y: 10, anchor: "tl", frameW: 195.75, frameH: 247.95 },
  kills: { x: 27, y: 99.2, anchor: "br", frameW: 274.05, frameH: 182.7 },
  playerFrame: { x: 40.5, y: 86, anchor: "bc", frameW: 365.4, frameH: 143.55 },
  targetFrame: { x: 60, y: 86, anchor: "bc", frameW: 365.4, frameH: 143.55 },
  bossBar: { x: 50, y: 8, anchor: "tc", frameW: 522, frameH: 104.4 },
  crypt: { x: 50, y: 18, anchor: "tc", frameW: 234.9, frameH: 287.1 },
  threat: { x: 99.669, y: 68, anchor: "br", frameW: 326.25, frameH: 117.45 },
  command: { x: 50, y: 42, anchor: "center", frameW: 561.15, frameH: 300.15 },
  // Content-sized: fixed frameW/H shrinks #bottomleftcorner and wraps the
  // stock 7-col float inventory into broken rows (see BagPanel / ea1515d).
  bag: { x: 0.5, y: 99.2, anchor: "bl" },
  toggles: { x: 99.5, y: 99.2, anchor: "br" },
};

/**
 * Landscape tablet: combat/threat as right drawer, bag as left drawer,
 * command as centered sheet, meters tucked TR.
 */
export const DEFAULT_LAYOUT_TABLET: Record<PanelId, PanelPos> = {
  players: { x: 0.5, y: 0.5, anchor: "tl" },
  enemies: { x: 99.5, y: 0.5, anchor: "tr" },
  topCenter: { x: 50, y: 0.5, anchor: "tc" },
  paperdoll: { x: 1, y: 28, anchor: "tl" },
  buffInfo: { x: 1, y: 12, anchor: "tl" },
  itemInfo: { x: 17, y: 12, anchor: "tl" },
  kills: { x: 99.2, y: 72, anchor: "tr" },
  playerFrame: { x: 32, y: 78, anchor: "bc" },
  targetFrame: { x: 68, y: 78, anchor: "bc" },
  bossBar: { x: 50, y: 9, anchor: "tc" },
  crypt: { x: 50, y: 19, anchor: "tc" },
  threat: { x: 99.2, y: 40, anchor: "tr" },
  command: { x: 50, y: 44, anchor: "center" },
  bag: { x: 0.8, y: 78, anchor: "bl" },
  toggles: { x: 99.2, y: 98.5, anchor: "br" },
};

/**
 * Portrait phone: sheets for combat/bag/command; frames above chrome;
 * meters mostly off-canvas edge so core frames stay usable.
 */
export const DEFAULT_LAYOUT_PHONE: Record<PanelId, PanelPos> = {
  players: { x: 0.5, y: 0.5, anchor: "tl" },
  enemies: { x: 99.5, y: 0.5, anchor: "tr" },
  topCenter: { x: 50, y: 0.4, anchor: "tc" },
  paperdoll: { x: 50, y: 36, anchor: "center" },
  buffInfo: { x: 2, y: 14, anchor: "tl" },
  itemInfo: { x: 2, y: 36, anchor: "tl" },
  kills: { x: 98, y: 58, anchor: "br" },
  playerFrame: { x: 28, y: 62, anchor: "bc" },
  targetFrame: { x: 72, y: 62, anchor: "bc" },
  bossBar: { x: 50, y: 10, anchor: "tc" },
  crypt: { x: 50, y: 18, anchor: "tc" },
  threat: { x: 50, y: 48, anchor: "tc" },
  command: { x: 50, y: 42, anchor: "center" },
  bag: { x: 50, y: 88, anchor: "bc" },
  toggles: { x: 98, y: 98, anchor: "br" },
};

/** @deprecated alias — prefer DEFAULT_LAYOUT_DESKTOP / defaultLayoutFor */
export const DEFAULT_LAYOUT = DEFAULT_LAYOUT_DESKTOP;

export function defaultLayoutFor(
  profile: ViewportProfile,
): Record<PanelId, PanelPos> {
  switch (profile) {
    case "desktop":
      return DEFAULT_LAYOUT_DESKTOP;
    case "tablet":
      return DEFAULT_LAYOUT_TABLET;
    case "phone":
      return DEFAULT_LAYOUT_PHONE;
    default: {
      const _exhaustive: never = profile;
      return _exhaustive;
    }
  }
}

export type PanelLayoutMap = Partial<Record<PanelId, PanelPos>>;

/**
 * Migrate legacy shared `infoDialog` into `buffInfo` + `itemInfo`
 * (item offset so the two frames do not stack).
 */
export function migrateLegacyInfoDialog(
  partial?: PanelLayoutMap | null,
): PanelLayoutMap | null | undefined {
  if (!partial || typeof partial !== "object") return partial;
  const raw = partial as Record<string, PanelPos | undefined>;
  if (!raw.infoDialog) return partial;
  const legacy = raw.infoDialog;
  const out: PanelLayoutMap = { ...partial };
  delete (out as Record<string, unknown>).infoDialog;
  if (!out.buffInfo) out.buffInfo = { ...legacy };
  if (!out.itemInfo) {
    const x = typeof legacy.x === "number" ? Math.min(100, legacy.x + 16) : 16;
    out.itemInfo = { x, y: legacy.y, anchor: legacy.anchor };
  }
  return out;
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
  return out;
}

export function mergeLayout(
  partial?: PanelLayoutMap | null,
  profile: ViewportProfile = "desktop",
): Record<PanelId, PanelPos> {
  const migrated = migrateLegacyInfoDialog(partial);
  const defaults = defaultLayoutFor(profile);
  const out = {} as Record<PanelId, PanelPos>;
  for (let i = 0; i < PANEL_IDS.length; i++) {
    const id = PANEL_IDS[i];
    out[id] = normalizePos(migrated && migrated[id], defaults[id]);
  }
  // Bag inventory is float-grid content-sized — never lock shell width/height.
  if (out.bag) {
    delete out.bag.frameW;
    delete out.bag.frameH;
  }
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
  return next;
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
    pointerEvents: "auto",
    zIndex: editing ? 40 : 20,
    // Hug children so layout chrome matches real frame footprints.
    width: "fit-content",
    height: "fit-content",
    // Viewport ceiling so windows can fill the screen (was 96vw/96vh).
    maxWidth: "100vw",
    maxHeight: "100vh",
    boxSizing: "border-box",
  };
  if (typeof pos.frameW === "number" && pos.frameW > 0) {
    style.width = Math.round(pos.frameW) + "px";
  }
  if (typeof pos.frameH === "number" && pos.frameH > 0) {
    style.height = Math.round(pos.frameH) + "px";
  }
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
