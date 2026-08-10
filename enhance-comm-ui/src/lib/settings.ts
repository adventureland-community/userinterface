import {
  mergeLayout,
  type PanelId,
  type PanelLayoutMap,
  type PanelPos,
} from "./layout";
import {
  COMBAT_CHANNELS,
  type CombatChannel,
} from "../meters/combatChannels";

const KEY = "al-comm-ui-settings-v1";

export type PartyScope = "watched" | "all";

/** Single content mode for the combat panel (tabs, not stacked). */
export type CombatViewMode = "table" | "bars" | "graph";

/**
 * Who the combat meter focuses on:
 * - watched: observed character's party
 * - all: every visible player
 * - party:<key>: one specific party key
 */
export type PartyFocus = "watched" | "all" | string;

/** Meter query inputs derived from a PartyFocus setting. */
export type ResolvedPartyFocus = {
  scope: PartyScope;
  partyFilter: string | null;
  /** History series key: watched party key, specific party, or null for all. */
  historyKey: string | null;
};

/**
 * Map persisted partyFocus into meter scope/filter/history keys.
 */
export function resolvePartyFocus(
  focus: PartyFocus,
  watchedPartyKey: string,
): ResolvedPartyFocus {
  if (focus === "all") {
    return { scope: "all", partyFilter: null, historyKey: null };
  }
  if (focus === "watched") {
    const key = watchedPartyKey || null;
    return { scope: "watched", partyFilter: key, historyKey: key };
  }
  return { scope: "all", partyFilter: focus, historyKey: focus };
}

/** Panels the user can hide via × (not core chrome). */
export const CLOSABLE_PANEL_IDS = [
  "bossBar",
  "combat",
  "kills",
  "threat",
  "pdps",
  "hitDps",
  "coopV1",
  "coopV2",
  "command",
  "bag",
] as const satisfies readonly PanelId[];

export type ClosablePanelId = (typeof CLOSABLE_PANEL_IDS)[number];

export type PanelVisibleMap = Partial<Record<PanelId, boolean>>;

/** Named observer COMMAND presets (`o:command` / remote code_eval). */
export type CommandSnippet = {
  id: string;
  name: string;
  code: string;
};

/** Per-panel overlay opacity (0.25–1). Unset → 1. */
export type PanelOpacityMap = Partial<Record<PanelId, number>>;

export type CommUiSettings = {
  partyScope: PartyScope;
  killScope: PartyScope;
  /** @deprecated use panelVisible.combat */
  combatVisible?: boolean;
  combatView: CombatViewMode;
  /** @deprecated migrated into combatView */
  combatViews?: { table?: boolean; bars?: boolean; graph?: boolean };
  /** Persisted CombatChannel ids (union kept across load/save). */
  combatChannels: CombatChannel[];
  barChannel: CombatChannel;
  /** watched | all | party key */
  partyFocus: PartyFocus;
  /** @deprecated use partyFocus */
  graphPartyKey?: string | null;
  /** Viewport-% positions for each panel */
  panelLayout: PanelLayoutMap;
  /** Per-panel show/hide; unset keys use defaults */
  panelVisible: PanelVisibleMap;
  /** Saved COMMAND code snippets */
  commandSnippets: CommandSnippet[];
  /** Last draft in the Command textarea */
  commandDraft: string;
  /**
   * Compact Combat: show DPS + HPS only (table/bars/graph channels clamped).
   * Persisted; toggled from the Combat panel header.
   */
  combatCompact: boolean;
  /**
   * Remember whether the bag was open across reloads.
   * Restored after inventory patch installs.
   */
  bagOpenPreferred: boolean;
  /** Per-panel overlay opacity (layout + play). */
  panelOpacity: PanelOpacityMap;
};

const DEFAULT_PANEL_VISIBLE: Record<ClosablePanelId, boolean> = {
  bossBar: true,
  combat: true,
  kills: true,
  threat: true,
  pdps: true,
  hitDps: false,
  coopV1: true,
  coopV2: true,
  command: false,
  /** Bag panel shell is always allowed; open/close follows inventory. */
  bag: true,
};

const DEFAULT_COMMAND_SNIPPETS: CommandSnippet[] = [
  { id: "loot", name: "Loot", code: "loot()" },
  { id: "stop", name: "Stop move", code: "stop('move')" },
  {
    id: "say-hi",
    name: "Say hi",
    code: "say('hi')",
  },
];

const DEFAULTS: CommUiSettings = {
  partyScope: "watched",
  killScope: "watched",
  combatView: "table",
  combatChannels: ["dps", "base", "blast", "burn", "hps"],
  barChannel: "dps",
  partyFocus: "watched",
  panelLayout: {},
  panelVisible: { ...DEFAULT_PANEL_VISIBLE },
  commandSnippets: DEFAULT_COMMAND_SNIPPETS.slice(),
  commandDraft: "",
  combatCompact: false,
  bagOpenPreferred: false,
  panelOpacity: {},
};

function clampOpacity(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.25, Math.min(1, n));
}

const CHANNEL_SET = new Set<string>(COMBAT_CHANNELS);

function isCombatChannel(v: unknown): v is CombatChannel {
  return typeof v === "string" && CHANNEL_SET.has(v);
}

function normalizeChannels(raw: unknown): CombatChannel[] {
  if (!Array.isArray(raw)) return DEFAULTS.combatChannels.slice();
  const out: CombatChannel[] = [];
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (isCombatChannel(v) && out.indexOf(v) < 0) out.push(v);
  }
  return out.length ? out : DEFAULTS.combatChannels.slice();
}

function normalizeBarChannel(raw: unknown): CombatChannel {
  return isCombatChannel(raw) ? raw : DEFAULTS.barChannel;
}

export function mergePanelOpacity(
  partial?: PanelOpacityMap | null,
): PanelOpacityMap {
  const out: PanelOpacityMap = {};
  if (!partial || typeof partial !== "object") return out;
  const keys = Object.keys(partial) as PanelId[];
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    const v = partial[id];
    if (typeof v === "number") out[id] = clampOpacity(v);
  }
  return out;
}

export function panelOpacityOf(
  settings: CommUiSettings,
  id: PanelId,
): number {
  const v = settings.panelOpacity?.[id];
  return typeof v === "number" ? clampOpacity(v) : 1;
}

export function mergePanelVisible(
  partial?: PanelVisibleMap | null,
  legacyCombatVisible?: boolean,
): PanelVisibleMap {
  const out: PanelVisibleMap = { ...DEFAULT_PANEL_VISIBLE };
  if (typeof legacyCombatVisible === "boolean" && partial?.combat == null) {
    out.combat = legacyCombatVisible;
  }
  if (partial && typeof partial === "object") {
    for (let i = 0; i < CLOSABLE_PANEL_IDS.length; i++) {
      const id = CLOSABLE_PANEL_IDS[i];
      if (typeof partial[id] === "boolean") {
        out[id] = partial[id];
      }
    }
  }
  return out;
}

function normalizeSnippets(raw: any): CommandSnippet[] {
  if (!Array.isArray(raw)) return DEFAULT_COMMAND_SNIPPETS.slice();
  const out: CommandSnippet[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const name = String(row.name || "").trim();
    const code = String(row.code || "");
    if (!name && !code.trim()) continue;
    const id =
      typeof row.id === "string" && row.id
        ? row.id
        : `snip-${i}-${Date.now()}`;
    out.push({
      id,
      name: name || `Snippet ${out.length + 1}`,
      code,
    });
  }
  return out;
}

function migrate(parsed: any): CommUiSettings {
  const next: CommUiSettings = {
    ...DEFAULTS,
    ...parsed,
    combatChannels: normalizeChannels(parsed.combatChannels),
    barChannel: normalizeBarChannel(parsed.barChannel),
    panelLayout: mergeLayout(parsed.panelLayout),
    panelVisible: mergePanelVisible(
      parsed.panelVisible,
      parsed.combatVisible,
    ),
    commandSnippets: normalizeSnippets(parsed.commandSnippets),
    commandDraft:
      typeof parsed.commandDraft === "string" ? parsed.commandDraft : "",
    combatCompact: !!parsed.combatCompact,
    bagOpenPreferred: !!parsed.bagOpenPreferred,
    panelOpacity: mergePanelOpacity(parsed.panelOpacity),
  };

  if (!parsed.combatView && parsed.combatViews) {
    if (parsed.combatViews.table) next.combatView = "table";
    else if (parsed.combatViews.bars) next.combatView = "bars";
    else if (parsed.combatViews.graph) next.combatView = "graph";
  }

  if (!parsed.partyFocus) {
    if (parsed.partyScope === "all" && parsed.graphPartyKey) {
      next.partyFocus = parsed.graphPartyKey;
    } else if (parsed.partyScope === "all") {
      next.partyFocus = "all";
    } else {
      next.partyFocus = "watched";
    }
  }

  // Drop deprecated flag once migrated into panelVisible
  delete next.combatVisible;

  return next;
}

function freshDefaults(): CommUiSettings {
  return {
    ...DEFAULTS,
    combatChannels: DEFAULTS.combatChannels.slice(),
    panelLayout: mergeLayout(null),
    panelVisible: mergePanelVisible(null),
    commandSnippets: DEFAULT_COMMAND_SNIPPETS.slice(),
    commandDraft: "",
    combatCompact: false,
    bagOpenPreferred: false,
    panelOpacity: {},
  };
}

/** In-memory snapshot — avoid mid-render localStorage thrash. */
let settingsCache: CommUiSettings | null = null;

function readSettingsFromStorage(): CommUiSettings {
  try {
    const raw = window.localStorage?.getItem(KEY);
    if (!raw) return freshDefaults();
    return migrate(JSON.parse(raw));
  } catch {
    return freshDefaults();
  }
}

function writeSettingsToStorage(next: CommUiSettings): void {
  try {
    window.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

/** Cached settings snapshot (loads once until patched). */
export function getSettings(): CommUiSettings {
  if (!settingsCache) settingsCache = readSettingsFromStorage();
  return settingsCache;
}

/** Alias kept for call sites; returns the cached snapshot. */
export function loadSettings(): CommUiSettings {
  return getSettings();
}

/**
 * Merge a partial into the cached snapshot and persist.
 * Prefer this over load+save mid-render.
 */
export function patchSettings(
  partial: Partial<CommUiSettings>,
): CommUiSettings {
  const current = getSettings();
  const next: CommUiSettings = {
    ...current,
    ...partial,
  };
  if (partial.combatChannels) {
    next.combatChannels = normalizeChannels(partial.combatChannels);
  }
  if (partial.barChannel != null) {
    next.barChannel = normalizeBarChannel(partial.barChannel);
  }
  if (partial.panelLayout) {
    next.panelLayout = mergeLayout({
      ...current.panelLayout,
      ...partial.panelLayout,
    });
  }
  if (partial.panelVisible) {
    next.panelVisible = mergePanelVisible({
      ...current.panelVisible,
      ...partial.panelVisible,
    });
  }
  if (partial.commandSnippets) {
    next.commandSnippets = normalizeSnippets(partial.commandSnippets);
  }
  if (typeof partial.commandDraft === "string") {
    next.commandDraft = partial.commandDraft;
  }
  if (typeof partial.combatCompact === "boolean") {
    next.combatCompact = partial.combatCompact;
  }
  if (typeof partial.bagOpenPreferred === "boolean") {
    next.bagOpenPreferred = partial.bagOpenPreferred;
  }
  if (partial.panelOpacity) {
    next.panelOpacity = mergePanelOpacity({
      ...current.panelOpacity,
      ...partial.panelOpacity,
    });
  }
  delete next.combatVisible;
  settingsCache = next;
  writeSettingsToStorage(next);
  return next;
}

/** @deprecated prefer patchSettings — same behavior. */
export function saveSettings(partial: Partial<CommUiSettings>): CommUiSettings {
  return patchSettings(partial);
}

export function savePanelPos(id: PanelId, pos: PanelPos): CommUiSettings {
  return saveSettings({ panelLayout: { [id]: pos } });
}

export function savePanelVisible(
  id: PanelId,
  visible: boolean,
): CommUiSettings {
  return saveSettings({ panelVisible: { [id]: visible } });
}

export function resetPanelLayout(): CommUiSettings {
  return saveSettings({ panelLayout: mergeLayout(null) });
}

export function isPanelVisible(
  settings: CommUiSettings,
  id: PanelId,
): boolean {
  const v = settings.panelVisible?.[id];
  if (typeof v === "boolean") return v;
  const def = DEFAULT_PANEL_VISIBLE[id as keyof typeof DEFAULT_PANEL_VISIBLE];
  return def !== false;
}

export function partyFocusLabel(focus: PartyFocus, watchedName?: string): string {
  if (focus === "watched") {
    return watchedName ? `Watched · ${watchedName}` : "Watched party";
  }
  if (focus === "all") return "All parties";
  if (focus.indexOf("solo:") === 0) return focus.slice(5);
  return focus;
}
