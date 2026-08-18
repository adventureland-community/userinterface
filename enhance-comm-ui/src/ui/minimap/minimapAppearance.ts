/** Minimap shell + canvas background presets. */

import {
  cycleMinimapBgMode,
  MINIMAP_BG_DEFAULT,
  normalizeMinimapBgMode,
  type MinimapBgMode,
} from "../../lib/minimapPrefs";

export type { MinimapBgMode };
export { MINIMAP_BG_DEFAULT, normalizeMinimapBgMode, cycleMinimapBgMode };

export type MinimapBgPalette = {
  /** Canvas fill before walls/dots; null = leave cleared. */
  canvasBg: string | null;
  /** Screen-space grid; null = skip. */
  gridColor: string | null;
};

export function minimapBgPalette(mode: MinimapBgMode): MinimapBgPalette {
  switch (mode) {
    case "transparent":
      return { canvasBg: null, gridColor: null };
    case "faint":
      return {
        canvasBg: "rgba(12, 14, 18, 0.12)",
        gridColor: "rgba(255, 255, 255, 0.018)",
      };
    case "opaque":
      return {
        canvasBg: "#0c0e12",
        gridColor: "rgba(255, 255, 255, 0.05)",
      };
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function minimapBgModeLabel(mode: MinimapBgMode): string {
  switch (mode) {
    case "opaque":
      return "Solid";
    case "faint":
      return "Faint";
    case "transparent":
      return "Clear";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function minimapBgModeTitle(mode: MinimapBgMode): string {
  switch (mode) {
    case "opaque":
      return "Background: solid grid — click for faint";
    case "faint":
      return "Background: very faint grid — click for transparent";
    case "transparent":
      return "Background: transparent (no grid) — click for solid";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
