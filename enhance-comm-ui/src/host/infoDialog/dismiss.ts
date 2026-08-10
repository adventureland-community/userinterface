import {
  BUFF_DIALOG_ID,
  INFO_SOURCE_ATTR,
  ITEM_DIALOG_ID,
  type InfoDialogKind,
} from "./types";
import { dialogEl, hasContent } from "./hosts";
import { clearInfoHost } from "./write";

const BOUND = "__ecuDialogDismissBound";

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

/**
 * Capture-phase dismiss: runs before React open handlers.
 * Sources marked with INFO_SOURCE_ATTR are ignored so open+dismiss never race.
 */
export function installDialogDismiss(): void {
  if ((window as any)[BOUND]) return;
  (window as any)[BOUND] = true;

  document.addEventListener(
    "pointerdown",
    (ev: PointerEvent) => {
      if (layoutEditing) return;
      if (!isOpen("buff") && !isOpen("item")) return;
      const t = ev.target as Node | null;
      if (!t) return;
      const el = t as HTMLElement;
      if (isInfoDialogChrome(el) || isInfoSource(el)) return;
      clearInfoHost("buff");
      clearInfoHost("item");
    },
    true,
  );
}
