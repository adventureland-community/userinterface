/**
 * Single HUD panel catalog — identity, chrome, size, empty-hide.
 * Adding a window: one row here, then a renderer in CommPanelLayout.
 */

import { isTrackedInstanceMap } from "../instance/configs";

export type PanelId =
  | "players"
  | "enemies"
  | "serverInfo"
  | "mapInfo"
  | "paperdoll"
  | "buffInfo"
  | "itemInfo"
  | "kills"
  | "playerFrame"
  | "targetFrame"
  | "bossBar"
  | "instance"
  | "instanceRun"
  | "events"
  | "eventScore"
  | "eventRoster"
  | "abilityTimeline"
  | "abilityTimelineBigIcon"
  | "abilityTimelineHighlight"
  | "minimap"
  | "threat"
  | "command"
  | "bag"
  | "mail"
  | "toggles";

export type WindowFramePersist = "none" | "w" | "wh";
export type PanelAutoSize = "off" | "opt-in" | "default-on";
export type PanelEmptyWhen =
  "never" | "instanceMap" | "enemies" | "bosses" | "abilityCasters" | "threat";
/** hug = content / saved-frame overlay; fill = fixed saved box (scroll inside). */
export type PanelShell = "hug" | "fill";

export type PanelDef = {
  label: string;
  closable?: boolean;
  /** When closable, default show/hide. Omit = visible. */
  defaultVisible?: boolean;
  framePersist?: WindowFramePersist;
  autoSize?: PanelAutoSize;
  emptyWhen?: PanelEmptyWhen;
  shell?: PanelShell;
};

export type ResolvedPanelDef = {
  label: string;
  closable: boolean;
  defaultVisible: boolean;
  framePersist: WindowFramePersist;
  autoSize: PanelAutoSize;
  emptyWhen: PanelEmptyWhen;
  shell: PanelShell;
};

export const PANEL_CATALOG: Record<PanelId, PanelDef> = {
  players: {
    label: "Players",
    framePersist: "w",
    autoSize: "default-on",
  },
  enemies: { label: "Enemies", autoSize: "opt-in", emptyWhen: "enemies" },
  serverInfo: { label: "Server info", framePersist: "none" },
  mapInfo: { label: "Map info", framePersist: "none" },
  paperdoll: { label: "Paperdoll" },
  buffInfo: { label: "Buff info", autoSize: "default-on" },
  itemInfo: { label: "Item info", autoSize: "default-on" },
  kills: { label: "Kills", closable: true, autoSize: "default-on" },
  playerFrame: { label: "Player frame", closable: true, autoSize: "opt-in" },
  targetFrame: { label: "Target frame", closable: true, autoSize: "opt-in" },
  bossBar: {
    label: "Boss bar",
    closable: true,
    autoSize: "opt-in",
    emptyWhen: "bosses",
  },
  instance: {
    label: "Instance",
    closable: true,
    emptyWhen: "instanceMap",
    shell: "fill",
  },
  instanceRun: {
    label: "Instance run",
    closable: true,
    emptyWhen: "instanceMap",
    shell: "fill",
  },
  events: { label: "Events", closable: true, autoSize: "opt-in" },
  eventScore: { label: "Event score", closable: true, autoSize: "opt-in" },
  eventRoster: { label: "Event roster", closable: true, autoSize: "opt-in" },
  abilityTimeline: {
    label: "Ability timeline",
    closable: true,
    emptyWhen: "abilityCasters",
    shell: "fill",
  },
  abilityTimelineBigIcon: {
    label: "Ability big icon",
    closable: true,
    emptyWhen: "abilityCasters",
    shell: "fill",
  },
  abilityTimelineHighlight: {
    label: "Ability highlight",
    closable: true,
    emptyWhen: "abilityCasters",
    shell: "fill",
  },
  minimap: { label: "Minimap", closable: true, shell: "fill" },
  threat: {
    label: "Threat",
    closable: true,
    autoSize: "opt-in",
    emptyWhen: "threat",
    shell: "fill",
  },
  command: {
    label: "Command",
    closable: true,
    defaultVisible: false,
    autoSize: "default-on",
  },
  bag: { label: "Bag", closable: true, framePersist: "none" },
  mail: {
    label: "Mail",
    closable: true,
    defaultVisible: false,
    shell: "fill",
  },
  toggles: { label: "Layout", framePersist: "none" },
};

export const PANEL_IDS = Object.keys(PANEL_CATALOG) as PanelId[];

const PANEL_ID_SET = new Set<string>(PANEL_IDS);

export function isPanelId(id: string): id is PanelId {
  return PANEL_ID_SET.has(id);
}

export function panelDef(id: PanelId): ResolvedPanelDef {
  const d = PANEL_CATALOG[id];
  const closable = d.closable === true;
  return {
    label: d.label,
    closable,
    defaultVisible: closable && d.defaultVisible !== false,
    framePersist: d.framePersist || "wh",
    autoSize: d.autoSize || "off",
    emptyWhen: d.emptyWhen || "never",
    shell: d.shell || "hug",
  };
}

export const PANEL_LABELS: Record<PanelId, string> = (() => {
  const out = {} as Record<PanelId, string>;
  for (let i = 0; i < PANEL_IDS.length; i++) {
    const id = PANEL_IDS[i];
    out[id] = PANEL_CATALOG[id].label;
  }
  return out;
})();

export const CLOSABLE_PANEL_IDS = PANEL_IDS.filter(
  (id) => PANEL_CATALOG[id].closable === true,
);

export type ClosablePanelId = (typeof CLOSABLE_PANEL_IDS)[number];

export type PanelVisibleMap = Partial<Record<PanelId, boolean>>;

export const DEFAULT_PANEL_VISIBLE: Record<ClosablePanelId, boolean> = (() => {
  const out = {} as Record<ClosablePanelId, boolean>;
  for (let i = 0; i < CLOSABLE_PANEL_IDS.length; i++) {
    const id = CLOSABLE_PANEL_IDS[i];
    out[id] = panelDef(id).defaultVisible;
  }
  return out;
})();

export function mergePanelVisible(
  partial?: PanelVisibleMap | null,
  legacyCombatVisible?: boolean,
): PanelVisibleMap {
  const out: PanelVisibleMap = { ...DEFAULT_PANEL_VISIBLE };
  void legacyCombatVisible;
  if (partial && typeof partial === "object") {
    const raw = partial as Record<string, boolean | undefined>;
    if (typeof raw.crypt === "boolean") {
      if (typeof raw.instance !== "boolean") out.instance = raw.crypt;
      if (typeof raw.instanceRun !== "boolean") out.instanceRun = raw.crypt;
    }
    for (let i = 0; i < CLOSABLE_PANEL_IDS.length; i++) {
      const id = CLOSABLE_PANEL_IDS[i];
      if (typeof partial[id] === "boolean") {
        out[id] = partial[id];
      }
    }
  }
  return out;
}

export function isPanelVisible(
  settings: { panelVisible?: PanelVisibleMap },
  id: PanelId,
): boolean {
  const v = settings.panelVisible?.[id];
  if (typeof v === "boolean") return v;
  const def = panelDef(id);
  if (!def.closable) return true;
  return def.defaultVisible;
}

export function windowFramePersist(id: string): WindowFramePersist {
  if (!isPanelId(id)) return "wh";
  return panelDef(id).framePersist;
}

export function canAutoSizeWindow(id: string): boolean {
  return isPanelId(id) && panelDef(id).autoSize !== "off";
}

export function defaultPanelAutoSize(id: string): boolean {
  return isPanelId(id) && panelDef(id).autoSize === "default-on";
}

export function panelUsesAutoSize(
  pos: { autoSize?: boolean } | undefined,
  id: string,
): boolean {
  // Ephemeral tips must always hug content — a saved fixed frame left an
  // invisible click box after close (blocked paperdoll × / bag).
  if (id === "buffInfo" || id === "itemInfo") return true;
  if (!canAutoSizeWindow(id)) return false;
  if (pos && typeof pos.autoSize === "boolean") return pos.autoSize;
  return defaultPanelAutoSize(id);
}

/** True when this HUD id uses a fixed saved box (not content-hug). */
export function panelFillsFrame(id: string): boolean {
  return isPanelId(id) && panelDef(id).shell === "fill";
}

export function filterPersistedFrameSize(
  id: string,
  size: { frameW?: number; frameH?: number },
): { frameW?: number; frameH?: number } {
  const mode = windowFramePersist(id);
  switch (mode) {
    case "none":
      return {};
    case "w":
      return size.frameW != null ? { frameW: size.frameW } : {};
    case "wh":
      return size;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function applyWindowFramePersist<
  T extends { frameW?: number; frameH?: number },
>(pos: T, id: string): T {
  const allowed = filterPersistedFrameSize(id, {
    frameW: pos.frameW,
    frameH: pos.frameH,
  });
  const out = { ...pos };
  delete out.frameW;
  delete out.frameH;
  if (allowed.frameW != null) out.frameW = allowed.frameW;
  if (allowed.frameH != null) out.frameH = allowed.frameH;
  return out;
}

export type PanelContext = {
  map?: string;
  hasEnemies: boolean;
  hasBosses: boolean;
  hasAbilityCasters: boolean;
  hasThreat: boolean;
};

export function inTrackedInstance(map: string | undefined): boolean {
  return isTrackedInstanceMap(map);
}

function emptyWhenIsEmpty(when: PanelEmptyWhen, ctx: PanelContext): boolean {
  switch (when) {
    case "never":
      return false;
    case "instanceMap":
      return !inTrackedInstance(ctx.map);
    case "enemies":
      return !ctx.hasEnemies;
    case "bosses":
      return !ctx.hasBosses;
    case "abilityCasters":
      return !ctx.hasAbilityCasters;
    case "threat":
      return !ctx.hasThreat;
    default: {
      const _never: never = when;
      return _never;
    }
  }
}

/** True when this panel has no live context and should not mount. */
export function panelIsContextEmpty(id: PanelId, ctx: PanelContext): boolean {
  return emptyWhenIsEmpty(panelDef(id).emptyWhen, ctx);
}
