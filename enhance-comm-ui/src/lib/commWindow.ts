/**
 * Comm window policies — Details-style window control for every positioned panel.
 */

import { PANEL_IDS, type PanelId } from "./layout";
import { CLOSABLE_PANEL_IDS, windowFramePersist } from "./panelCatalog";

export { canAutoSizeWindow } from "./panelCatalog";

/** Control-strip / chrome that should not edge-snap. */
const NO_GROUP_IDS = new Set<string>(["toggles"]);

const CLOSABLE = new Set<string>(CLOSABLE_PANEL_IDS as readonly string[]);

export function canGroupWindow(id: string): boolean {
  return !NO_GROUP_IDS.has(id);
}

export function canResizeWindow(id: string): boolean {
  return windowFramePersist(id) !== "none";
}

export function canCloseWindow(id: string): boolean {
  return CLOSABLE.has(id);
}

/** HUD panels that participate in the unified window graph. */
export function hudWindowIds(): PanelId[] {
  const out: PanelId[] = [];
  for (let i = 0; i < PANEL_IDS.length; i++) {
    const id = PANEL_IDS[i];
    if (canGroupWindow(id)) out.push(id);
  }
  return out;
}

export type CommWindowKind = "hud" | "meter";

export function windowKind(id: string): CommWindowKind {
  // Meter instance ids are opaque strings (not PanelId).
  for (let i = 0; i < PANEL_IDS.length; i++) {
    if (PANEL_IDS[i] === id) return "hud";
  }
  return "meter";
}
