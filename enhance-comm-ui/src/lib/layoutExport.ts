import {
  PANEL_IDS,
  mergeLayout,
  type PanelId,
  type PanelLayoutMap,
  type PanelPos,
} from "./layout";
import {
  VIEWPORT_PROFILES,
  type ViewportProfile,
} from "./viewport";

export const LAYOUT_EXPORT_VERSION = 1;

export type LayoutExportPayload = {
  version: number;
  kind: "enhance-comm-ui-layout";
  exportedAt: string;
  layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>>;
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
    for (let j = 0; j < PANEL_IDS.length; j++) {
      const id = PANEL_IDS[j];
      if (isPanelPos(panelSrc[id])) map[id] = panelSrc[id] as PanelPos;
    }
    if (Object.keys(map).length) out[profile] = map;
  }
  return out;
}

/** Build a shareable JSON payload from profile layouts. */
export function buildLayoutExport(
  layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>>,
): LayoutExportPayload {
  const layouts: Partial<Record<ViewportProfile, PanelLayoutMap>> = {};
  for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
    const profile = VIEWPORT_PROFILES[i];
    const partial = layoutsByProfile[profile];
    if (!partial) continue;
    layouts[profile] = mergeLayout(partial);
  }
  return {
    version: LAYOUT_EXPORT_VERSION,
    kind: "enhance-comm-ui-layout",
    exportedAt: new Date().toISOString(),
    layoutsByProfile: layouts,
  };
}

export function stringifyLayoutExport(
  layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>>,
): string {
  return JSON.stringify(buildLayoutExport(layoutsByProfile), null, 2);
}

export type ParseLayoutExportResult =
  | { ok: true; layoutsByProfile: Partial<Record<ViewportProfile, PanelLayoutMap>> }
  | { ok: false; error: string };

/** Parse paste/upload JSON into profile layouts. */
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
  return { ok: true, layoutsByProfile };
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
