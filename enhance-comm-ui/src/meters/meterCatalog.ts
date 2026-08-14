/**
 * Meter preset catalog — mode cycle + add-panel registry (mock parity).
 */

import type { PartyFocus } from "../lib/settingsFocus";
import { partyFocusMenuOptions } from "../lib/settingsFocus";
import type { PanelPos } from "../lib/layout";
import type {
  MeterInstance,
  MeterPresentation,
  MeterQuery,
} from "./meterTypes";

export type MeterPresetId =
  | "damage"
  | "heal"
  | "taken"
  | "healreq"
  | "avoid"
  | "pdps"
  | "rolling"
  | "coop_v1"
  | "coop_v2"
  | "inspector"
  | "summary"
  | "death"
  | "realtime"
  | "compare"
  | "chart"
  | "timeline"
  | "encounter"
  | "pie";

export type MeterCatalogGroup = "meter" | "al" | "tool";

export type MeterPresetDef = {
  id: MeterPresetId;
  label: string;
  query: MeterQuery;
  presentation: MeterPresentation;
  seriesMode?: "realtime" | "compare";
  /** Included in default layout when true. */
  defaultVisible?: boolean;
  fadeWhenIdle?: boolean;
  defaultPos?: PanelPos;
  /** Default outer frame size (Inspector is larger than rank meters). */
  defaultFrame?: { w: number; h: number };
  /**
   * Add-dialog group. `meter` = core Displays; `al` = PDPS/coop/Hit DPS;
   * `tool` = reports (usually catalog:false).
   * Default `"meter"`.
   */
  catalogGroup?: MeterCatalogGroup;
  /**
   * When false, omit from Add meter (legacy view-mode presets still load).
   * Default true.
   */
  catalog?: boolean;
  /**
   * Hide the whole frame when the query has no rows (snapshot coop/pdps).
   * Default inferred: snapshot queries hide; combat meters stay up.
   */
  hideWhenEmpty?: boolean;
};

/** Skada Graphs–style display systems for ranked meters. */
export const VIEW_MODES: Array<{
  id: MeterPresentation;
  label: string;
  seriesMode?: "realtime" | "compare";
}> = [
  { id: "bars", label: "Bars" },
  { id: "pie", label: "Pie" },
  { id: "line", label: "Graph" },
];

export function supportsViewModes(query: MeterQuery): boolean {
  return (
    query.kind === "players" ||
    query.kind === "channel" ||
    query.kind === "avoidance" ||
    query.kind === "rolling" ||
    query.kind === "snapshot"
  );
}

export function applyViewMode(view: MeterPresentation): Partial<MeterInstance> {
  for (let i = 0; i < VIEW_MODES.length; i++) {
    if (VIEW_MODES[i].id !== view) continue;
    const m = VIEW_MODES[i];
    return {
      presentation: m.id,
      seriesMode: m.seriesMode,
    };
  }
  return { presentation: "bars", seriesMode: undefined };
}

export function catalogPresets(group: MeterCatalogGroup): MeterPresetDef[] {
  const out: MeterPresetDef[] = [];
  for (let i = 0; i < METER_PRESETS.length; i++) {
    const p = METER_PRESETS[i];
    if (p.catalog === false) continue;
    const g = p.catalogGroup || "meter";
    if (g === group) out.push(p);
  }
  return out;
}

/** On-demand report tabs (Encounter / Deaths / Timeline) — not permanent meters. */
export type ReportKind = "encounter" | "deaths" | "timeline";

export type ReportTabDef = {
  kind: ReportKind;
  label: string;
  presetId: MeterPresetId;
  presentation: MeterPresentation;
  query: MeterQuery;
};

export const REPORT_TABS: ReportTabDef[] = [
  {
    kind: "encounter",
    label: "Summary",
    presetId: "encounter",
    presentation: "encounter",
    query: { kind: "encounter_summary" },
  },
  {
    kind: "deaths",
    label: "Deaths",
    presetId: "death",
    presentation: "death_log",
    query: { kind: "death_log" },
  },
  {
    kind: "timeline",
    label: "Time Line",
    presetId: "timeline",
    presentation: "timeline",
    query: { kind: "timeline" },
  },
];

/** Details Encounter Details tabs we cannot fill from AL combat data. */
export const REPORT_STUB_TABS: Array<{ id: string; label: string }> = [
  { id: "charts", label: "Charts" },
  { id: "emotes", label: "Emotes" },
  { id: "phases", label: "Phases" },
];

export function isReportPresentation(p: MeterPresentation): boolean {
  return p === "death_log" || p === "encounter" || p === "timeline";
}

export function reportTabByKind(kind: ReportKind): ReportTabDef {
  for (let i = 0; i < REPORT_TABS.length; i++) {
    if (REPORT_TABS[i].kind === kind) return REPORT_TABS[i];
  }
  return REPORT_TABS[0];
}

export function reportKindForPresentation(
  p: MeterPresentation,
): ReportKind | null {
  if (p === "encounter") return "encounter";
  if (p === "death_log") return "deaths";
  if (p === "timeline") return "timeline";
  return null;
}

/** Pie / history helpers — metric from the panel's Display query. */
export function metricFromModeQuery(
  q: MeterQuery,
): "damage" | "heal" | "taken" | "healing_required" | "avoidance" {
  if (q.kind === "players") return q.metric;
  if (q.kind === "avoidance") return "avoidance";
  return "damage";
}

/**
 * Display ‹ › cycle — Details-like core metrics only.
 * Composition channels + PDPS/coop/Hit DPS live in Add meter / Inspector.
 */
export type MeterDisplayDef = {
  id: string;
  label: string;
  query: MeterQuery;
  presentation: MeterPresentation;
};

/** Flat leaf Displays — Details Attribute/sub-attribute axis (‹ › cycle). */
export const BAR_MODE_CYCLE: MeterDisplayDef[] = [
  {
    id: "damage_done",
    label: "Damage Done",
    query: { kind: "players", metric: "damage", primary: "total" },
    presentation: "bars",
  },
  {
    id: "dps",
    label: "DPS",
    query: { kind: "players", metric: "damage", primary: "rate" },
    presentation: "bars",
  },
  {
    id: "taken",
    label: "Damage Taken",
    query: { kind: "players", metric: "taken", primary: "total" },
    presentation: "bars",
  },
  {
    id: "heal_done",
    label: "Healing Done",
    query: { kind: "players", metric: "heal", primary: "total" },
    presentation: "bars",
  },
  {
    id: "hps",
    label: "HPS",
    query: { kind: "players", metric: "heal", primary: "rate" },
    presentation: "bars",
  },
  {
    id: "healreq",
    label: "Healing Required",
    query: { kind: "players", metric: "healing_required", primary: "total" },
    presentation: "bars",
  },
  {
    id: "avoid",
    label: "Avoidance",
    query: { kind: "avoidance" },
    presentation: "bars",
  },
];

/** Alias — Display is the Details Attribute/sub-attribute axis. */
export const DISPLAY_CYCLE = BAR_MODE_CYCLE;

/** Hierarchical Attribute Cooltip (Details MontaAtributosOption shape). */
export const DISPLAY_TREE: Array<{
  id: string;
  label: string;
  children: MeterDisplayDef[];
}> = [
  {
    id: "damage",
    label: "Damage",
    children: [BAR_MODE_CYCLE[0], BAR_MODE_CYCLE[1], BAR_MODE_CYCLE[2]],
  },
  {
    id: "heal",
    label: "Heal",
    children: [BAR_MODE_CYCLE[3], BAR_MODE_CYCLE[4], BAR_MODE_CYCLE[5]],
  },
  {
    id: "misc",
    label: "Miscellaneous",
    children: [
      BAR_MODE_CYCLE[6],
      {
        id: "interrupts",
        label: "Interrupts",
        query: { kind: "misc", metric: "interrupts" },
        presentation: "bars",
      },
      {
        id: "dispels",
        label: "Dispels",
        query: { kind: "misc", metric: "dispels" },
        presentation: "bars",
      },
      {
        id: "deaths_rank",
        label: "Deaths",
        query: { kind: "misc", metric: "deaths" },
        presentation: "bars",
      },
      {
        id: "cc_breaks",
        label: "CC Breaks",
        query: { kind: "misc", metric: "cc_breaks" },
        presentation: "bars",
      },
    ],
  },
];

export function allDisplayLeaves(): MeterDisplayDef[] {
  return BAR_MODE_CYCLE.slice();
}

export function displayLabelForQuery(query: MeterQuery): string {
  const idx = barModeIndex(query);
  if (idx >= 0) return BAR_MODE_CYCLE[idx].label;
  switch (query.kind) {
    case "players":
      if (query.metric === "heal") return "Healing Done";
      if (query.metric === "taken") return "Damage Taken";
      if (query.metric === "healing_required") return "Healing Required";
      if (query.metric === "avoidance") return "Avoidance";
      return query.primary === "rate" ? "DPS" : "Damage Done";
    case "avoidance":
      return "Avoidance";
    case "misc":
      return "Miscellaneous";
    case "channel":
      return "Damage";
    case "snapshot":
      return query.mode === "pdps" ? "PDPS" : query.mode;
    case "rolling":
    case "realtime":
      return "Hit DPS";
    case "history":
      return "DPS graph";
    case "enemy_damage":
      return "Adds";
    case "taken_by_spell":
      return "Damage Taken by Spell";
    default:
      return "";
  }
}

/** Attribute-aware rate unit for statusbar PDPS (and similar). */
export function primaryRateUnit(query: MeterQuery): string {
  const metric =
    query.kind === "players" || query.kind === "details"
      ? query.metric
      : undefined;
  if (metric === "heal" || metric === "healing_required") return "HPS";
  if (metric === "taken") return "DTPS";
  if (query.kind === "snapshot" && query.mode === "pdps") return "PDPS";
  return "DPS";
}

/** @deprecated Prefer partyFocusMenuOptions({ hasObserver, watchedName, roster }). */
export const PARTY_FOCUS_OPTIONS: Array<{
  id: PartyFocus;
  label: string;
}> = partyFocusMenuOptions({ hasObserver: true, roster: "live" });

export const METER_PRESETS: MeterPresetDef[] = [
  {
    id: "damage",
    label: "DPS",
    query: { kind: "players", metric: "damage", primary: "rate" },
    presentation: "bars",
    defaultVisible: true,
    // Bottom-right cluster; HPS snaps on the right (see defaultMeterInstances).
    defaultPos: { x: 82.1004233706721, y: 99, anchor: "br" },
    defaultFrame: { w: 261, h: 157 },
  },
  {
    id: "heal",
    label: "HPS",
    query: { kind: "players", metric: "heal", primary: "rate" },
    presentation: "bars",
    defaultVisible: true,
    defaultPos: { x: 95.97476985743381, y: 99, anchor: "br" },
    defaultFrame: { w: 261, h: 157 },
  },
  {
    id: "taken",
    label: "Damage taken",
    query: { kind: "players", metric: "taken" },
    presentation: "bars",
    defaultVisible: false,
    defaultPos: { x: 1, y: 70, anchor: "bl" },
  },
  {
    id: "avoid",
    label: "Avoidance",
    query: { kind: "avoidance" },
    presentation: "bars",
    defaultVisible: false,
    defaultPos: { x: 1, y: 50, anchor: "tl" },
  },
  {
    id: "inspector",
    label: "Inspector",
    query: { kind: "details", actorId: "" },
    presentation: "details",
    catalog: false,
    catalogGroup: "tool",
    defaultVisible: false,
    defaultPos: { x: 50, y: 55, anchor: "bc" },
    defaultFrame: { w: 560, h: 400 },
  },
  {
    id: "death",
    label: "Deaths",
    query: { kind: "death_log" },
    presentation: "death_log",
    catalog: false,
    catalogGroup: "tool",
    defaultVisible: false,
    defaultPos: { x: 50, y: 88, anchor: "bc" },
    defaultFrame: { w: 780, h: 520 },
  },
  {
    id: "compare",
    label: "Compare",
    query: { kind: "compare", metric: "damage" },
    presentation: "compare",
    seriesMode: "compare",
    catalog: false,
    defaultVisible: false,
    defaultPos: { x: 95, y: 40, anchor: "tr" },
  },
  {
    id: "realtime",
    label: "Realtime",
    query: { kind: "realtime" },
    presentation: "realtime",
    seriesMode: "realtime",
    catalog: false,
    defaultVisible: false,
    defaultPos: { x: 95, y: 22, anchor: "tr" },
  },
  {
    id: "encounter",
    label: "Encounter Details",
    query: { kind: "encounter_summary" },
    presentation: "encounter",
    catalog: false,
    catalogGroup: "tool",
    defaultVisible: false,
    defaultPos: { x: 50, y: 88, anchor: "bc" },
    defaultFrame: { w: 780, h: 520 },
  },
  {
    id: "timeline",
    label: "Time Line",
    query: { kind: "timeline" },
    presentation: "timeline",
    catalog: false,
    catalogGroup: "tool",
    defaultVisible: false,
    defaultPos: { x: 50, y: 88, anchor: "bc" },
    defaultFrame: { w: 780, h: 520 },
  },
  {
    id: "summary",
    label: "Summary",
    query: { kind: "summary" },
    presentation: "summary",
    catalog: false,
    defaultVisible: false,
    defaultPos: { x: 30, y: 50, anchor: "center" },
  },
  {
    id: "pie",
    label: "Ability pie",
    query: { kind: "pie", metric: "damage" },
    presentation: "pie",
    catalog: false,
    defaultVisible: false,
    defaultPos: { x: 70, y: 50, anchor: "center" },
  },
  {
    id: "chart",
    label: "DPS graph",
    query: { kind: "history", channel: "dps" },
    presentation: "line",
    catalog: false,
    defaultVisible: false,
    defaultPos: { x: 95, y: 58, anchor: "br" },
  },
  {
    id: "rolling",
    label: "Hit DPS",
    query: { kind: "rolling" },
    presentation: "bars",
    catalogGroup: "al",
    defaultVisible: false,
    defaultPos: { x: 99.5, y: 50, anchor: "tr" },
  },
  {
    id: "pdps",
    label: "PDPS",
    query: { kind: "snapshot", mode: "pdps" },
    presentation: "bars",
    catalogGroup: "al",
    defaultVisible: false,
    hideWhenEmpty: true,
    defaultPos: { x: 99, y: 14, anchor: "tr" },
  },
  {
    id: "coop_v1",
    label: "s.coop v1",
    query: { kind: "snapshot", mode: "coop_v1" },
    presentation: "bars",
    catalogGroup: "al",
    defaultVisible: false,
    fadeWhenIdle: false,
    hideWhenEmpty: true,
    defaultPos: { x: 91, y: 63, anchor: "tr" },
  },
  {
    id: "coop_v2",
    label: "s.coop v2",
    query: { kind: "snapshot", mode: "coop_v2" },
    presentation: "bars",
    catalogGroup: "al",
    defaultVisible: false,
    fadeWhenIdle: false,
    hideWhenEmpty: true,
    defaultPos: { x: 99.5, y: 63, anchor: "tr" },
  },
  {
    id: "healreq",
    label: "Healing required",
    query: { kind: "players", metric: "healing_required" },
    presentation: "bars",
    defaultVisible: false,
    defaultPos: { x: 20, y: 40, anchor: "tl" },
  },
];

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function presetById(id: string): MeterPresetDef | null {
  for (let i = 0; i < METER_PRESETS.length; i++) {
    if (METER_PRESETS[i].id === id) return METER_PRESETS[i];
  }
  return null;
}

export function instanceFromPreset(
  preset: MeterPresetDef,
  overrides?: Partial<MeterInstance>,
): MeterInstance {
  const pos =
    overrides?.pos ||
    preset.defaultPos ||
    ({ x: 50, y: 50, anchor: "center" } as PanelPos);
  return {
    id: overrides?.id || newId(`meter-${preset.id}`),
    label: overrides?.label || preset.label,
    query: overrides?.query || { ...preset.query },
    presentation: overrides?.presentation || preset.presentation,
    seriesMode: overrides?.seriesMode || preset.seriesMode,
    selectedset: overrides?.selectedset || "current",
    partyFocus: overrides?.partyFocus || "watched",
    fadeWhenIdle:
      overrides?.fadeWhenIdle != null
        ? overrides.fadeWhenIdle
        : preset.fadeWhenIdle !== false,
    pos: { ...pos },
    visible: overrides?.visible != null ? overrides.visible : true,
    opacity: overrides?.opacity != null ? overrides.opacity : 1,
    stack: overrides?.stack,
    integrate: overrides?.integrate,
    normalize: overrides?.normalize,
    locked: overrides?.locked,
    hideWhenEmpty:
      overrides?.hideWhenEmpty != null
        ? overrides.hideWhenEmpty
        : preset.hideWhenEmpty,
    chromeOnHover: overrides?.chromeOnHover,
    statusbar: overrides?.statusbar || {
      left: "segment",
      center: "clock",
      right: "pdps",
    },
    frameW:
      overrides?.frameW != null ? overrides.frameW : preset.defaultFrame?.w,
    frameH:
      overrides?.frameH != null ? overrides.frameH : preset.defaultFrame?.h,
  };
}

/** Snapshot meters (PDPS / coop) hide when empty unless layout-editing. */
export function meterHidesWhenEmpty(inst: MeterInstance): boolean {
  if (typeof inst.hideWhenEmpty === "boolean") return inst.hideWhenEmpty;
  return inst.query.kind === "snapshot";
}

/**
 * Empty-hide mount policy (PDPS/coop): stay mounted while unlocked or in
 * Layout edit; hide only when locked, empty, and not editing layout.
 */
export function shouldMountEmptyHide(
  _inst: MeterInstance,
  opts: { layoutEdit: boolean; locked: boolean; hasRows: boolean },
): boolean {
  return opts.layoutEdit || !opts.locked || opts.hasRows;
}
export function barModeIndex(query: MeterQuery): number {
  for (let i = 0; i < BAR_MODE_CYCLE.length; i++) {
    const m = BAR_MODE_CYCLE[i];
    if (query.kind !== m.query.kind) continue;
    if (query.kind === "players" && m.query.kind === "players") {
      if (query.metric !== m.query.metric) continue;
      const qPrimary = query.primary || "total";
      const mPrimary =
        m.query.kind === "players" ? m.query.primary || "total" : "total";
      if (qPrimary === mPrimary) return i;
    } else if (query.kind === "avoidance" && m.query.kind === "avoidance") {
      return i;
    }
  }
  return -1;
}

export function cycleBarMode(
  query: MeterQuery,
  delta: number,
): { query: MeterQuery; label: string } {
  let idx = barModeIndex(query);
  if (idx < 0) idx = 0;
  const next =
    (idx + delta + BAR_MODE_CYCLE.length * 8) % BAR_MODE_CYCLE.length;
  const m = BAR_MODE_CYCLE[next];
  return {
    query: { ...m.query },
    label: m.label,
  };
}

/** Only core Displays cycle with ‹ › — AL presets stay fixed until changed via Add. */
export function canCycleBarMode(query: MeterQuery): boolean {
  return query.kind === "players" || query.kind === "avoidance";
}

/** Format ranked rows for clipboard / party report. */
export function formatMeterReportLines(
  title: string,
  rows: Array<{
    name: string;
    value: number;
    rate?: number | null;
    pct: number;
    primary?: "total" | "rate";
    barValue?: number;
  }>,
  metricLabel?: string,
): string {
  const lines = [`[${title}${metricLabel ? ` · ${metricLabel}` : ""}]`];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ratePrimary =
      r.primary === "rate" || (r.primary == null && r.barValue != null);
    if (ratePrimary && r.rate != null) {
      lines.push(
        `${i + 1}. ${r.name} — ${Math.round(r.rate)}/s (${Math.round(r.value)}) · ${Math.round(r.pct * 100)}%`,
      );
    } else {
      const rate = r.rate != null ? ` (${Math.round(r.rate)}/s)` : "";
      lines.push(
        `${i + 1}. ${r.name} — ${Math.round(r.value)}${rate} · ${Math.round(r.pct * 100)}%`,
      );
    }
  }
  return lines.join("\n");
}
