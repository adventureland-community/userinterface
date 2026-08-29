/**
 * Unified window-chrome close — one × in the yellow arrange strip.
 * Visibility panels hide via panelVisible; content panels dismiss their payload.
 */

import { closeInfo } from "../host/infoDialog/api";
import type { PanelId } from "./layout";
import { canCloseWindow } from "./commWindow";

export type PanelCloseDeps = {
  setVisible: (id: PanelId, visible: boolean) => void;
  selectedEntity: string | undefined;
  closePaperdoll: () => void;
  buffInfoOpen: boolean;
  itemInfoOpen: boolean;
};

export type PanelCloseKind =
  | "visibility"
  | "content-paperdoll"
  | "content-buff"
  | "content-item"
  | "none";

/** Which close path applies — testable without DOM side effects. */
export function panelCloseKind(
  id: PanelId,
  deps: PanelCloseDeps,
): PanelCloseKind {
  if (canCloseWindow(id)) return "visibility";
  if (id === "paperdoll" && deps.selectedEntity) return "content-paperdoll";
  if (id === "buffInfo" && deps.buffInfoOpen) return "content-buff";
  if (id === "itemInfo" && deps.itemInfoOpen) return "content-item";
  return "none";
}

/** Handler for PositionedPanel `onClose`, or undefined when chrome has no ×. */
export function resolvePanelClose(
  id: PanelId,
  deps: PanelCloseDeps,
): (() => void) | undefined {
  const kind = panelCloseKind(id, deps);
  switch (kind) {
    case "visibility":
      return () => deps.setVisible(id, false);
    case "content-paperdoll":
      return () => deps.closePaperdoll();
    case "content-buff":
      return () => {
        closeInfo("buff");
      };
    case "content-item":
      return () => {
        closeInfo("item");
      };
    case "none":
      return undefined;
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      return undefined;
    }
  }
}

export function panelHasChromeClose(
  id: PanelId,
  deps: PanelCloseDeps,
): boolean {
  return panelCloseKind(id, deps) !== "none";
}
