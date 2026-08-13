/**
 * Capture-phase dismiss for parked item/buff info dialogs.
 */

import {
  BUFF_DIALOG_ID,
  INFO_SOURCE_ATTR,
  ITEM_DIALOG_ID,
  type InfoDialogKind,
} from "./types";
import { dialogEl, hasContent } from "./hosts";
import { clearInfoHost } from "./write";

const HANDLER = "__ecuDialogDismissHandler";

let layoutEditing = false;

export function setInfoDialogLayoutEditing(editing: boolean): void {
  layoutEditing = !!editing;
}

function isOpen(kind: InfoDialogKind): boolean {
  return hasContent(dialogEl(kind));
}

function isInfoDialogChrome(el: HTMLElement): boolean {
  if (!el.closest) return false;
  return !!(
    el.closest("#" + BUFF_DIALOG_ID) ||
    el.closest("#" + ITEM_DIALOG_ID) ||
    el.closest('[data-panel="buffInfo"]') ||
    el.closest('[data-panel="itemInfo"]')
  );
}

function isInfoSource(el: HTMLElement): boolean {
  if (!el.closest) return false;
  return !!el.closest("[" + INFO_SOURCE_ATTR + "]");
}

/** Tour overlay chrome — never treat as outside-click dismiss. */
function isTourChrome(el: HTMLElement): boolean {
  if (!el.closest) return false;
  return !!(
    el.closest("[data-ecu-tour-portal]") ||
    el.closest(".ecu-tour-root") ||
    el.closest(".ecu-tour-card")
  );
}

function onDialogDismissPointerDown(ev: PointerEvent): void {
  if (layoutEditing) return;
  if (!isOpen("buff") && !isOpen("item")) return;
  const t = ev.target as Node | null;
  if (!t) return;
  const el = t as HTMLElement;
  if (isInfoDialogChrome(el) || isInfoSource(el) || isTourChrome(el)) {
    return;
  }
  clearInfoHost("buff");
  clearInfoHost("item");
}

/**
 * Capture-phase dismiss: runs before React open handlers.
 * Sources marked with INFO_SOURCE_ATTR are ignored so open+dismiss never race.
 * Re-install replaces the listener so hot reload picks up dismiss fixes.
 */
export function installDialogDismiss(): void {
  const prev = (window as any)[HANDLER] as
    | ((ev: PointerEvent) => void)
    | undefined;
  if (prev) {
    document.removeEventListener("pointerdown", prev, true);
  }
  (window as any)[HANDLER] = onDialogDismissPointerDown;
  document.addEventListener("pointerdown", onDialogDismissPointerDown, true);
}
