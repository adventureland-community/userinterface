/** Viewport-relative panel placement (percent of #comm-ui / screen). */

export type LayoutAnchor = "tl" | "tr" | "bl" | "br" | "tc" | "bc" | "center";

export type PanelPos = {
  /** 0–100, percent of container width */
  x: number;
  /** 0–100, percent of container height */
  y: number;
  /** Which point of the panel sits on (x,y). */
  anchor: LayoutAnchor;
};

export type PanelId =
  | "players"
  | "enemies"
  | "topCenter"
  | "paperdoll"
  | "kills"
  | "combat"
  | "playerFrame"
  | "targetFrame"
  | "bossBar"
  | "threat"
  | "pdps"
  | "hitDps"
  | "coopV1"
  | "coopV2"
  | "command"
  | "bag"
  | "toggles";

export const PANEL_IDS: PanelId[] = [
  "players",
  "enemies",
  "topCenter",
  "paperdoll",
  "kills",
  "combat",
  "playerFrame",
  "targetFrame",
  "bossBar",
  "threat",
  "pdps",
  "hitDps",
  "coopV1",
  "coopV2",
  "command",
  "bag",
  "toggles",
];

export const PANEL_LABELS: Record<PanelId, string> = {
  players: "Players",
  enemies: "Enemies",
  topCenter: "Server / Map",
  paperdoll: "Paperdoll",
  kills: "Kills",
  combat: "Combat",
  playerFrame: "Player frame",
  targetFrame: "Target frame",
  bossBar: "Boss bar",
  threat: "Threat",
  pdps: "PDPS",
  hitDps: "Hit DPS",
  coopV1: "Coop V1",
  coopV2: "Coop V2",
  command: "Command",
  bag: "Bag",
  toggles: "Layout",
};

/**
 * Clean default: players TL, enemies TR, topCenter TC,
 * playerFrame + targetFrame side-by-side above observe chrome,
 * paperdoll mid-left (left column kept clear),
 * bag lower-left above chrome, combat+kills deep BR (inboard of meters),
 * threat above combat/kills, Layout small BR.
 * Reset positions reloads these via mergeLayout(null).
 */
export const DEFAULT_LAYOUT: Record<PanelId, PanelPos> = {
  players: { x: 0.4, y: 0.4, anchor: "tl" },
  enemies: { x: 99.6, y: 0.4, anchor: "tr" },
  topCenter: { x: 50, y: 0.4, anchor: "tc" },
  paperdoll: { x: 0.5, y: 38, anchor: "tl" },
  // Deep bottom-right — clear of bottom chrome; inboard of meter column.
  combat: { x: 92, y: 84, anchor: "br" },
  kills: { x: 92, y: 95, anchor: "br" },
  // Sit clearly above stacked observe chrome (actions + chips strip).
  playerFrame: { x: 35, y: 80, anchor: "bc" },
  targetFrame: { x: 65, y: 80, anchor: "bc" },
  // Below topCenter server/map/crypt chrome (tc anchor, ~8% from top).
  bossBar: { x: 50, y: 8, anchor: "tc" },
  pdps: { x: 99.5, y: 18, anchor: "tr" },
  hitDps: { x: 99.5, y: 36, anchor: "tr" },
  coopV1: { x: 99.5, y: 54, anchor: "tr" },
  coopV2: { x: 99.5, y: 70, anchor: "tr" },
  threat: { x: 92, y: 64, anchor: "br" },
  command: { x: 50, y: 42, anchor: "center" },
  // Traditional inventory corner — above Follow/Bag/Command chrome.
  bag: { x: 0.8, y: 86, anchor: "bl" },
  toggles: { x: 99.5, y: 99.2, anchor: "br" },
};

export type PanelLayoutMap = Partial<Record<PanelId, PanelPos>>;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function normalizePos(raw: any, fallback: PanelPos): PanelPos {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const anchor = (raw.anchor || fallback.anchor) as LayoutAnchor;
  const valid: LayoutAnchor[] = [
    "tl",
    "tr",
    "bl",
    "br",
    "tc",
    "bc",
    "center",
  ];
  return {
    x: clamp(Number(raw.x), 0, 100) || 0,
    y: clamp(Number(raw.y), 0, 100) || 0,
    anchor: valid.indexOf(anchor) >= 0 ? anchor : fallback.anchor,
  };
}

export function mergeLayout(partial?: PanelLayoutMap | null): Record<PanelId, PanelPos> {
  const out = {} as Record<PanelId, PanelPos>;
  for (let i = 0; i < PANEL_IDS.length; i++) {
    const id = PANEL_IDS[i];
    out[id] = normalizePos(partial && partial[id], DEFAULT_LAYOUT[id]);
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

/** Absolute style placing the panel at x%/y% of its offset parent. */
export function panelStyle(pos: PanelPos, editing?: boolean): Record<string, any> {
  return {
    position: "absolute",
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: anchorTransform(pos.anchor),
    pointerEvents: "auto",
    zIndex: editing ? 40 : 20,
    // Hug children so layout chrome matches real frame footprints.
    width: "fit-content",
    height: "fit-content",
    maxWidth: "96vw",
    maxHeight: "96vh",
    boxSizing: "border-box",
  };
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

/** Snap axis percent to edges / mid when within threshold (layout edit). */
export function snapPercent(n: number, threshold = 2.2): number {
  const targets = [0, 50, 100];
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
