/**
 * Trade slot click / action handlers (own, foreign, empty).
 */

import { info } from "../../host/dialogHost";
import { setXTarget } from "../../host/icons";
import { unequipCommand } from "../../host/gearCommands";
import type { EntityLike, SlotLike } from "../../host/globals";
import { isObservedSelf } from "../../host/gearObserved";
import {
  joinGiveawayCommand,
  promptTradePrice,
  promptTradeQuantity,
  promptWishlistLevel,
  tradeFulfillCommand,
  tradePurchaseCommand,
  wishlistCommand,
} from "../../host/tradeCommands";
import {
  canAffordListing,
  confirmTradeFulfill,
  confirmTradePurchase,
  findBagMatchForBuyOrder,
  formatTradeGold,
  isInTradeRange,
  isGiveawayListing,
  isJoinedGiveaway,
} from "../../lib/tradeHelpers";
import { rememberTradePrice } from "../../lib/tradePriceMemory";
import { showTradeWishlistPicker } from "../gear/tradeWishlistPicker";

export function openTradeItemInfo(
  entity: EntityLike,
  slotName: string,
  slot: SlotLike | null | undefined,
): void {
  if (!slot || !slot.name) return;
  setXTarget(entity);
  info.openItem(entity, slotName, slot);
}

/** Left-click on a trade slot (shift = item info only). */
export function handleTradeSlotClick(
  ev: MouseEvent | PointerEvent,
  entity: EntityLike,
  slotName: string,
  slot: SlotLike | null | undefined,
  gearEditable: boolean,
  observing: EntityLike | null | undefined,
): void {
  if (ev.shiftKey) {
    if (slot && slot.name) openTradeItemInfo(entity, slotName, slot);
    return;
  }

  if (gearEditable) {
    if (slot && slot.name) {
      openTradeItemInfo(entity, slotName, slot);
    } else {
      showTradeWishlistPicker(slotName, ev.clientX, ev.clientY);
    }
    return;
  }

  if (!slot || !slot.name || !slot.rid || slot.price == null) return;
  if (!observing || isObservedSelf(entity)) return;
  if (!isInTradeRange(entity, observing)) {
    window.alert("Too far away — move your watched character closer.");
    return;
  }

  const targetId = entity.id != null ? String(entity.id) : "";
  const rid = String(slot.rid);
  const maxQ = slot.q != null && slot.q > 0 ? slot.q : undefined;

  if (slot.b) {
    const match = findBagMatchForBuyOrder(slot, observing.items);
    if (!match) {
      window.alert(`No matching ${slot.name} in bag.`);
      return;
    }
    const cap = maxQ != null ? Math.min(maxQ, match.q) : match.q;
    const q = promptTradeQuantity(cap, slot.name);
    if (q == null) return;
    if (!confirmTradeFulfill(slot.name, slot.price, q)) return;
    tradeFulfillCommand(targetId, slotName, rid, q);
    return;
  }

  if (isGiveawayListing(slot)) {
    if (isJoinedGiveaway(slot, observing)) {
      window.alert("Already joined this giveaway.");
      return;
    }
    joinGiveawayCommand(targetId, slotName, rid);
    return;
  }

  const obsGold = observing.gold;
  const q = promptTradeQuantity(maxQ, slot.name);
  if (q == null) return;
  if (obsGold != null && !canAffordListing(slot, q, obsGold)) {
    window.alert(
      `Not enough gold — need ${formatTradeGold(slot.price * q)}, have ${formatTradeGold(obsGold)}.`,
    );
    return;
  }
  if (!confirmTradePurchase(slot.name, slot.price, q)) return;
  tradePurchaseCommand(targetId, slotName, rid, q);
}

export function handleTradeSlotDelist(
  slotName: string,
  slot?: SlotLike | null,
): void {
  unequipCommand(slotName, { slotListing: slot });
}

export { rememberTradePrice, promptTradePrice, wishlistCommand, promptWishlistLevel };
