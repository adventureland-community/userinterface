/**
 * Default meterInstances + migration — mock-parity preset set.
 */

import type { PanelPos } from "../lib/layout";
import { refreshSnapFlags } from "../lib/panelEdgeGroup";
import {
  instanceFromPreset,
  METER_PRESETS,
  supportsViewModes,
} from "./meterCatalog";
import { normalizeStatusbarConfig } from "./meterStatusbarPlugins";
import type { MeterInstance, MeterQuery } from "./meterTypes";

const LEGACY_POS_MAP: Record<string, string> = {
  combat: "meter-chart",
  pdps: "meter-damage",
  hitDps: "meter-rolling",
  coopV1: "meter-coop_v1",
  coopV2: "meter-coop_v2",
};

function meterHasAnySnap(m: MeterInstance): boolean {
  const s = m.snap;
  if (!s) return false;
  return !!(s[1] || s[2] || s[3] || s[4]);
}

/** Stable ids for defaults so migration / backfill can find them. */
function stableId(presetId: string): string {
  return `meter-${presetId}`;
}

export function defaultMeterInstances(): MeterInstance[] {
  const out: MeterInstance[] = [];
  for (let i = 0; i < METER_PRESETS.length; i++) {
    const p = METER_PRESETS[i];
    if (!p.defaultVisible) continue;
    out.push(
      instanceFromPreset(p, {
        id: stableId(p.id),
        visible: true,
      }),
    );
  }
  // Playtested default: DPS ‖ HPS (rate primary), edge-snapped bottom-right.
  const dmg = out.find((m) => m.id === stableId("damage"));
  const heal = out.find((m) => m.id === stableId("heal"));
  if (dmg && heal) {
    dmg.label = "DPS";
    dmg.query = { kind: "players", metric: "damage", primary: "rate" };
    dmg.pos = { x: 82.1004233706721, y: 99, anchor: "br" };
    dmg.frameW = 261;
    dmg.frameH = 157;
    dmg.locked = true;
    dmg.zIndex = 63;
    dmg.stack = false;
    dmg.integrate = false;
    dmg.normalize = false;
    dmg.rtPaused = false;
    dmg.statusbar = { left: "segment", center: "clock", right: "pdps" };
    dmg.snap = { 3: heal.id };
    Object.assign(dmg, refreshSnapFlags(dmg));

    heal.label = "HPS";
    heal.query = { kind: "players", metric: "heal", primary: "rate" };
    heal.pos = { x: 95.97476985743381, y: 99, anchor: "br" };
    heal.frameW = 261;
    heal.frameH = 157;
    heal.locked = false;
    heal.zIndex = 64;
    heal.stack = false;
    heal.integrate = false;
    heal.normalize = false;
    heal.rtPaused = false;
    heal.statusbar = { left: "segment", center: "clock", right: "pdps" };
    heal.snap = { 1: dmg.id };
    Object.assign(heal, refreshSnapFlags(heal));
  }
  return out;
}

function isQuery(raw: any): raw is MeterQuery {
  return raw && typeof raw === "object" && typeof raw.kind === "string";
}

const COMPOSITION_CHANNEL_LABELS = new Set([
  "Explosion",
  "Direct",
  "DoT",
  "Burned",
  "AoE",
]);

/** Migrate off-model ranked instances (composition channels, morphed views). */
function migrateRankedInstance(row: {
  query: MeterQuery;
  presentation?: string;
  label?: string;
  seriesMode?: "realtime" | "compare";
}): {
  query: MeterQuery;
  presentation: string;
  label?: string;
  seriesMode?: "realtime" | "compare";
} {
  let query = row.query;
  let presentation = row.presentation || "bars";
  let label = row.label;
  let seriesMode = row.seriesMode;

  if (query.kind === "channel" && query.channel !== "dps") {
    query = { kind: "players", metric: "damage" };
    presentation = "bars";
    if (!label || COMPOSITION_CHANNEL_LABELS.has(label)) label = undefined;
  }

  // Legacy ranked view modes removed (dedicated realtime/compare queries keep theirs).
  if (presentation === "table") presentation = "bars";
  if (
    (presentation === "realtime" || presentation === "compare") &&
    supportsViewModes(query)
  ) {
    presentation = "bars";
    seriesMode = undefined;
  }

  return { query, presentation, label, seriesMode };
}

export function normalizeMeterInstances(raw: any): MeterInstance[] {
  if (!Array.isArray(raw) || !raw.length) return defaultMeterInstances();
  const out: MeterInstance[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object" || !isQuery(row.query)) continue;
    const id =
      typeof row.id === "string" && row.id
        ? row.id
        : `meter-${i}-${Date.now()}`;
    const pos =
      row.pos && typeof row.pos.x === "number" && typeof row.pos.y === "number"
        ? {
            x: row.pos.x,
            y: row.pos.y,
            anchor: row.pos.anchor || "tl",
          }
        : ({ x: 50, y: 50, anchor: "center" } as PanelPos);
    seen.add(id);
    let query = row.query as MeterQuery;
    let presentation = row.presentation || "bars";
    let label = typeof row.label === "string" ? row.label : undefined;
    // Old "DPS" series = channel dps bars duplicate of Damage
    if (
      (id === "meterChannels" || id === "meter-chart") &&
      query.kind === "channel" &&
      query.channel === "dps"
    ) {
      query = { kind: "history", channel: "dps" };
      presentation = "line";
      if (!label || label === "DPS") label = "DPS graph";
    }
    const migrated = migrateRankedInstance({
      query,
      presentation,
      label,
      seriesMode: row.seriesMode,
    });
    query = migrated.query;
    presentation = migrated.presentation;
    label = migrated.label;
    out.push({
      id,
      label,
      query,
      presentation,
      seriesMode: migrated.seriesMode,
      stack: !!row.stack,
      integrate: !!row.integrate,
      normalize: !!row.normalize,
      rtMetric: row.rtMetric,
      rtWindow: row.rtWindow,
      rtPaused: !!row.rtPaused,
      seriesEnabled: row.seriesEnabled,
      selectedset: row.selectedset || "current",
      partyFocus: row.partyFocus || "watched",
      fadeWhenIdle: row.fadeWhenIdle !== false,
      pos,
      visible: row.visible !== false,
      opacity:
        typeof row.opacity === "number"
          ? Math.min(1, Math.max(0.25, row.opacity))
          : 1,
      frameW:
        typeof row.frameW === "number" && row.frameW > 0
          ? row.frameW
          : undefined,
      frameH:
        typeof row.frameH === "number" && row.frameH > 0
          ? row.frameH
          : undefined,
      locked: typeof row.locked === "boolean" ? row.locked : undefined,
      zIndex:
        typeof row.zIndex === "number" &&
        Number.isFinite(row.zIndex) &&
        row.zIndex > 0
          ? Math.floor(row.zIndex)
          : undefined,
      hideWhenEmpty:
        typeof row.hideWhenEmpty === "boolean" ? row.hideWhenEmpty : undefined,
      alwaysShowSelf:
        typeof row.alwaysShowSelf === "boolean"
          ? row.alwaysShowSelf
          : undefined,
      chromeOnHover:
        typeof row.chromeOnHover === "boolean" ? row.chromeOnHover : undefined,
      statusbar: normalizeStatusbarConfig(row.statusbar),
      snap:
        row.snap && typeof row.snap === "object"
          ? {
              1: typeof row.snap[1] === "string" ? row.snap[1] : undefined,
              2: typeof row.snap[2] === "string" ? row.snap[2] : undefined,
              3: typeof row.snap[3] === "string" ? row.snap[3] : undefined,
              4: typeof row.snap[4] === "string" ? row.snap[4] : undefined,
            }
          : undefined,
    });
  }
  if (!out.length) return defaultMeterInstances();

  // Backfill only current defaults (DPS / HPS).
  // Demoted panels are catalog-only — never re-injected onto existing saves.
  // Existing saves keep their own labels/queries/positions — only missing ids.
  const defaults = defaultMeterInstances();
  for (let i = 0; i < defaults.length; i++) {
    const d = defaults[i];
    if (!seen.has(d.id)) {
      out.push({
        ...d,
        pos: { ...d.pos },
        snap: d.snap ? { ...d.snap } : undefined,
      });
      seen.add(d.id);
    }
  }

  // Ensure DPS ‖ HPS snap if both stable defaults exist and neither has snap yet.
  const dmg = out.find((m) => m.id === "meter-damage");
  const heal = out.find((m) => m.id === "meter-heal");
  if (
    dmg &&
    heal &&
    !dmg.snap?.[3] &&
    !heal.snap?.[1] &&
    !meterHasAnySnap(dmg) &&
    !meterHasAnySnap(heal)
  ) {
    dmg.snap = { ...(dmg.snap || {}), 3: heal.id };
    heal.snap = { ...(heal.snap || {}), 1: dmg.id };
  }

  // Hide empty-subject Inspectors (not a permanent default); allow multiples.
  const next: MeterInstance[] = [];
  for (let i = 0; i < out.length; i++) {
    const m = out[i];
    const isDetails =
      m.presentation === "details" || m.query.kind === "details";
    if (
      isDetails &&
      m.query.kind === "details" &&
      (!m.query.actorId || m.query.actorId === "")
    ) {
      next.push({ ...m, presentation: "details", visible: false });
      continue;
    }
    next.push(m);
  }
  return next;
}

export function migrateLegacyMeterLayout(
  instances: MeterInstance[],
  legacyLayout: Record<string, PanelPos | undefined> | null | undefined,
): MeterInstance[] {
  if (!legacyLayout) return instances;
  const next = instances.map((m) => ({ ...m, pos: { ...m.pos } }));
  const byId: Record<string, MeterInstance> = {};
  for (let i = 0; i < next.length; i++) byId[next[i].id] = next[i];

  const legacyKeys = Object.keys(LEGACY_POS_MAP);
  for (let i = 0; i < legacyKeys.length; i++) {
    const legacyId = legacyKeys[i];
    const meterId = LEGACY_POS_MAP[legacyId];
    const pos = legacyLayout[legacyId];
    if (pos && byId[meterId]) {
      byId[meterId].pos = { ...pos };
    }
  }
  return next;
}

export { LEGACY_POS_MAP };
