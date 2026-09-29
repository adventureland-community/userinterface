/**
 * Market browse actions — buy / fulfill / travel / mirror / undercut /
 * list·giveaway from bag / own reprice·delist.
 */

import type { EntityLike, SlotLike } from "../globals";
import { unequipCommand } from "../gearCommands";
import {
  tradeFulfillCommand,
  tradeListCommand,
  tradePurchaseCommand,
  tradeSwapCommand,
  joinGiveawayCommand,
  giveawayCommand,
  tradeRepriceCommand,
} from "../tradeCommands";
import {
  canAffordListing,
  confirmTradeFulfill,
  confirmTradePurchase,
  findBagMatchForBuyOrder,
  findBagMatchForTradeWant,
  formatTradeGold,
  formatTradeWantLabel,
} from "../../lib/tradeHelpers";
import type { MarketListingRow } from "../../lib/market/marketTypes";
import type { MarketBagStack } from "../../lib/market/marketBagStacks";
import {
  showGiveawayDialog,
  showTradePriceDialog,
  showTradeQuantityDialog,
} from "../../ui/trade/tradePromptDialog";
import { showTradeOfferWantPicker } from "../../ui/gear/tradeWishlistPicker";
import {
  observingTradeSlotNames,
  tradeSlotIsEmpty,
} from "../../lib/tradeSlots";
import { canRepriceTradeSlot } from "../../lib/standTradeSlotMemory";
import { startMarketTravel } from "./marketTravel";
import type { ItemFingerprint } from "../mail/types";
function findLiveMerchant(
  entities: EntityLike[],
  name: string,
): EntityLike | null {
  const want = String(name || "").toLowerCase();
  if (!want) return null;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e && e.name && String(e.name).toLowerCase() === want) return e;
  }
  return null;
}

function listingNeedsStaleConfirm(row: MarketListingRow): boolean {
  if (row.catalogOnly) return true;
  const n = parseInt(String(row.slot).replace("trade", ""), 10);
  return Number.isFinite(n) && n >= 5 && !row.standOpen;
}

export function canActOnListing(row: MarketListingRow): boolean {
  // Never buy/sell your own stand from Market — only in-range foreign merchants.
  return row.merchantStatus === "inRange";
}

export function isOwnMarketListing(row: MarketListingRow): boolean {
  return row.merchantStatus === "you";
}

export function travelToListing(row: MarketListingRow): boolean {
  if (row.map == null || row.x == null || row.y == null) {
    window.alert("No map position for this merchant — cannot travel.");
    return false;
  }
  return startMarketTravel({
    name: row.merchant,
    map: String(row.map),
    x: row.x,
    y: row.y,
    server: row.server,
  });
}

/**
 * Buy a for-sale listing or fulfill a buy order when in range.
 * Catalog / closed-stand trade5+ require an extra stale-listing confirm.
 */
export async function actOnMarketListing(opts: {
  row: MarketListingRow;
  entities: EntityLike[];
  observing: EntityLike | null | undefined;
  /** Shift = take max quantity when possible. */
  takeAll?: boolean;
}): Promise<boolean> {
  const { row, entities, observing } = opts;
  if (!observing) {
    window.alert("Observe a character first.");
    return false;
  }
  if (row.merchantStatus === "you") {
    window.alert("That's your own listing.");
    return false;
  }
  if (!canActOnListing(row)) {
    if (
      row.merchantStatus === "otherMap" ||
      row.merchantStatus === "otherServer" ||
      row.merchantStatus === "sameMap" ||
      row.merchantStatus === "catalogOnly"
    ) {
      return travelToListing(row);
    }
    window.alert("Merchant is out of trade range.");
    return false;
  }

  const live = findLiveMerchant(entities, row.merchant);
  const targetId =
    (live && live.id != null ? String(live.id) : "") ||
    (row as { entityId?: string }).entityId ||
    "";
  if (!targetId || !row.rid) {
    window.alert("Cannot trade — missing merchant id or listing rid.");
    return false;
  }

  if (listingNeedsStaleConfirm(row)) {
    const ok = window.confirm(
      "This listing may be from the catalog or a closed stand. " +
        "It can be stale — the server will reject if it is gone. Continue?",
    );
    if (!ok) return false;
  }

  const maxQ = row.q != null && row.q > 0 ? row.q : undefined;

  if (row.giveaway) {
    return joinGiveawayCommand(targetId, row.slot, row.rid);
  }

  if (row.tradeOffer && row.want) {
    const match = findBagMatchForTradeWant(row.want, observing.items);
    if (!match) {
      const need = formatTradeWantLabel(row.want) || row.want.name;
      window.alert(`No matching ${need} in bag for this trade offer.`);
      return false;
    }
    const need = formatTradeWantLabel(row.want) || row.want.name;
    const ok = window.confirm(
      `Trade ${formatTradeWantLabel({ name: match.item.name || row.want.name, level: match.item.level, p: match.item.p, q: row.want.q || 1 }) || match.item.name} for ${row.name}? They want: ${need}.`,
    );
    if (!ok) return false;
    return tradeSwapCommand(
      targetId,
      row.slot,
      row.rid,
      match.slot,
      match.item,
    );
  }

  if (row.buyOrder) {
    const match = findBagMatchForBuyOrder(
      {
        name: row.name,
        price: row.price,
        b: true,
        rid: row.rid,
        level: row.level,
        q: row.q,
        p: row.p,
        stat_type: row.stat_type,
      },
      observing.items,
    );
    if (!match) {
      window.alert(`No matching ${row.name} in bag.`);
      return false;
    }
    const cap = maxQ != null ? Math.min(maxQ, match.q) : match.q;
    let q = cap;
    if (!opts.takeAll) {
      const picked = await showTradeQuantityDialog({
        itemName: row.name,
        maxQ: cap,
      });
      if (picked == null) return false;
      q = picked;
    }
    if (!confirmTradeFulfill(row.name, row.price, q)) return false;
    return tradeFulfillCommand(targetId, row.slot, row.rid, q);
  }

  const cap = maxQ != null ? maxQ : 9999;
  let q = opts.takeAll ? cap : 1;
  if (!opts.takeAll) {
    const picked = await showTradeQuantityDialog({
      itemName: row.name,
      maxQ: cap,
    });
    if (picked == null) return false;
    q = picked;
  }
  if (observing.gold != null && !canAffordListing({ price: row.price }, q, observing.gold)) {
    window.alert(
      `Not enough gold — need ${formatTradeGold(row.price * q)}, have ${formatTradeGold(observing.gold)}.`,
    );
    return false;
  }
  if (!confirmTradePurchase(row.name, row.price, q)) return false;
  return tradePurchaseCommand(targetId, row.slot, row.rid, q);
}

function firstEmptyTradeSlot(
  observing: EntityLike | null | undefined,
): string | null {
  const names = observingTradeSlotNames();
  const slots = observing && observing.slots ? observing.slots : null;
  for (let i = 0; i < names.length; i++) {
    if (tradeSlotIsEmpty(slots, names[i])) return names[i];
  }
  return null;
}

function bagFingerprintForItem(
  observing: EntityLike,
  itemName: string,
  level?: number,
): ItemFingerprint | null {
  const items = observing.items;
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || !it.name || it.name !== itemName) continue;
    if (level != null && (it.level || 0) !== level) continue;
    const fp: ItemFingerprint = { slot: i, name: it.name };
    if (it.level != null) fp.level = it.level;
    if (it.q != null) fp.q = it.q;
    if (it.p != null) fp.p = String(it.p);
    return fp;
  }
  return null;
}

/** List bag item at listing price (mirror) or price−1 (undercut). */
export async function mirrorOrUndercutListing(opts: {
  row: MarketListingRow;
  observing: EntityLike | null | undefined;
  mode: "mirror" | "undercut";
}): Promise<boolean> {
  const { row, observing, mode } = opts;
  if (!observing) {
    window.alert("Observe a character first.");
    return false;
  }
  if (row.buyOrder) {
    window.alert("Mirror/undercut applies to for-sale listings.");
    return false;
  }
  const fp = bagFingerprintForItem(observing, row.name, row.level);
  if (!fp) {
    window.alert(`No ${row.name} in bag to list.`);
    return false;
  }
  const tradeSlot = firstEmptyTradeSlot(observing);
  if (!tradeSlot) {
    window.alert("No empty trade slot.");
    return false;
  }
  const price =
    mode === "undercut" ? Math.max(1, row.price - 1) : Math.max(1, row.price);
  const maxQ = fp.q != null && fp.q > 0 ? fp.q | 0 : 1;
  let q = maxQ;
  if (maxQ > 1) {
    const picked = await showTradeQuantityDialog({
      itemName: row.name,
      maxQ,
    });
    if (picked == null) return false;
    q = picked;
  }
  const label = mode === "undercut" ? "Undercut" : "Mirror";
  if (
    !window.confirm(
      `${label} ${q}× ${row.name} at ${formatTradeGold(price)} on ${tradeSlot}?`,
    )
  ) {
    return false;
  }
  return tradeListCommand(fp, tradeSlot, price, q);
}

function fingerprintFromBagStack(stack: MarketBagStack): ItemFingerprint {
  const fp: ItemFingerprint = { slot: stack.slot, name: stack.name };
  if (stack.level != null) fp.level = stack.level;
  if (stack.q != null && stack.q > 0) fp.q = stack.q;
  if (stack.p != null && stack.p !== "") fp.p = String(stack.p);
  return fp;
}

function liveSlotForOwnListing(
  observing: EntityLike | null | undefined,
  row: MarketListingRow,
): SlotLike | null {
  if (!observing || !observing.slots) return null;
  const slot = observing.slots[row.slot] as SlotLike | undefined;
  if (!slot || !slot.name) return null;
  return slot;
}

/** List selected Market bag stack via price dialog onto first empty trade slot. */
export async function listBagStackOnTrade(opts: {
  stack: MarketBagStack;
  observing: EntityLike | null | undefined;
}): Promise<boolean> {
  const { stack, observing } = opts;
  if (!observing) {
    window.alert("Observe a character first.");
    return false;
  }
  const tradeSlot = firstEmptyTradeSlot(observing);
  if (!tradeSlot) {
    window.alert("No empty trade slot — open stand or free a slot.");
    return false;
  }
  const fp = fingerprintFromBagStack(stack);
  const maxQ = stack.q > 0 ? stack.q | 0 : 1;
  let q = maxQ;
  if (maxQ > 1) {
    const picked = await showTradeQuantityDialog({
      itemName: stack.name,
      maxQ,
    });
    if (picked == null) return false;
    q = picked;
  }
  const price = await showTradePriceDialog({
    mode: "list",
    itemName: stack.name,
    level: stack.level,
    p: stack.p,
    slots: observing.slots,
  });
  if (price == null) return false;
  return tradeListCommand(fp, tradeSlot, price, q);
}

/** Giveaway selected Market bag stack onto first empty trade slot. */
export async function giveawayBagStackOnTrade(opts: {
  stack: MarketBagStack;
  observing: EntityLike | null | undefined;
}): Promise<boolean> {
  const { stack, observing } = opts;
  if (!observing) {
    window.alert("Observe a character first.");
    return false;
  }
  const tradeSlot = firstEmptyTradeSlot(observing);
  if (!tradeSlot) {
    window.alert("No empty trade slot — open stand or free a slot.");
    return false;
  }
  const fp = fingerprintFromBagStack(stack);
  const maxQ = stack.q > 0 ? stack.q | 0 : 1;
  const picked = await showGiveawayDialog({
    itemName: stack.name,
    maxQ,
  });
  if (picked == null) return false;
  return giveawayCommand(tradeSlot, fp, picked.minutes, picked.q);
}

/** Open catalog picker to post an item-for-item trade offer from a bag stack. */
export function offerBagStackOnTrade(opts: {
  stack: MarketBagStack;
  observing: EntityLike | null | undefined;
  clientX?: number;
  clientY?: number;
}): boolean {
  const { stack, observing } = opts;
  if (!observing) {
    window.alert("Observe a character first.");
    return false;
  }
  const tradeSlot = firstEmptyTradeSlot(observing);
  if (!tradeSlot) {
    window.alert("No empty trade slot — open stand or free a slot.");
    return false;
  }
  const fp = fingerprintFromBagStack(stack);
  const maxQ = stack.q > 0 ? stack.q | 0 : 1;
  showTradeOfferWantPicker({
    tradeSlot,
    fp,
    offeredMaxQ: maxQ,
    clientX: opts.clientX != null ? opts.clientX : 80,
    clientY: opts.clientY != null ? opts.clientY : 80,
  });
  return true;
}

/** Reprice your own Market Focus listing (fingerprint-aware unequip+relist). */
export async function repriceOwnMarketListing(opts: {
  row: MarketListingRow;
  observing: EntityLike | null | undefined;
}): Promise<boolean> {
  const { row, observing } = opts;
  if (!isOwnMarketListing(row)) return false;
  if (row.giveaway) {
    window.alert("Giveaways cannot be repriced — delist and post again.");
    return false;
  }
  if (row.tradeOffer) {
    window.alert("Trade offers cannot be repriced — delist and post again.");
    return false;
  }
  const slot = liveSlotForOwnListing(observing, row);
  if (!slot || !slot.name) {
    window.alert("Listing not on this character’s stand — refresh Market.");
    return false;
  }
  const standOpen = !!(
    observing &&
    observing.stand != null &&
    observing.stand !== false &&
    observing.stand !== ""
  );
  if (
    !canRepriceTradeSlot(
      row.slot,
      slot,
      observing && observing.slots ? observing.slots : null,
      standOpen,
    )
  ) {
    window.alert("Open your stand to reprice trade5+ listings.");
    return false;
  }
  const price = await showTradePriceDialog({
    mode: "reprice",
    itemName: slot.name,
    level: slot.level,
    p: slot.p,
    slots: observing && observing.slots ? observing.slots : undefined,
    currentPrice: slot.price != null ? slot.price : row.price,
  });
  if (price == null) return false;
  return tradeRepriceCommand(row.slot, price, slot);
}

/** Delist your own Market Focus listing. */
export function delistOwnMarketListing(opts: {
  row: MarketListingRow;
  observing: EntityLike | null | undefined;
}): boolean {
  const { row, observing } = opts;
  if (!isOwnMarketListing(row)) return false;
  const slot = liveSlotForOwnListing(observing, row);
  unequipCommand(row.slot, { slotListing: slot || undefined });
  return true;
}
