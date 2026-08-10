import { bindOpenHandlers } from "./bindings";
import {
  adoptInfoDialog as adoptHost,
  dialogEl,
  ensureAdoptedHost,
  ensureDialogElements,
  hasContent,
} from "./hosts";
import { installDialogDismiss, setInfoDialogLayoutEditing } from "./dismiss";
import { installInfoDialogLifecycle, installRenderPatches } from "./patches";
import {
  bindCloseImpl,
  buildConditionHtml,
  buildItemHtml,
  clearInfoHost,
  setPendingWriteKind,
  subscribeInfoDialogChange,
  writeInfoHtml,
} from "./write";
import type { InfoDialogKind } from "./types";
import { INFO_SOURCE_ATTR } from "./types";

let lastConditionId = "";
let lastSlotName = "";

function resolvePaperdollEntity(entity: any): any {
  if (!entity) return entity;
  const id = entity.id;
  if (id == null || id === "") return entity;
  const tid = String(id);
  const raw = (window as any).entities;
  if (!raw) return entity;
  if (!Array.isArray(raw)) {
    const byKey = raw[tid] || raw[id];
    if (byKey && byKey.slots) return byKey;
  }
  const list: any[] = Array.isArray(raw)
    ? raw
    : Object.values(raw as Record<string, any>);
  for (let i = 0; i < list.length; i++) {
    const ent = list[i];
    if (ent && String(ent.id) === tid && ent.slots) return ent;
  }
  return entity;
}

function setDialogOnlyXTarget(entity: any): void {
  window.xtarget = entity || null;
  (window as any).__ecuDialogOnlyXTarget = !!entity;
}

function setSelectionXTarget(entity: any): void {
  window.xtarget = entity || null;
  (window as any).__ecuDialogOnlyXTarget = false;
}

export function isBuffDialogOpen(): boolean {
  return hasContent(dialogEl("buff"));
}

export function isItemDialogOpen(): boolean {
  return hasContent(dialogEl("item"));
}

export function isTopLeftDialogOpen(): boolean {
  return isBuffDialogOpen() || isItemDialogOpen();
}

export function closeBuffDialog(): boolean {
  lastConditionId = "";
  return clearInfoHost("buff");
}

export function closeItemDialog(): boolean {
  lastSlotName = "";
  return clearInfoHost("item");
}

export function closeInfo(kind?: InfoDialogKind): boolean {
  if (kind === "buff") return closeBuffDialog();
  if (kind === "item") return closeItemDialog();
  if (closeBuffDialog()) return true;
  return closeItemDialog();
}

/** Close one open info dialog (buff first). */
export function closeTopLeftDialog(): boolean {
  return closeInfo();
}

export function closeAllInfoDialogs(): boolean {
  const a = closeBuffDialog();
  const b = closeItemDialog();
  return a || b;
}

bindCloseImpl((kind) => closeInfo(kind));

/**
 * Show gear/item details in `#ecu-item-dialog`.
 * Always `render_item("html")` → innerHTML (never selector / modal_count path).
 */
export function openItem(
  entity: any,
  slotName: string,
  slotOverride?: any,
): void {
  if (!entity || !slotName) return;
  installInfoDialogLifecycle();

  const target = resolvePaperdollEntity(entity);
  const slot =
    slotOverride && slotOverride.name
      ? slotOverride
      : target && target.slots && target.slots[slotName];
  if (!slot || !slot.name) return;

  const w = window as any;
  const itemHost = ensureAdoptedHost("item");

  if (
    lastSlotName === slotName &&
    String(itemHost.innerHTML || "").trim()
  ) {
    closeItemDialog();
    w.last_sclick = "";
    return;
  }

  const G = w.G;
  const def = G && G.items && G.items[slot.name];
  if (!def) return;

  setPendingWriteKind("item");
  lastSlotName = slotName;
  w.last_sclick = slotName;
  w.dialogs_target = target;
  setSelectionXTarget(target);

  const html = buildItemHtml({
    id: "item" + slotName,
    item: def,
    name: slot.name,
    actual: slot,
    slot: slotName,
    from_player: target.id,
  });
  writeInfoHtml("item", html);
}

/** @deprecated use openItem */
export function openItemSlotInfo(
  entity: any,
  slotName: string,
  slotOverride?: any,
): void {
  openItem(entity, slotName, slotOverride);
}

/**
 * Show buff/condition details in `#ecu-buff-dialog`.
 * Sets dialog-only xtarget so paperdoll selection does not sync.
 */
export function openCondition(entity: any, conditionName: string): void {
  if (!entity || !conditionName) return;
  installInfoDialogLifecycle();

  const host = ensureAdoptedHost("buff");
  if (lastConditionId === conditionName && hasContent(host)) {
    closeBuffDialog();
    return;
  }

  const w = window as any;
  setPendingWriteKind("buff");
  lastConditionId = conditionName;
  w.dialogs_target = entity;
  setDialogOnlyXTarget(entity);

  const html = buildConditionHtml(conditionName);
  writeInfoHtml("buff", html);
}

/** Alias for openCondition. */
export function openBuff(entity: any, conditionName: string): void {
  openCondition(entity, conditionName);
}

bindOpenHandlers(openItem, openCondition);

export function adoptInfoDialog(
  kind: InfoDialogKind,
  slot: HTMLElement,
): HTMLElement {
  installInfoDialogLifecycle();
  return adoptHost(kind, slot);
}

export function adoptTopLeftDialog(slot: HTMLElement): HTMLElement {
  return adoptInfoDialog("buff", slot);
}

export function ensureDialogHost(): void {
  ensureDialogElements();
  installInfoDialogLifecycle();
  installRenderPatches();
  installDialogDismiss();
}

/** Public controller surface (preferred). */
export const info = {
  openItem,
  openBuff: openCondition,
  openCondition,
  close: closeInfo,
  closeAll: closeAllInfoDialogs,
  isOpen: (kind?: InfoDialogKind) => {
    if (kind === "buff") return isBuffDialogOpen();
    if (kind === "item") return isItemDialogOpen();
    return isTopLeftDialogOpen();
  },
  adopt: adoptInfoDialog,
  ensure: ensureDialogHost,
  subscribe: subscribeInfoDialogChange,
  setLayoutEditing: setInfoDialogLayoutEditing,
  sourceAttr: INFO_SOURCE_ATTR,
};

export {
  setInfoDialogLayoutEditing,
  subscribeInfoDialogChange,
  INFO_SOURCE_ATTR,
};

export type { InfoDialogKind };
export { BUFF_DIALOG_ID, ITEM_DIALOG_ID } from "./types";
