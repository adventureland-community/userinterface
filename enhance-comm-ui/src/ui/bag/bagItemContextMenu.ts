import {
  fingerprintFromSlot,
  type ItemFingerprint,
  type MailItem,
} from "../../host/mail";
import {
  maxSplitQuantity,
  splitBagCommand,
  tryQuickSplitFromModifiers,
} from "../../host/bagSplitCommands";
import { showBagSplitDialog } from "./bagSplitDialog";
import { canEditObservedBag } from "../../host/gearObserved";
import { isCommTouchUi } from "../../lib/commTouchUi";
import type { ActionMenuAction } from "../chrome/actionMenuTypes";
import { installLongPress } from "../chrome/pointerLongPress";
import { showActionsMenu } from "../chrome/showActionsMenu";

/** @deprecated Prefer ActionMenuAction — kept as bag alias. */
export type BagMenuAction = ActionMenuAction;

export type BagMenuContext = {
  fp: ItemFingerprint;
  slotEl: HTMLElement | null;
  item: MailItem;
};

export type BagMenuProvider = (ctx: BagMenuContext) => BagMenuAction[];

const providers: BagMenuProvider[] = [];

/** Register bag-slot context menu actions (mail, send item, etc.). */
export function registerBagMenuProvider(provider: BagMenuProvider): () => void {
  providers.push(provider);
  return () => {
    const idx = providers.indexOf(provider);
    if (idx >= 0) providers.splice(idx, 1);
  };
}

function buildBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  const actions: BagMenuAction[] = [];
  for (let i = 0; i < providers.length; i++) {
    const rows = providers[i](ctx);
    for (let j = 0; j < rows.length; j++) actions.push(rows[j]);
  }
  return actions;
}

/**
 * Observed bag inventory lives on `window.observing.items` (the /comm snap).
 * Do not use getObserving() — that prefers the live entity, which has no items.
 */
export function observingBagItem(slot: number): MailItem | null {
  const obs = window.observing;
  if (!obs || !Array.isArray(obs.items)) return null;
  const item = obs.items[slot] as MailItem | undefined;
  if (!item || !item.name || item.name === "placeholder") return null;
  return item;
}

export function showBagItemContextMenu(
  clientX: number,
  clientY: number,
  fp: ItemFingerprint,
  slotEl?: HTMLElement | null,
  item?: MailItem | null,
): void {
  const resolvedItem = item || observingBagItem(fp.slot);
  if (!resolvedItem) return;

  const ctx: BagMenuContext = {
    fp,
    slotEl: slotEl || null,
    item: resolvedItem,
  };
  const actions = buildBagMenuActions(ctx);
  if (!actions.length) return;

  showActionsMenu({
    clientX,
    clientY,
    actions,
    title: resolvedItem.name ? String(resolvedItem.name) : "Bag",
  });
}

export function resolveInventorySlotNum(
  start: HTMLElement,
  host: HTMLElement,
): number | null {
  let node: HTMLElement | null = start;
  while (node && host.contains(node)) {
    const cnum = node.getAttribute && node.getAttribute("data-cnum");
    if (cnum != null && cnum !== "") {
      const n = parseInt(cnum, 10);
      if (Number.isFinite(n)) return n;
    }
    const id = node.id || "";
    const idMatch = /^citem(\d+)$/.exec(id);
    if (idMatch) return parseInt(idMatch[1], 10);
    const oc = node.getAttribute && node.getAttribute("onclick");
    if (oc) {
      const m = /inventory_click\((\d+)/.exec(oc);
      if (m) return parseInt(m[1], 10);
    }
    const om = node.getAttribute && node.getAttribute("onmousedown");
    if (om) {
      const m = /inventory_click\((\d+)/.exec(om);
      if (m) return parseInt(m[1], 10);
    }
    node = node.parentElement;
  }
  return null;
}

function openBagMenuFromTarget(
  host: HTMLElement,
  t: HTMLElement,
  clientX: number,
  clientY: number,
): boolean {
  const num = resolveInventorySlotNum(t, host);
  if (num == null || !Number.isFinite(num)) return false;
  const item = observingBagItem(num);
  const fp = fingerprintFromSlot(num, item);
  if (!fp) return false;
  showBagItemContextMenu(clientX, clientY, fp, t, item);
  return true;
}

/**
 * Plain right-click a bag slot → Comm context menu (extensible via providers).
 * On touch: long-press opens the same menu as a bottom sheet.
 * Shift+right-click is left alone for any stock handler.
 * Middle-click splits stacks — modifiers pick a preset; plain middle opens custom.
 */
export function installBagItemContextMenu(host: HTMLElement): () => void {
  const onCtx = (ev: MouseEvent) => {
    if (ev.shiftKey) return;

    const t = ev.target as HTMLElement | null;
    if (!t || !host.contains(t)) return;
    if (!openBagMenuFromTarget(host, t, ev.clientX, ev.clientY)) return;

    ev.preventDefault();
    ev.stopPropagation();
  };
  const onMiddle = (ev: MouseEvent) => {
    if (ev.button !== 1) return;
    if (!canEditObservedBag()) return;
    const t = ev.target as HTMLElement | null;
    if (!t || !host.contains(t)) return;
    const num = resolveInventorySlotNum(t, host);
    if (num == null || !Number.isFinite(num)) return;
    const item = observingBagItem(num);
    const fp = fingerprintFromSlot(num, item);
    if (!fp || maxSplitQuantity(fp) <= 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (tryQuickSplitFromModifiers(fp, ev)) return;
    void showBagSplitDialog(fp).then((q) => {
      if (q == null) return;
      splitBagCommand(fp, q);
    });
  };
  host.addEventListener("contextmenu", onCtx, true);
  host.addEventListener("mousedown", onMiddle, true);

  let unLong: (() => void) | null = null;
  if (isCommTouchUi()) {
    unLong = installLongPress(host, {
      onLongPress: (ev) => {
        const t = ev.target as HTMLElement | null;
        if (!t || !host.contains(t)) return;
        if (openBagMenuFromTarget(host, t, ev.clientX, ev.clientY)) {
          ev.preventDefault();
          ev.stopPropagation();
        }
      },
    });
  }

  return () => {
    host.removeEventListener("contextmenu", onCtx, true);
    host.removeEventListener("mousedown", onMiddle, true);
    if (unLong) unLong();
  };
}
