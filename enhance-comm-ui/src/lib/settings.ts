import {
  mergeLayout,
  PANEL_IDS,
  type PanelId,
  type PanelLayoutMap,
  type PanelPos,
} from "./layout";
import {
  COMBAT_CHANNELS,
  type CombatChannel,
} from "../meters/combatChannels";
import {
  VIEWPORT_PROFILES,
  detectViewportProfile,
  type ViewportProfile,
} from "./viewport";
import {
  normalizePartyBuffMode,
  type PartyBuffMode,
} from "./partyBuffMode";
import type { PartyFocus, PartyScope } from "./settingsFocus";

export {
  resolvePartyFocus,
  effectivePartyFocus,
  effectiveKillScope,
  partyFocusLabel,
  killScopeLabel,
  type PartyFocus,
  type PartyScope,
  type ResolvedPartyFocus,
} from "./settingsFocus";

const KEY = "al-comm-ui-settings-v1";
const PANEL_IDS_SET = new Set<string>(PANEL_IDS);

export type { ViewportProfile };
export type { PartyBuffMode };
export type LayoutProfileMode = "auto" | ViewportProfile;
export type PanelLayoutsByProfile = Partial<
  Record<ViewportProfile, PanelLayoutMap>
>;

/** Single content mode for the combat panel (tabs, not stacked). */
export type CombatViewMode = "table" | "bars" | "graph";

/** Panels the user can hide via × (not core chrome). */
export const CLOSABLE_PANEL_IDS = [
  "bossBar",
  "crypt",
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
  /** Optional folder/group label for filtering long lists. */
  folder?: string;
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
  /**
   * @deprecated Prefer panelLayoutsByProfile[active]. Kept in sync with the
   * active/auto profile for older readers.
   */
  panelLayout: PanelLayoutMap;
  /** Per-viewport layout maps (desktop / tablet / phone). */
  panelLayoutsByProfile: PanelLayoutsByProfile;
  /** auto = detect from window size; otherwise force a profile's layout. */
  layoutProfileMode: LayoutProfileMode;
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
  /**
   * Party roster buff density:
   * all | auto | observed | compact | shared | off
   */
  partyBuffMode: PartyBuffMode;
};

const DEFAULT_PANEL_VISIBLE: Record<ClosablePanelId, boolean> = {
  bossBar: true,
  crypt: true,
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
  panelLayoutsByProfile: {},
  layoutProfileMode: "auto",
  panelVisible: { ...DEFAULT_PANEL_VISIBLE },
  commandSnippets: DEFAULT_COMMAND_SNIPPETS.slice(),
  commandDraft: "",
  combatCompact: false,
  bagOpenPreferred: false,
  panelOpacity: {},
  partyBuffMode: "auto",
};

export function resolveLayoutProfile(
  mode: LayoutProfileMode | undefined,
  detected?: ViewportProfile,
): ViewportProfile {
  if (mode && mode !== "auto") return mode;
  return detected || detectViewportProfile();
}

export function mergeLayoutsByProfile(
  partial?: PanelLayoutsByProfile | null,
  legacyFlat?: PanelLayoutMap | null,
): PanelLayoutsByProfile {
  const out: PanelLayoutsByProfile = {};
  if (partial && typeof partial === "object") {
    for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
      const profile = VIEWPORT_PROFILES[i];
      const chunk = partial[profile];
      if (chunk && typeof chunk === "object") {
        out[profile] = mergeLayout(chunk, profile);
      }
    }
  }
  // Migrate pre-profile flat layout into desktop (and only desktop).
  if (
    legacyFlat &&
    typeof legacyFlat === "object" &&
    Object.keys(legacyFlat).length &&
    !out.desktop
  ) {
    out.desktop = mergeLayout(legacyFlat, "desktop");
  }
  return out;
}

/** Resolved positions for the active viewport profile. */
export function layoutForProfile(
  settings: CommUiSettings,
  profile?: ViewportProfile,
): Record<PanelId, PanelPos> {
  const resolved =
    profile ||
    resolveLayoutProfile(settings.layoutProfileMode, detectViewportProfile());
  const stored = settings.panelLayoutsByProfile?.[resolved];
  if (stored && Object.keys(stored).length) {
    return mergeLayout(stored, resolved);
  }
  // Fall back to legacy flat only on desktop; other profiles use defaults.
  if (resolved === "desktop" && settings.panelLayout) {
    return mergeLayout(settings.panelLayout, "desktop");
  }
  return mergeLayout(null, resolved);
}

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
  const raw = partial as Record<string, unknown>;
  // Legacy shared infoDialog opacity → both new panels.
  if (typeof raw.infoDialog === "number") {
    if (typeof raw.buffInfo !== "number") out.buffInfo = clampOpacity(raw.infoDialog);
    if (typeof raw.itemInfo !== "number") out.itemInfo = clampOpacity(raw.infoDialog);
  }
  const keys = Object.keys(partial) as string[];
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    if (id === "infoDialog") continue;
    const v = raw[id];
    if (typeof v === "number" && PANEL_IDS_SET.has(id)) {
      out[id as PanelId] = clampOpacity(v);
    }
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
    const folderRaw =
      typeof row.folder === "string" ? row.folder.trim() : "";
    const snip: CommandSnippet = {
      id,
      name: name || `Snippet ${out.length + 1}`,
      code,
    };
    if (folderRaw) snip.folder = folderRaw;
    out.push(snip);
  }
  return out;
}

function normalizeLayoutProfileMode(raw: unknown): LayoutProfileMode {
  if (
    raw === "desktop" ||
    raw === "tablet" ||
    raw === "phone" ||
    raw === "auto"
  ) {
    return raw;
  }
  return "auto";
}

function migrate(parsed: any): CommUiSettings {
  const panelLayoutsByProfile = mergeLayoutsByProfile(
    parsed.panelLayoutsByProfile,
    parsed.panelLayout,
  );
  const layoutProfileMode = normalizeLayoutProfileMode(
    parsed.layoutProfileMode,
  );
  const activeProfile = resolveLayoutProfile(layoutProfileMode);
  const panelLayout = layoutForProfile(
    {
      ...DEFAULTS,
      panelLayout: parsed.panelLayout || {},
      panelLayoutsByProfile,
      layoutProfileMode,
    },
    activeProfile,
  );

  const next: CommUiSettings = {
    ...DEFAULTS,
    ...parsed,
    combatChannels: normalizeChannels(parsed.combatChannels),
    barChannel: normalizeBarChannel(parsed.barChannel),
    panelLayout,
    panelLayoutsByProfile,
    layoutProfileMode,
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
    partyBuffMode: normalizePartyBuffMode(parsed.partyBuffMode),
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
    panelLayout: mergeLayout(null, "desktop"),
    panelLayoutsByProfile: {},
    layoutProfileMode: "auto",
    panelVisible: mergePanelVisible(null),
    commandSnippets: DEFAULT_COMMAND_SNIPPETS.slice(),
    commandDraft: "",
    combatCompact: false,
    bagOpenPreferred: false,
    panelOpacity: {},
    partyBuffMode: "auto",
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
  if (partial.layoutProfileMode != null) {
    next.layoutProfileMode = normalizeLayoutProfileMode(
      partial.layoutProfileMode,
    );
  }
  if (partial.panelLayoutsByProfile) {
    next.panelLayoutsByProfile = mergeLayoutsByProfile({
      ...current.panelLayoutsByProfile,
      ...partial.panelLayoutsByProfile,
    });
  }
  if (partial.panelLayout) {
    const profile = resolveLayoutProfile(next.layoutProfileMode);
    const merged = mergeLayout(
      {
        ...(current.panelLayoutsByProfile?.[profile] || current.panelLayout),
        ...partial.panelLayout,
      },
      profile,
    );
    next.panelLayout = merged;
    next.panelLayoutsByProfile = {
      ...next.panelLayoutsByProfile,
      [profile]: merged,
    };
  }
  // Keep flat panelLayout mirrored to the active profile.
  if (!partial.panelLayout && (partial.panelLayoutsByProfile || partial.layoutProfileMode != null)) {
    next.panelLayout = layoutForProfile(next);
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
  if (partial.partyBuffMode != null) {
    next.partyBuffMode = normalizePartyBuffMode(partial.partyBuffMode);
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

export function savePanelPos(
  id: PanelId,
  pos: PanelPos,
  profile?: ViewportProfile,
): CommUiSettings {
  const settings = getSettings();
  const resolved =
    profile || resolveLayoutProfile(settings.layoutProfileMode);
  return saveSettings({
    panelLayoutsByProfile: {
      [resolved]: {
        ...(settings.panelLayoutsByProfile?.[resolved] || {}),
        [id]: pos,
      },
    },
    panelLayout: { [id]: pos },
  });
}

export function savePanelVisible(
  id: PanelId,
  visible: boolean,
): CommUiSettings {
  return saveSettings({ panelVisible: { [id]: visible } });
}

/** Reset the active (or given) profile back to its built-in defaults. */
export function resetPanelLayout(
  profile?: ViewportProfile,
): CommUiSettings {
  const settings = getSettings();
  const resolved =
    profile || resolveLayoutProfile(settings.layoutProfileMode);
  const defaults = mergeLayout(null, resolved);
  return saveSettings({
    panelLayoutsByProfile: {
      ...settings.panelLayoutsByProfile,
      [resolved]: defaults,
    },
    panelLayout: defaults,
  });
}

/** Replace profile layouts from an import payload. */
export function importPanelLayouts(
  layoutsByProfile: PanelLayoutsByProfile,
): CommUiSettings {
  const merged = mergeLayoutsByProfile(layoutsByProfile, null);
  return saveSettings({
    panelLayoutsByProfile: {
      ...getSettings().panelLayoutsByProfile,
      ...merged,
    },
  });
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
