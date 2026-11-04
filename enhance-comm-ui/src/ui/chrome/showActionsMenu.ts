/**
 * Route action menus to phone sheet (touch) or floating ctx (desktop).
 */

import { isCommTouchUi } from "../../lib/commTouchUi";
import type { ActionMenuAction } from "./actionMenuTypes";
import {
  hideFloatingActionMenu,
  showFloatingActionMenu,
} from "./floatingActionMenu";
import {
  hidePhoneActionSheet,
  showPhoneActionSheet,
} from "./phoneActionSheet";

export type ShowActionsMenuOpts = {
  clientX: number;
  clientY: number;
  actions: ActionMenuAction[];
  title?: string;
  /** Force sheet / floating regardless of viewport. */
  force?: "sheet" | "floating";
};

export function hideActionsMenu(): void {
  hidePhoneActionSheet();
  hideFloatingActionMenu();
}

/** Open the shared action menu at a pointer position. */
export function showActionsMenu(opts: ShowActionsMenuOpts): void {
  if (!opts.actions.length) return;
  const mode =
    opts.force || (isCommTouchUi() ? "sheet" : "floating");
  if (mode === "sheet") {
    hideFloatingActionMenu();
    showPhoneActionSheet({
      title: opts.title,
      actions: opts.actions,
    });
    return;
  }
  hidePhoneActionSheet();
  showFloatingActionMenu({
    clientX: opts.clientX,
    clientY: opts.clientY,
    actions: opts.actions,
  });
}
