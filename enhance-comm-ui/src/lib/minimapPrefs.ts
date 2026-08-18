/**
 * Persisted minimap camera / background prefs.
 * Visual palettes stay in ui/minimap/minimapAppearance.
 */

export const MINIMAP_ZOOM_MIN = 80;
export const MINIMAP_ZOOM_MAX = 2400;
/** Comfortable solo half-span (shorter canvas axis). */
export const MINIMAP_ZOOM_DEFAULT = 220;

export function clampMinimapZoom(n: number): number {
  if (!Number.isFinite(n)) return MINIMAP_ZOOM_DEFAULT;
  return Math.max(MINIMAP_ZOOM_MIN, Math.min(MINIMAP_ZOOM_MAX, Math.round(n)));
}

export type MinimapBgMode = "opaque" | "faint" | "transparent";

export const MINIMAP_BG_DEFAULT: MinimapBgMode = "opaque";

const MODES: MinimapBgMode[] = ["opaque", "faint", "transparent"];

export function normalizeMinimapBgMode(raw: unknown): MinimapBgMode {
  if (typeof raw === "string" && MODES.indexOf(raw as MinimapBgMode) >= 0) {
    return raw as MinimapBgMode;
  }
  return MINIMAP_BG_DEFAULT;
}

export function cycleMinimapBgMode(mode: MinimapBgMode): MinimapBgMode {
  const i = MODES.indexOf(mode);
  return MODES[(i + 1) % MODES.length];
}
