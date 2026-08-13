/**
 * Details-style statusbar micro-display plugins (left / center / right).
 * Pure helpers — UI layer renders slots; this file owns text + defaults.
 */

import {
  formatCompactNumber,
  formatCompactRate,
} from "../lib/format";
import {
  displayLabelForQuery,
  primaryRateUnit,
} from "./meterCatalog";
import { runMeterQuery } from "./meterQuery";
import type {
  MeterInstance,
  MeterQuery,
  MeterStatusbarConfig,
  SegmentRef,
  StatusbarPluginId,
} from "./meterTypes";

export const DEFAULT_STATUSBAR: MeterStatusbarConfig = {
  left: "segment",
  center: "clock",
  right: "pdps",
};

export type StatusbarPluginDef = {
  id: StatusbarPluginId;
  label: string;
};

/** Options panel dropdown entries (includes Off). */
export const STATUSBAR_PLUGIN_OPTIONS: StatusbarPluginDef[] = [
  { id: "off", label: "Off" },
  { id: "segment", label: "Segment" },
  { id: "clock", label: "Clock" },
  { id: "pdps", label: "PDPS (primary rate)" },
  { id: "attribute", label: "Attribute" },
  { id: "total", label: "Total" },
];

const PLUGIN_IDS = new Set<string>(
  STATUSBAR_PLUGIN_OPTIONS.map((p) => p.id),
);

/** Plugins that need a ranked attribute total (PDPS / Total). */
const PLUGIN_NEEDS_TOTAL: Record<StatusbarPluginId, boolean> = {
  off: false,
  segment: false,
  clock: false,
  attribute: false,
  pdps: true,
  total: true,
};

export function pluginNeedsTotal(plugin: StatusbarPluginId): boolean {
  return !!PLUGIN_NEEDS_TOTAL[plugin];
}

export function statusbarNeedsTotal(cfg: MeterStatusbarConfig): boolean {
  return (
    pluginNeedsTotal(cfg.left) ||
    pluginNeedsTotal(cfg.center) ||
    pluginNeedsTotal(cfg.right)
  );
}

function isPluginId(raw: unknown): raw is StatusbarPluginId {
  return typeof raw === "string" && PLUGIN_IDS.has(raw);
}

/** Normalize / migrate a persisted statusbar block. */
export function normalizeStatusbarConfig(
  raw: unknown,
): MeterStatusbarConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STATUSBAR };
  }
  const o = raw as Record<string, unknown>;
  return {
    left: isPluginId(o.left) ? o.left : DEFAULT_STATUSBAR.left,
    center: isPluginId(o.center) ? o.center : DEFAULT_STATUSBAR.center,
    right: isPluginId(o.right) ? o.right : DEFAULT_STATUSBAR.right,
  };
}

export function statusbarForInstance(
  instance: MeterInstance,
): MeterStatusbarConfig {
  return normalizeStatusbarConfig(instance.statusbar);
}

/** Details clock: `Nm Ns` / `Ns`. */
export function formatStatusbarClock(durSec: number): string {
  const sec = Math.max(0, Math.floor(durSec));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

/**
 * Query used to sum attribute totals for PDPS / Total.
 * Forces `primary: "total"` so rate-mode windows still use amount ÷ time.
 */
export function statusbarTotalQuery(query: MeterQuery): MeterQuery | null {
  switch (query.kind) {
    case "players":
      return {
        kind: "players",
        metric: query.metric,
        primary: "total",
      };
    case "channel":
      return { kind: "channel", channel: query.channel };
    case "avoidance":
      return { kind: "avoidance" };
    case "misc":
      return { kind: "misc", metric: query.metric };
    case "enemy_damage":
      return { kind: "enemy_damage" };
    case "taken_by_spell":
      return { kind: "taken_by_spell" };
    case "snapshot":
      return { kind: "snapshot", mode: query.mode };
    case "rolling":
      return { kind: "rolling" };
    case "realtime":
      return { kind: "realtime" };
    default:
      return null;
  }
}

export function sumRankedTotal(
  query: MeterQuery,
  segmentRef: SegmentRef,
  partyFocus: MeterInstance["partyFocus"],
): number {
  const q = statusbarTotalQuery(query);
  if (!q) return 0;
  const res = runMeterQuery(q, { segmentRef, partyFocus });
  if (res.kind !== "ranked") return 0;
  let total = 0;
  for (let i = 0; i < res.rows.length; i++) total += res.rows[i].value;
  return total;
}

export type StatusbarRenderCtx = {
  plugin: StatusbarPluginId;
  segmentLabel: string;
  durSec: number;
  query: MeterQuery;
  instanceLabel?: string;
  attributeTotal: number;
};

export type StatusbarSlotAction = "segment" | "encounter" | null;

export function statusbarSlotAction(
  plugin: StatusbarPluginId,
): StatusbarSlotAction {
  switch (plugin) {
    case "segment":
      return "segment";
    case "attribute":
      return "encounter";
    case "off":
    case "clock":
    case "pdps":
    case "total":
      return null;
    default: {
      const _exhaustive: never = plugin;
      return _exhaustive;
    }
  }
}

/** Text for one micro-display slot. Empty string = hide / Off. */
export function renderStatusbarPluginText(ctx: StatusbarRenderCtx): string {
  switch (ctx.plugin) {
    case "off":
      return "";
    case "segment":
      return ctx.segmentLabel || "Current";
    case "clock":
      return formatStatusbarClock(ctx.durSec);
    case "pdps": {
      const rate =
        ctx.durSec > 0 ? ctx.attributeTotal / Math.max(ctx.durSec, 1e-6) : 0;
      const unit = primaryRateUnit(ctx.query);
      return `${formatCompactRate(rate)} ${unit}`;
    }
    case "attribute": {
      const fromCatalog = displayLabelForQuery(ctx.query);
      if (fromCatalog) return fromCatalog;
      if (ctx.instanceLabel) return ctx.instanceLabel;
      return "Meter";
    }
    case "total":
      return formatCompactNumber(ctx.attributeTotal);
    default: {
      const _exhaustive: never = ctx.plugin;
      return String(_exhaustive);
    }
  }
}

export function statusbarPluginTitle(plugin: StatusbarPluginId): string {
  for (let i = 0; i < STATUSBAR_PLUGIN_OPTIONS.length; i++) {
    if (STATUSBAR_PLUGIN_OPTIONS[i].id === plugin)
      return STATUSBAR_PLUGIN_OPTIONS[i].label;
  }
  return "Status";
}
