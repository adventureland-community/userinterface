import {
  mergeLayout,
  PANEL_IDS,
  type PanelId,
  type PanelLayoutMap,
  type PanelPos,
} from "./layout";
import { COMBAT_CHANNELS, type CombatChannel } from "../meters/combatChannels";
import {
  defaultMeterInstances,
  meterClosedIdList,
  migrateLegacyMeterLayout,
  normalizeMeterClosedInstances,
  normalizeMeterInstances,
} from "../meters/meterPresets";
import type { MeterBookmark, MeterInstance } from "../meters/meterTypes";
import {
  VIEWPORT_PROFILES,
  detectViewportProfile,
  type ViewportProfile,
} from "./viewport";
import { normalizePartyBuffMode, type PartyBuffMode } from "./partyBuffMode";
import type { PartyFocus, PartyScope } from "./settingsFocus";
import { latestChangelogId } from "./changelog";
import {
  clampMinimapZoom,
  MINIMAP_ZOOM_DEFAULT,
  MINIMAP_BG_DEFAULT,
  normalizeMinimapBgMode,
  type MinimapBgMode,
} from "./minimapPrefs";
import {
  legacyShowBigIconHidden,
  normalizeAbilityTimelineOrient,
  type AbilityTimelinePrefs,
} from "../instance/abilityTimelinePrefs";
import { applyAbilityTimelineOrientFrame } from "./abilityTimelineFrame";
import { LAYOUT_FRAME_REV } from "./layoutFrameMigrations";
import {
  mergePanelVisible,
  type PanelVisibleMap,
  DEFAULT_PANEL_VISIBLE,
} from "./panelCatalog";

export {
  CLOSABLE_PANEL_IDS,
  mergePanelVisible,
  isPanelVisible,
  type ClosablePanelId,
  type PanelVisibleMap,
} from "./panelCatalog";

export {
  resolvePartyFocus,
  effectivePartyFocus,
  effectiveKillScope,
  effectiveThreatScope,
  partyFocusLabel,
  partyFocusChoiceLabel,
  partyFocusMenuOptions,
  killScopeLabel,
  type PartyFocus,
  type PartyScope,
  type PartyFocusOption,
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
  /**
   * Threat meter rows: watched = subject's in-game party; visible = everyone
   * with aggro in vision. `"all"` is treated as visible (no session history).
   */
  threatScope: PartyScope;
  /** @deprecated use panelVisible */
  combatVisible?: boolean;
  /** @deprecated combat panel replaced by meterInstances */
  combatView: CombatViewMode;
  /** @deprecated migrated into combatView */
  combatViews?: { table?: boolean; bars?: boolean; graph?: boolean };
  /** Persisted CombatChannel ids (union kept across load/save). */
  combatChannels: CombatChannel[];
  barChannel: CombatChannel;
  /** watched | all | party key — default for new meter instances */
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
  /** Persisted mail composer draft (JSON ComposeDraft). */
  mailDraft?: string;
  /** Last compose To chips (sticky). */
  mailLastTo?: string[];
  /** Last list filter pill. */
  mailPill?: string;
  /** Stack near-duplicate mails in the list (default on). */
  mailCollapseRepeats?: boolean;
  /**
   * Compact Combat: show DPS + HPS only (table/bars/graph channels clamped).
   * Persisted; toggled from the Combat panel header.
   * @deprecated
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
  /** Skada-style meter windows (pos + query + presentation). */
  meterInstances: MeterInstance[];
  /**
   * When true (default), windows stay put unless Alt is held or the
   * window is unlocked. Layout edit still moves everything.
   * Legacy key: metersLocked.
   */
  windowsLocked: boolean;
  /**
   * @deprecated Prefer windowsLocked — kept in sync for older readers.
   */
  metersLocked: boolean;
  /** Details “Always show me” default for ranked meters. */
  meterAlwaysShowSelf: boolean;
  /** When false, edge-snap grouping is disabled (existing groups kept). */
  meterWindowGrouping: boolean;
  /** Saved Display×Scope×Segment bookmarks. */
  meterBookmarks: MeterBookmark[];
  /** Last Reportar outputs (Details recent reports). */
  meterRecentReports: Array<{ id: string; label: string; text: string }>;
  /** Mass-hide all meter frames (Details show/hide toggle). */
  metersHidden: boolean;
  /** Details-style appearance & behavior defaults. */
  meterAppearance?: Partial<
    import("../meters/meterAppearance").MeterAppearanceSettings
  >;
  /** Closed meter instances — reopen from gear menu. */
  meterClosedInstances?: MeterInstance[];
  /** First-run Comm UI setup wizard completed. */
  setupWizardDone?: boolean;
  /**
   * Last changelog entry id the user dismissed (What's New).
   * Independent of setupWizardDone — upgrades can resurface What's New.
   */
  changelogSeenId?: string | null;
  /**
   * Last Adventure.land `last_deploy` stamp shown via Comm update notes.
   * Welcome auto-opens only when the page deploy differs.
   */
  serverUpdateNotesSeenDeploy?: string | null;
  /** Per-tour completion flags (spotlight tours). */
  toursCompleted?: Record<string, boolean>;
  /** Stable window numbers (Details meu_id) for HUD + meters. */
  windowNumberById?: Record<string, number>;
  /** Next free window number to allocate. */
  nextWindowNumber?: number;
  /** World half-span (shorter canvas axis), clamped — sticky after snaps / wheel. */
  minimapZoom?: number;
  /** Minimap shell + canvas grid opacity preset. */
  minimapBg: MinimapBgMode;
  /** Ability timeline geometry + chrome (legacy orient/display scalars migrate in). */
  abilityTimeline?: Partial<AbilityTimelinePrefs>;
  /** One-shot frame migrations; bump LAYOUT_FRAME_REV when adding migrators. */
  layoutRev?: number;
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
  threatScope: "visible",
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
  meterInstances: defaultMeterInstances(),
  windowsLocked: true,
  metersLocked: true,
  meterAlwaysShowSelf: true,
  meterWindowGrouping: true,
  meterBookmarks: [],
  meterRecentReports: [],
  metersHidden: false,
  meterClosedInstances: [],
  setupWizardDone: false,
  changelogSeenId: null,
  serverUpdateNotesSeenDeploy: null,
  toursCompleted: {},
  windowNumberById: {},
  nextWindowNumber: 1,
  minimapZoom: MINIMAP_ZOOM_DEFAULT,
  minimapBg: MINIMAP_BG_DEFAULT,
  layoutRev: LAYOUT_FRAME_REV,
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
  opts?: { migrateFrames?: boolean },
): PanelLayoutsByProfile {
  const out: PanelLayoutsByProfile = {};
  if (partial && typeof partial === "object") {
    for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
      const profile = VIEWPORT_PROFILES[i];
      const chunk = partial[profile];
      if (chunk && typeof chunk === "object") {
        out[profile] = mergeLayout(chunk, profile, opts);
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
    out.desktop = mergeLayout(legacyFlat, "desktop", opts);
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
  let merged: Record<PanelId, PanelPos>;
  if (stored && Object.keys(stored).length) {
    merged = mergeLayout(stored, resolved);
  } else if (resolved === "desktop" && settings.panelLayout) {
    merged = mergeLayout(settings.panelLayout, "desktop");
  } else {
    merged = mergeLayout(null, resolved);
  }
  return merged;
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

function normalizeMeterBookmarks(raw: unknown): MeterBookmark[] {
  if (!Array.isArray(raw)) return [];
  const out: MeterBookmark[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    if (typeof row.id !== "string" || !row.id) continue;
    if (typeof row.label !== "string") continue;
    if (
      !row.query ||
      typeof row.query !== "object" ||
      typeof row.query.kind !== "string"
    ) {
      continue;
    }
    out.push({
      id: row.id,
      label: row.label,
      query: { ...row.query },
      presentation: row.presentation,
      partyFocus: row.partyFocus,
      selectedset: row.selectedset,
    });
  }
  return out;
}

export function mergePanelOpacity(
  partial?: PanelOpacityMap | null,
): PanelOpacityMap {
  const out: PanelOpacityMap = {};
  if (!partial || typeof partial !== "object") return out;
  const raw = partial as Record<string, unknown>;
  // Legacy shared infoDialog opacity → both new panels.
  if (typeof raw.infoDialog === "number") {
    if (typeof raw.buffInfo !== "number")
      out.buffInfo = clampOpacity(raw.infoDialog);
    if (typeof raw.itemInfo !== "number")
      out.itemInfo = clampOpacity(raw.infoDialog);
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

export function panelOpacityOf(settings: CommUiSettings, id: PanelId): number {
  const v = settings.panelOpacity?.[id];
  return typeof v === "number" ? clampOpacity(v) : 1;
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
      typeof row.id === "string" && row.id ? row.id : `snip-${i}-${Date.now()}`;
    const folderRaw = typeof row.folder === "string" ? row.folder.trim() : "";
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
  const staleFrames = parsed.layoutRev !== LAYOUT_FRAME_REV;
  const panelLayoutsByProfile = mergeLayoutsByProfile(
    parsed.panelLayoutsByProfile,
    parsed.panelLayout,
    { migrateFrames: staleFrames },
  );
  if (staleFrames) {
    const orient = normalizeAbilityTimelineOrient(
      parsed.abilityTimeline?.orient ?? parsed.abilityTimelineOrient,
    );
    const keys = Object.keys(panelLayoutsByProfile) as ViewportProfile[];
    for (let i = 0; i < keys.length; i++) {
      const profile = keys[i];
      const layout = panelLayoutsByProfile[profile];
      if (layout) {
        panelLayoutsByProfile[profile] = applyAbilityTimelineOrientFrame(
          layout,
          orient,
        );
      }
    }
  }
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
      abilityTimeline:
        parsed.abilityTimeline ||
        (parsed.abilityTimelineOrient != null
          ? { orient: parsed.abilityTimelineOrient }
          : undefined),
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
    layoutRev: LAYOUT_FRAME_REV,
    panelVisible: mergePanelVisible(parsed.panelVisible, parsed.combatVisible),
    commandSnippets: normalizeSnippets(parsed.commandSnippets),
    commandDraft:
      typeof parsed.commandDraft === "string" ? parsed.commandDraft : "",
    mailDraft: typeof parsed.mailDraft === "string" ? parsed.mailDraft : "",
    mailLastTo: Array.isArray(parsed.mailLastTo)
      ? parsed.mailLastTo.map(String).filter(Boolean).slice(0, 8)
      : [],
    mailPill: typeof parsed.mailPill === "string" ? parsed.mailPill : "all",
    mailCollapseRepeats:
      typeof parsed.mailCollapseRepeats === "boolean"
        ? parsed.mailCollapseRepeats
        : true,
    combatCompact: !!parsed.combatCompact,
    bagOpenPreferred: !!parsed.bagOpenPreferred,
    panelOpacity: mergePanelOpacity(parsed.panelOpacity),
    partyBuffMode: normalizePartyBuffMode(parsed.partyBuffMode),
    meterInstances: migrateLegacyMeterLayout(
      normalizeMeterInstances(parsed.meterInstances, {
        closedIds: meterClosedIdList(parsed.meterClosedInstances),
      }),
      parsed.panelLayout || panelLayout,
    ),
    meterClosedInstances: normalizeMeterClosedInstances(
      parsed.meterClosedInstances,
    ),
    metersLocked: parsed.metersLocked !== false,
    windowsLocked:
      typeof parsed.windowsLocked === "boolean"
        ? parsed.windowsLocked
        : parsed.metersLocked !== false,
    meterAlwaysShowSelf: parsed.meterAlwaysShowSelf !== false,
    meterWindowGrouping: parsed.meterWindowGrouping !== false,
    meterBookmarks: normalizeMeterBookmarks(parsed.meterBookmarks),
    meterRecentReports: Array.isArray(parsed.meterRecentReports)
      ? parsed.meterRecentReports
          .filter(
            (r: any) =>
              r &&
              typeof r.id === "string" &&
              typeof r.label === "string" &&
              typeof r.text === "string",
          )
          .slice(0, 10)
      : [],
    metersHidden: !!parsed.metersHidden,
    setupWizardDone:
      !!parsed.setupWizardDone ||
      !!(parsed.meterAppearance && parsed.meterAppearance.setupWizardDone),
    changelogSeenId:
      typeof parsed.changelogSeenId === "string"
        ? parsed.changelogSeenId
        : null,
    serverUpdateNotesSeenDeploy:
      typeof parsed.serverUpdateNotesSeenDeploy === "string"
        ? parsed.serverUpdateNotesSeenDeploy
        : null,
    toursCompleted:
      parsed.toursCompleted && typeof parsed.toursCompleted === "object"
        ? (parsed.toursCompleted as Record<string, boolean>)
        : {},
    windowNumberById:
      parsed.windowNumberById && typeof parsed.windowNumberById === "object"
        ? (parsed.windowNumberById as Record<string, number>)
        : {},
    nextWindowNumber:
      typeof parsed.nextWindowNumber === "number" && parsed.nextWindowNumber > 0
        ? Math.floor(parsed.nextWindowNumber)
        : 1,
    minimapZoom: clampMinimapZoom(
      typeof parsed.minimapZoom === "number"
        ? parsed.minimapZoom
        : MINIMAP_ZOOM_DEFAULT,
    ),
    minimapBg: normalizeMinimapBgMode(parsed.minimapBg),
  };

  // Legacy: finished/skipped intro before changelog tracking — treat current
  // as already seen so they only get What's New on the next ship.
  if (next.setupWizardDone && typeof parsed.changelogSeenId !== "string") {
    next.changelogSeenId = latestChangelogId();
  }

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
  if (
    next.abilityTimeline == null &&
    (parsed.abilityTimelineOrient != null ||
      parsed.abilityTimelineDisplay != null)
  ) {
    next.abilityTimeline = {
      orient: parsed.abilityTimelineOrient,
    };
  }
  delete (next as { abilityTimelineOrient?: unknown }).abilityTimelineOrient;
  delete (next as { abilityTimelineDisplay?: unknown }).abilityTimelineDisplay;

  const rawVisible =
    parsed.panelVisible && typeof parsed.panelVisible === "object"
      ? (parsed.panelVisible as Record<string, unknown>)
      : {};
  if (
    legacyShowBigIconHidden(parsed.abilityTimeline) &&
    typeof rawVisible.abilityTimelineBigIcon !== "boolean"
  ) {
    next.panelVisible = {
      ...next.panelVisible,
      abilityTimelineBigIcon: false,
    };
  }

  if (next.threatScope !== "watched" && next.threatScope !== "visible") {
    next.threatScope = "visible";
  }

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
    meterInstances: defaultMeterInstances(),
    metersLocked: true,
    windowsLocked: true,
    meterAlwaysShowSelf: true,
    meterWindowGrouping: true,
    meterBookmarks: [],
    meterRecentReports: [],
    metersHidden: false,
  };
}

/** In-memory snapshot — avoid mid-render localStorage thrash. */
let settingsCache: CommUiSettings | null = null;

function readSettingsFromStorage(): CommUiSettings {
  try {
    const raw = window.localStorage?.getItem(KEY);
    if (!raw) return freshDefaults();
    const parsed = JSON.parse(raw);
    const next = migrate(parsed);
    // Strip retired minimapMode (follow/fit/auto) from old saves.
    if (
      parsed &&
      typeof parsed === "object" &&
      Object.prototype.hasOwnProperty.call(parsed, "minimapMode")
    ) {
      writeSettingsToStorage(next);
    }
    return next;
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
  if (
    !partial.panelLayout &&
    (partial.panelLayoutsByProfile || partial.layoutProfileMode != null)
  ) {
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
  if (typeof partial.mailDraft === "string") {
    next.mailDraft = partial.mailDraft;
  }
  if (partial.mailLastTo) {
    next.mailLastTo = partial.mailLastTo
      .map(String)
      .filter(Boolean)
      .slice(0, 8);
  }
  if (typeof partial.mailPill === "string") {
    next.mailPill = partial.mailPill;
  }
  if (typeof partial.minimapZoom === "number") {
    next.minimapZoom = clampMinimapZoom(partial.minimapZoom);
  }
  if (partial.minimapBg != null) {
    next.minimapBg = normalizeMinimapBgMode(partial.minimapBg);
  }
  if (typeof partial.mailCollapseRepeats === "boolean") {
    next.mailCollapseRepeats = partial.mailCollapseRepeats;
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
  if (partial.meterInstances) {
    const closedForNorm =
      partial.meterClosedInstances != null
        ? normalizeMeterClosedInstances(partial.meterClosedInstances)
        : normalizeMeterClosedInstances(current.meterClosedInstances);
    next.meterInstances = normalizeMeterInstances(partial.meterInstances, {
      closedIds: meterClosedIdList(closedForNorm),
    });
  }
  if (typeof partial.windowsLocked === "boolean") {
    next.windowsLocked = partial.windowsLocked;
    next.metersLocked = partial.windowsLocked;
  } else if (typeof partial.metersLocked === "boolean") {
    next.metersLocked = partial.metersLocked;
    next.windowsLocked = partial.metersLocked;
  }
  if (typeof partial.meterAlwaysShowSelf === "boolean") {
    next.meterAlwaysShowSelf = partial.meterAlwaysShowSelf;
  }
  if (typeof partial.meterWindowGrouping === "boolean") {
    next.meterWindowGrouping = partial.meterWindowGrouping;
  }
  if (partial.meterBookmarks) {
    next.meterBookmarks = normalizeMeterBookmarks(partial.meterBookmarks);
  }
  if (partial.meterRecentReports) {
    next.meterRecentReports = partial.meterRecentReports.slice(0, 10);
  }
  if (typeof partial.metersHidden === "boolean") {
    next.metersHidden = partial.metersHidden;
  }
  if (partial.windowNumberById) {
    next.windowNumberById = { ...partial.windowNumberById };
  }
  if (
    typeof partial.nextWindowNumber === "number" &&
    partial.nextWindowNumber > 0
  ) {
    next.nextWindowNumber = Math.floor(partial.nextWindowNumber);
  }
  if (partial.meterClosedInstances) {
    next.meterClosedInstances = normalizeMeterClosedInstances(
      partial.meterClosedInstances,
    );
  }
  if (typeof partial.setupWizardDone === "boolean") {
    next.setupWizardDone = partial.setupWizardDone;
  }
  if (partial.changelogSeenId !== undefined) {
    next.changelogSeenId = partial.changelogSeenId;
  }
  if (partial.serverUpdateNotesSeenDeploy !== undefined) {
    next.serverUpdateNotesSeenDeploy =
      typeof partial.serverUpdateNotesSeenDeploy === "string"
        ? partial.serverUpdateNotesSeenDeploy
        : null;
  }
  if (partial.toursCompleted) {
    next.toursCompleted = { ...partial.toursCompleted };
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
  const resolved = profile || resolveLayoutProfile(settings.layoutProfileMode);
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

/** Persist several panel positions (edge-group moves). */
export function savePanelPositions(
  updates: PanelLayoutMap,
  profile?: ViewportProfile,
): CommUiSettings {
  const settings = getSettings();
  const resolved = profile || resolveLayoutProfile(settings.layoutProfileMode);
  return saveSettings({
    panelLayoutsByProfile: {
      [resolved]: {
        ...(settings.panelLayoutsByProfile?.[resolved] || {}),
        ...updates,
      },
    },
    panelLayout: { ...updates },
  });
}

export function savePanelVisible(
  id: PanelId,
  visible: boolean,
): CommUiSettings {
  return saveSettings({ panelVisible: { [id]: visible } });
}

/** Reset meter windows to the built-in default set (DPS / HPS). */
export function resetMeterInstances(): CommUiSettings {
  return saveSettings({
    meterInstances: defaultMeterInstances(),
    metersLocked: true,
    windowsLocked: true,
  });
}

/** Reset the active (or given) profile back to its built-in defaults. */
export function resetPanelLayout(profile?: ViewportProfile): CommUiSettings {
  const settings = getSettings();
  const resolved = profile || resolveLayoutProfile(settings.layoutProfileMode);
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

/**
 * Import a layout package: HUD profiles, and optionally meters.
 * Missing meterInstances leaves existing meters untouched (v1 exports).
 */
export function importLayoutPackage(pkg: {
  layoutsByProfile: PanelLayoutsByProfile;
  meterInstances?: MeterInstance[];
}): CommUiSettings {
  let next = importPanelLayouts(pkg.layoutsByProfile);
  if (pkg.meterInstances) {
    next = saveSettings({
      meterInstances: normalizeMeterInstances(pkg.meterInstances),
    });
  }
  return next;
}
