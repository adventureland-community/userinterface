/**
 * Bag → paperdoll equip / trade list via HTML5 drop (o:command — not stock on_drop).
 */

import { equipCommand } from "../../host/gearCommands";
import { canEditObservedBag } from "../../host/gearObserved";
import {
  giveawayCommand,
  tradeListCommand,
} from "../../host/tradeCommands";
import { fingerprintFromSlot } from "../../host/mail";
import { canEquipItemToSlot } from "../../lib/gearSlots";
import { isTradeSlot, tradeSlotIsEmpty } from "../../lib/tradeSlots";
import {
  hasBagDragPayload,
  readBagDragPayload,
} from "../bag/bagDragPayload";
import { observingBagItem } from "../bag/bagItemContextMenu";
import {
  showGiveawayMinutesDialog,
  showTradePriceDialog,
  showTradeQuantityDialog,
} from "../trade/tradePromptDialog";

/** True when a bag item drag can equip into this gear slot (drop-time check). */
export function bagDragCanEquipToGearSlot(
  ev: DragEvent,
  gearSlot: string,
): boolean {
  if (isTradeSlot(gearSlot)) return false;
  if (!canEditObservedBag()) return false;
  if (!hasBagDragPayload(ev)) return false;
  const invSlot = readBagDragPayload(ev);
  if (invSlot == null) return false;
  const item = observingBagItem(invSlot);
  if (!item) return false;
  return canEquipItemToSlot(item.name, gearSlot);
}

/** True when a bag item can be listed on an empty trade slot. */
export function bagDragCanListOnTradeSlot(
  ev: DragEvent,
  tradeSlot: string,
  slots: Record<string, unknown> | null | undefined,
): boolean {
  if (!canEditObservedBag()) return false;
  if (!isTradeSlot(tradeSlot)) return false;
  if (!tradeSlotIsEmpty(slots as any, tradeSlot)) return false;
  if (!hasBagDragPayload(ev)) return false;
  const invSlot = readBagDragPayload(ev);
  if (invSlot == null) return false;
  return !!observingBagItem(invSlot);
}

async function completeBagDropOnTradeSlot(
  tradeSlot: string,
  fp: ReturnType<typeof fingerprintFromSlot>,
  shiftKey: boolean,
  slots: Record<string, unknown> | null | undefined,
): Promise<void> {
  if (!fp) return;

  const maxQ = fp.q != null && fp.q > 0 ? fp.q | 0 : 1;
  let q = maxQ;
  if (maxQ > 1) {
    const picked = await showTradeQuantityDialog({
      itemName: fp.name,
      maxQ,
    });
    if (picked == null) return;
    q = picked;
  }

  if (shiftKey) {
    const mins = await showGiveawayMinutesDialog();
    if (mins == null) return;
    giveawayCommand(tradeSlot, fp, mins, q);
    return;
  }

  const price = await showTradePriceDialog({
    mode: "list",
    itemName: fp.name,
    level: fp.level,
    p: fp.p,
    slots: slots as any,
  });
  if (price == null) return;
  tradeListCommand(fp, tradeSlot, price, q);
}

/** Handle bag → gear drop. Returns true when equip was dispatched. */
export function handleBagDropOnGearSlot(
  ev: DragEvent,
  gearSlot: string,
): boolean {
  if (!canEditObservedBag()) return false;
  if (isTradeSlot(gearSlot)) return false;
  const invSlot = readBagDragPayload(ev);
  if (invSlot == null) return false;
  const item = observingBagItem(invSlot);
  const fp = fingerprintFromSlot(invSlot, item);
  if (!fp || !canEquipItemToSlot(fp.name, gearSlot)) return false;
  ev.preventDefault();
  ev.stopPropagation();
  equipCommand(fp, gearSlot);
  return true;
}

/** Handle bag → empty trade slot drop. Returns true when list/giveaway dispatched. */
export function handleBagDropOnTradeSlot(
  ev: DragEvent,
  tradeSlot: string,
  slots: Record<string, unknown> | null | undefined,
): boolean {
  if (!canEditObservedBag()) return false;
  if (!isTradeSlot(tradeSlot)) return false;
  if (!tradeSlotIsEmpty(slots as any, tradeSlot)) return false;
  const invSlot = readBagDragPayload(ev);
  if (invSlot == null) return false;
  const item = observingBagItem(invSlot);
  const fp = fingerprintFromSlot(invSlot, item);
  if (!fp) return false;
  ev.preventDefault();
  ev.stopPropagation();

  void completeBagDropOnTradeSlot(tradeSlot, fp, ev.shiftKey, slots);
  return true;
}

/** During dragover — allow drop when payload is present (slot fit checked on drop). */
export function handleBagDragOverGearSlot(
  ev: DragEvent,
  gearSlot: string,
  slots?: Record<string, unknown> | null,
): boolean {
  if (isTradeSlot(gearSlot)) {
    if (!bagDragCanListOnTradeSlot(ev, gearSlot, slots)) return false;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    return true;
  }
  if (!bagDragCanEquipToGearSlot(ev, gearSlot)) return false;
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
  return true;
}
