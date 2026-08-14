import { injectDialogHostCss } from "./css";
import {
  ADOPTED_CLASS,
  BUFF_DIALOG_ID,
  ITEM_DIALOG_ID,
  STOCK_DIALOG_ID,
  dialogIdFor,
  panelAttrFor,
  type InfoDialogKind,
} from "./types";

export function dialogEl(kind: InfoDialogKind): HTMLElement | null {
  return document.getElementById(dialogIdFor(kind));
}

export function hasContent(el: HTMLElement | null): boolean {
  return !!(el && String(el.innerHTML || "").trim());
}

function ensureNamedDialog(id: string, parent: HTMLElement): HTMLElement {
  let dialog = document.getElementById(id);
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = id;
    dialog.className = "bpclicks enableclicks";
    parent.append(dialog);
  }
  return dialog;
}

export function ensureDialogElements(): {
  buff: HTMLElement;
  item: HTMLElement;
  stock: HTMLElement;
} {
  injectDialogHostCss();

  const body = document.body;
  if (!body) {
    throw new Error("ensureDialogElements: document.body is not ready");
  }

  let corner = document.getElementById("topleftcorner");
  if (!corner) {
    corner = document.createElement("div");
    corner.id = "topleftcorner";
    corner.className = "bpclicks";
    body.append(corner);
  }

  if (!document.getElementById("topleftcornerui")) {
    const ui = document.createElement("div");
    ui.id = "topleftcornerui";
    ui.className = "bpclicks";
    corner.append(ui);
  }

  const stock = ensureNamedDialog(STOCK_DIALOG_ID, corner);
  const buff = ensureNamedDialog(BUFF_DIALOG_ID, corner);
  const item = ensureNamedDialog(ITEM_DIALOG_ID, corner);
  return { buff, item, stock };
}

/** Keep dialog host inside the CommUI layout slot when present. */
export function adoptInfoDialog(
  kind: InfoDialogKind,
  slot: HTMLElement,
): HTMLElement {
  const { buff, item } = ensureDialogElements();
  const dialog = kind === "buff" ? buff : item;
  if (dialog.parentElement !== slot) {
    slot.appendChild(dialog);
  }
  dialog.classList.add(ADOPTED_CLASS);
  dialog.setAttribute("data-ecu-kind", kind);
  dialog.setAttribute("data-panel-host", panelAttrFor(kind));
  const corner = document.getElementById("topleftcorner");
  if (corner) corner.classList.add("ecu-info-slot-host");
  return dialog;
}

export function ensureAdoptedHost(kind: InfoDialogKind): HTMLElement {
  const { buff, item } = ensureDialogElements();
  const slotSel =
    kind === "item" ? ".comm-item-info-slot" : ".comm-buff-info-slot";
  const slot = document.querySelector(slotSel) as HTMLElement | null;
  if (slot) return adoptInfoDialog(kind, slot);
  return kind === "buff" ? buff : item;
}
