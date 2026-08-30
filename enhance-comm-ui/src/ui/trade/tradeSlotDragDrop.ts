import type { SlotLike } from "../../host/globals";
import { unequipCommand } from "../../host/gearCommands";

/** Delist a trade slot (drag trade listing → bag). */
export function handleBagDropOnTradeSlotDelist(
  tradeSlot: string,
  slotListing?: SlotLike | null,
): boolean {
  unequipCommand(tradeSlot, { slotListing });
  return true;
}

