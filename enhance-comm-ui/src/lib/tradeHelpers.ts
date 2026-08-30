/**
 * Trade UI helpers — formatting, grid layout, fulfill preview, confirmations.
 */

import type { EntityLike, SlotLike } from "../host/globals";
import { formatCompactNumber } from "./format";
import { itemMatchesFingerprint } from "../host/mail/itemFingerprint";
import type { ItemFingerprint } from "../host/mail/types";

/** AL trade interaction range is roughly NPC distance (~200px). */
const TRADE_RANGE_SQ = 200 * 200;

export function formatTradeGold(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "?";
  return formatCompactNumber(n);
}

export function tradeSlotNum(slotName: string): number {
  const n = parseInt(String(slotName).replace("trade", ""), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Split ordered trade slot names into grid rows (4 columns). */
export function tradeSlotGridRows(
  slotNames: string[],
  columns = 4,
): string[][] {
  const cols = columns > 0 ? columns : 4;
  const rows: string[][] = [];
  for (let i = 0; i < slotNames.length; i += cols) {
    rows.push(slotNames.slice(i, i + cols));
  }
  return rows;
}

export function isInTradeRange(
  target: EntityLike | null | undefined,
  observer: EntityLike | null | undefined,
): boolean {
  if (!target || !observer) return false;
  if (target.id != null && observer.id != null && target.id === observer.id) {
    return true;
  }
  const tx = target.real_x ?? target.x;
  const ty = target.real_y ?? target.y;
  const ox = observer.real_x ?? observer.x;
  const oy = observer.real_y ?? observer.y;
  if (tx == null || ty == null || ox == null || oy == null) return false;
  const dx = tx - ox;
  const dy = ty - oy;
  return dx * dx + dy * dy <= TRADE_RANGE_SQ;
}

export type BagMatch = {
  slot: number;
  q: number;
};

/** Find a bag slot that can fulfill a buy order listing. */
export function findBagMatchForBuyOrder(
  listing: SlotLike,
  items: Array<SlotLike | null | undefined> | null | undefined,
): BagMatch | null {
  if (!listing.name || !items) return null;
  const wantLevel = listing.level != null ? listing.level : undefined;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || !it.name || it.name !== listing.name) continue;
    if (wantLevel != null && (it.level || 0) !== wantLevel) continue;
    const q = it.q != null && it.q > 0 ? it.q : 1;
    return { slot: i, q };
  }
  return null;
}

export function canAffordListing(
  listing: SlotLike,
  quantity: number,
  gold: number | null | undefined,
): boolean {
  if (listing.price == null || gold == null) return false;
  const q = quantity > 0 ? quantity : 1;
  return gold >= listing.price * q;
}

export function listingFingerprint(listing: SlotLike): ItemFingerprint | null {
  if (!listing.name) return null;
  const fp: ItemFingerprint = { slot: -1, name: listing.name };
  if (listing.level != null) fp.level = listing.level;
  if (listing.q != null) fp.q = listing.q;
  if (listing.p != null) fp.p = String(listing.p);
  return fp;
}

export function fingerprintMatchesListing(
  fp: ItemFingerprint,
  listing: SlotLike,
): boolean {
  if (!listing.name) return false;
  const probe: ItemFingerprint = { slot: -1, name: listing.name };
  if (listing.level != null) probe.level = listing.level;
  if (listing.p != null) probe.p = String(listing.p);
  return itemMatchesFingerprint(probe, fp);
}

export function confirmTradePurchase(
  itemName: string,
  unitPrice: number,
  quantity: number,
): boolean {
  const total = unitPrice * quantity;
  return window.confirm(
    `Buy ${quantity}× ${itemName} for ${formatTradeGold(total)} gold (${formatTradeGold(unitPrice)} each)?`,
  );
}

export function confirmTradeFulfill(
  itemName: string,
  unitPrice: number,
  quantity: number,
): boolean {
  const total = unitPrice * quantity;
  return window.confirm(
    `Sell ${quantity}× ${itemName} to fulfill buy order for ${formatTradeGold(total)} gold (${formatTradeGold(unitPrice)} each)?`,
  );
}

export function isGiveawayListing(slot: SlotLike | null | undefined): boolean {
  return !!(slot && (slot.giveaway || slot.registry));
}

export type BuyOrderMatch = {
  entityId: string;
  entityName: string;
  tradeSlot: string;
  listing: {
    name: string;
    price: number;
    rid: string;
    q?: number;
    level?: number;
    p?: string;
  };
};

/** Fingerprint key for buy-order ↔ bag item matching (ignores quantity). */
export function buyOrderItemKey(
  name: string,
  level?: number | null,
  p?: string | null,
): string {
  return `${name}|${level != null ? level : ""}|${p != null ? p : ""}`;
}

/** Cheap revision for re-stamping bag badges when nearby buy orders change. */
export function nearbyBuyOrdersRevision(
  entities: EntityLike[],
  observer: EntityLike | null | undefined,
): number {
  if (!observer) return 0;
  let n = 0;
  for (let ei = 0; ei < entities.length; ei++) {
    const ent = entities[ei];
    if (!ent || !ent.slots) continue;
    if (!isInTradeRange(ent, observer)) continue;
    const slotKeys = Object.keys(ent.slots);
    for (let si = 0; si < slotKeys.length; si++) {
      const listing = ent.slots[slotKeys[si]];
      if (listing && listing.b && listing.name && listing.price != null) n++;
    }
  }
  return n;
}

/** Index nearby buy orders by item fingerprint (best price first per key). */
export function indexNearbyBuyOrders(
  entities: EntityLike[],
  observer: EntityLike | null | undefined,
): Map<string, BuyOrderMatch[]> {
  const obsId = observer && observer.id != null ? String(observer.id) : "";
  const byKey = new Map<string, BuyOrderMatch[]>();

  for (let ei = 0; ei < entities.length; ei++) {
    const ent = entities[ei];
    if (!ent || !ent.slots) continue;
    if (obsId && ent.id != null && String(ent.id) === obsId) continue;
    if (!isInTradeRange(ent, observer)) continue;

    const entId = ent.id != null ? String(ent.id) : "";
    const entName = ent.name != null ? String(ent.name) : entId;
    if (!entId) continue;

    const slotKeys = Object.keys(ent.slots);
    for (let si = 0; si < slotKeys.length; si++) {
      const tradeSlot = slotKeys[si];
      if (tradeSlot.indexOf("trade") !== 0) continue;
      const listing = ent.slots[tradeSlot];
      if (!listing || !listing.b || !listing.name || listing.price == null) {
        continue;
      }
      if (!listing.rid) continue;

      const key = buyOrderItemKey(
        listing.name,
        listing.level,
        listing.p as string | undefined,
      );
      const match: BuyOrderMatch = {
        entityId: entId,
        entityName: entName,
        tradeSlot,
        listing: {
          name: listing.name,
          price: listing.price,
          rid: String(listing.rid),
          q: listing.q,
          level: listing.level,
          p: listing.p as string | undefined,
        },
      };
      const bucket = byKey.get(key);
      if (bucket) bucket.push(match);
      else byKey.set(key, [match]);
    }
  }

  for (const bucket of byKey.values()) {
    bucket.sort((a, b) => {
      if (b.listing.price !== a.listing.price) {
        return b.listing.price - a.listing.price;
      }
      return a.entityName.localeCompare(b.entityName);
    });
  }

  return byKey;
}

/** Scan nearby entities for buy orders matching a bag item fingerprint. */
export function scanBuyOrdersForBagItem(
  fp: ItemFingerprint,
  entities: EntityLike[],
  observer: EntityLike | null | undefined,
): BuyOrderMatch[] {
  if (!observer) return [];

  const want: ItemFingerprint = { slot: -1, name: fp.name };
  if (fp.level != null) want.level = fp.level;
  if (fp.p != null) want.p = fp.p;

  const key = buyOrderItemKey(fp.name, fp.level, fp.p);
  const indexed = indexNearbyBuyOrders(entities, observer).get(key);
  if (!indexed) return [];

  const matches: BuyOrderMatch[] = [];
  for (let i = 0; i < indexed.length; i++) {
    const m = indexed[i];
    if (itemMatchesFingerprint(m.listing as any, want)) matches.push(m);
  }
  return matches;
}

export function isJoinedGiveaway(
  slot: SlotLike | null | undefined,
  observer: EntityLike | null | undefined,
): boolean {
  if (!slot || !slot.registry || !observer) return false;
  const id = observer.id != null ? String(observer.id) : "";
  const name = observer.name != null ? String(observer.name) : "";
  if (id && Object.prototype.hasOwnProperty.call(slot.registry, id)) {
    return true;
  }
  if (name) {
    const vals = Object.values(slot.registry);
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] === name) return true;
    }
  }
  return false;
}
