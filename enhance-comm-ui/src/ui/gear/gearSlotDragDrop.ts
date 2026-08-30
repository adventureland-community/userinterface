/**
 * Bag → paperdoll equip / trade list via HTML5 drop (o:command — not stock on_drop).
 */

import { equipCommand } from "../../host/gearCommands";
import {
  giveawayCommand,
  promptGiveawayMinutes,
  promptTradePrice,
  promptTradeQuantity,
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

/** True when a bag item drag can equip into this gear slot (drop-time check). */
export function bagDragCanEquipToGearSlot(
  ev: DragEvent,
  gearSlot: string,
): boolean {
  if (isTradeSlot(gearSlot)) return false;
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
  if (!isTradeSlot(tradeSlot)) return false;
  if (!tradeSlotIsEmpty(slots as any, tradeSlot)) return false;
  if (!hasBagDragPayload(ev)) return false;
  const invSlot = readBagDragPayload(ev);
  if (invSlot == null) return false;
  return !!observingBagItem(invSlot);
}

function resolveListingQuantity(
  fp: { q?: number; name: string },
): number | null {
  const maxQ = fp.q != null && fp.q > 0 ? fp.q : undefined;
  if (maxQ != null && maxQ > 1) {
    return promptTradeQuantity(maxQ, fp.name);
  }
  return fp.q ?? 1;
}

/** Handle bag → gear drop. Returns true when equip was dispatched. */
export function handleBagDropOnGearSlot(
  ev: DragEvent,
  gearSlot: string,
): boolean {
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
  if (!isTradeSlot(tradeSlot)) return false;
  if (!tradeSlotIsEmpty(slots as any, tradeSlot)) return false;
  const invSlot = readBagDragPayload(ev);
  if (invSlot == null) return false;
  const item = observingBagItem(invSlot);
  const fp = fingerprintFromSlot(invSlot, item);
  if (!fp) return false;
  ev.preventDefault();
  ev.stopPropagation();

  const q = resolveListingQuantity(fp);
  if (q == null) return false;

  if (ev.shiftKey) {
    const mins = promptGiveawayMinutes();
    if (mins == null) return false;
    giveawayCommand(tradeSlot, fp, mins, q);
    return true;
  }

  const price = promptTradePrice(fp.name);
  if (price == null) return false;
  tradeListCommand(fp, tradeSlot, price, q);
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
