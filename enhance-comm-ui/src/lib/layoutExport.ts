import {
  PANEL_IDS,
  mergeLayout,
  migrateLegacyPanelIds,
  type PanelId,
  type PanelLayoutMap,
  type PanelPos,
} from "./layout";
import {
  DEFAULT_LAYOUT_CHROME_POS,
  getLayoutEditPrefs,
  type LayoutChromePos,
  type LayoutEditPrefs,
} from "./layoutEditPrefs";
import { normalizeGridStep } from "./layoutGrid";
import { VIEWPORT_PROFILES, type ViewportProfile } from "./viewport";
import {
  defaultMeterInstances,
  normalizeMeterInstances,
} from "../meters/meterPresets";
import type { MeterInstance } from "../meters/meterTypes";

/** v2 adds meterInstances + layoutEditPrefs (grid snap). v1 panel-only still imports. */
export const LAYOUT_EXPORT_VERSION = 2;

/** Snap / free-placement prefs included in layout copy (field: `gridStep`). */
export type LayoutExportEditPrefs = {
  freePlacement: boolean;
  /** Viewport-% fine grid step (default 1). */
  gridStep: number;
  chromePos?: LayoutChromePos;
};

export type LayoutExportPayload = {
  version: number;
  kind: "enhance-comm-ui-layout";
  exportedAt: string;
  layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>>;
  /** Meter windows — positions + full MeterInstance config. Absent on v1. */
  meterInstances?: MeterInstance[];
  /** Layout-edit prefs (snap grid step, free placement, chrome bar pos). */
  layoutEditPrefs?: LayoutExportEditPrefs;
};

/** Inputs for building an export (call sites gather from settings + prefs). */
export type LayoutExportInput = {
  layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>>;
  meterInstances?: MeterInstance[];
  layoutEditPrefs?: LayoutEditPrefs | LayoutExportEditPrefs;
};

function isPanelPos(raw: unknown): raw is PanelPos {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o.x === "number" && typeof o.y === "number";
}

function sanitizeProfileMap(
  raw: unknown,
): Partial<Record<ViewportProfile, PanelLayoutMap>> {
  const out: Partial<Record<ViewportProfile, PanelLayoutMap>> = {};
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;
  for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
    const profile = VIEWPORT_PROFILES[i];
    const chunk = src[profile];
    if (!chunk || typeof chunk !== "object") continue;
    const map: PanelLayoutMap = {};
    const panelSrc = chunk as Record<string, unknown>;
    const migrated = migrateLegacyPanelIds(
      panelSrc as PanelLayoutMap,
    ) as PanelLayoutMap;
    for (let j = 0; j < PANEL_IDS.length; j++) {
      const id = PANEL_IDS[j];
      if (isPanelPos(migrated[id])) map[id] = migrated[id] as PanelPos;
    }
    if (Object.keys(map).length) out[profile] = map;
  }
  return out;
}

function sanitizeEditPrefs(raw: unknown): LayoutExportEditPrefs | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const prefs: LayoutExportEditPrefs = {
    freePlacement: !!o.freePlacement,
    gridStep:
      o.gridStep != null ? normalizeGridStep(o.gridStep) : normalizeGridStep(1),
  };
  if (o.chromePos && typeof o.chromePos === "object") {
    const c = o.chromePos as Record<string, unknown>;
    if (typeof c.x === "number" && typeof c.y === "number") {
      prefs.chromePos = {
        x: Math.max(0, Math.min(100, c.x)),
        y: Math.max(0, Math.min(100, c.y)),
      };
    }
  }
  return prefs;
}

function cloneMetersForExport(list: MeterInstance[]): MeterInstance[] {
  if (!Array.isArray(list) || !list.length) return [];
  const out: MeterInstance[] = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (!m || typeof m !== "object" || !m.query) continue;
    out.push({
      ...m,
      pos: { ...m.pos },
      query: { ...m.query } as MeterInstance["query"],
      snap: m.snap ? { ...m.snap } : undefined,
      statusbar: m.statusbar ? { ...m.statusbar } : undefined,
      seriesEnabled: m.seriesEnabled ? { ...m.seriesEnabled } : undefined,
    });
  }
  return out;
}

function serializeEditPrefs(
  prefs: LayoutEditPrefs | LayoutExportEditPrefs,
): LayoutExportEditPrefs {
  const out: LayoutExportEditPrefs = {
    freePlacement: !!prefs.freePlacement,
    gridStep: normalizeGridStep(prefs.gridStep),
  };
  if (prefs.chromePos) {
    out.chromePos = { x: prefs.chromePos.x, y: prefs.chromePos.y };
  }
  return out;
}

/** Build a shareable JSON payload from profile layouts (+ optional meters / snap prefs). */
export function buildLayoutExport(
  input: LayoutExportInput | Partial<Record<ViewportProfile, PanelLayoutMap>>,
): LayoutExportPayload {
  const isWrapped =
    input &&
    typeof input === "object" &&
    ("layoutsByProfile" in input ||
      "meterInstances" in input ||
      "layoutEditPrefs" in input);
  const wrapped = (isWrapped ? input : null) as LayoutExportInput | null;
  const layoutsByProfile = wrapped
    ? wrapped.layoutsByProfile
    : (input as Partial<Record<ViewportProfile, PanelLayoutMap>>);

  const layouts: Partial<Record<ViewportProfile, PanelLayoutMap>> = {};
  for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
    const profile = VIEWPORT_PROFILES[i];
    const partial = layoutsByProfile[profile];
    if (!partial) continue;
    layouts[profile] = mergeLayout(partial);
  }

  const payload: LayoutExportPayload = {
    version: LAYOUT_EXPORT_VERSION,
    kind: "enhance-comm-ui-layout",
    exportedAt: new Date().toISOString(),
    layoutsByProfile: layouts,
  };

  if (wrapped?.meterInstances) {
    payload.meterInstances = cloneMetersForExport(wrapped.meterInstances);
  }
  if (wrapped?.layoutEditPrefs) {
    payload.layoutEditPrefs = serializeEditPrefs(wrapped.layoutEditPrefs);
  }
  return payload;
}

/**
 * Built-in default package: HUD positions (desktop/tablet/phone) + DPS‖HPS
 * meter instances + snap prefs (1% grid). Fresh install / reset packaging.
 */
export function buildDefaultLayoutExport(): LayoutExportPayload {
  return buildLayoutExport({
    layoutsByProfile: {
      desktop: mergeLayout(null, "desktop"),
      tablet: mergeLayout(null, "tablet"),
      phone: mergeLayout(null, "phone"),
    },
    meterInstances: defaultMeterInstances(),
    layoutEditPrefs: {
      freePlacement: false,
      gridStep: normalizeGridStep(1),
      chromePos: { ...DEFAULT_LAYOUT_CHROME_POS },
    },
  });
}

export function stringifyLayoutExport(
  input: LayoutExportInput | Partial<Record<ViewportProfile, PanelLayoutMap>>,
): string {
  return JSON.stringify(buildLayoutExport(input), null, 2);
}

export type ParseLayoutExportResult =
  | {
      ok: true;
      layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>>;
      meterInstances?: MeterInstance[];
      layoutEditPrefs?: LayoutExportEditPrefs;
    }
  | { ok: false; error: string };

/** Parse paste/upload JSON into profile layouts (+ meters / snap when present). */
export function parseLayoutExport(raw: string): ParseLayoutExportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Expected a JSON object" };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.kind != null && obj.kind !== "enhance-comm-ui-layout") {
    return { ok: false, error: "Not an enhance-comm-ui layout export" };
  }
  const layoutsRaw =
    obj.layoutsByProfile ||
    obj.panelLayoutsByProfile ||
    (obj.panelLayout ? { desktop: obj.panelLayout } : null);
  const layoutsByProfile = sanitizeProfileMap(layoutsRaw);
  if (!Object.keys(layoutsByProfile).length) {
    return { ok: false, error: "No panel layouts found in export" };
  }

  const result: {
    ok: true;
    layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>>;
    meterInstances?: MeterInstance[];
    layoutEditPrefs?: LayoutExportEditPrefs;
  } = {
    ok: true,
    layoutsByProfile,
  };

  if (Array.isArray(obj.meterInstances)) {
    // Normalize on import (same path as settings load); preserves empty→defaults.
    result.meterInstances = normalizeMeterInstances(obj.meterInstances);
  }

  // Accept nested layoutEditPrefs, or top-level gridStep / freePlacement aliases.
  const nestedPrefs = sanitizeEditPrefs(obj.layoutEditPrefs);
  if (nestedPrefs) {
    result.layoutEditPrefs = nestedPrefs;
  } else if (obj.gridStep != null || obj.freePlacement != null) {
    result.layoutEditPrefs = sanitizeEditPrefs({
      freePlacement: obj.freePlacement,
      gridStep: obj.gridStep,
      chromePos: obj.chromePos,
    });
  }

  return result;
}

/** Download a layout JSON file in the browser. */
export function downloadLayoutJson(json: string, filename?: string): void {
  const name = filename || `enhance-comm-ui-layout-${Date.now()}.json`;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function panelIdsInExport(
  layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>>,
): PanelId[] {
  const seen = new Set<PanelId>();
  for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
    const map = layoutsByProfile[VIEWPORT_PROFILES[i]];
    if (!map) continue;
    const keys = Object.keys(map) as PanelId[];
    for (let j = 0; j < keys.length; j++) seen.add(keys[j]);
  }
  const out: PanelId[] = [];
  for (let i = 0; i < PANEL_IDS.length; i++) {
    if (seen.has(PANEL_IDS[i])) out.push(PANEL_IDS[i]);
  }
  return out;
}

/** Snapshot current layout-edit prefs for export (live values). */
export function currentLayoutEditPrefsForExport(): LayoutExportEditPrefs {
  return serializeEditPrefs(getLayoutEditPrefs());
}
