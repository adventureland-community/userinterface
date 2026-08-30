/**
 * Vendor / nearby-map pricing for trade list dialogs.
 */

import { getEntitiesList, getG, getObserving } from "../host/al";
import type { EntityLike, SlotLike } from "../host/globals";
import { formatTradeGold, isGiveawayListing, isInTradeRange } from "./tradeHelpers";

export type NearbySellListing = {
  price: number;
  seller: string;
  level?: number;
};

type ItemDefLike = {
  g?: number;
  cash?: boolean;
};

function calculateItemValue(
  itemName: string,
  level?: number | null,
): number | null {
  const calc = (
    window as Window & {
      calculate_item_value?: (item: {
        name: string;
        level?: number;
      }) => number;
    }
  ).calculate_item_value;
  if (typeof calc !== "function") return null;
  const probe: { name: string; level?: number } = { name: itemName };
  if (level != null && level > 0) probe.level = level;
  const v = Number(calc(probe));
  if (!Number.isFinite(v) || v <= 0) return null;
  return v | 0;
}

/**
 * NPC vendor gold price — `G.items[name].g`, with leveled items using
 * stock `calculate_item_value` when available (upgrade/compound items).
 */
export function vendorGoldPrice(
  itemName: string,
  level?: number | null,
): number | null {
  const name = String(itemName || "").trim();
  if (!name) return null;
  const G = getG();
  const def = (G && G.items && G.items[name]) as ItemDefLike | undefined;
  if (!def) return null;

  const baseG = Number(def.g);
  if (level != null && level > 0) {
    const computed = calculateItemValue(name, level);
    if (computed != null && computed > 0) return computed;
  }
  if (Number.isFinite(baseG) && baseG > 0) return baseG | 0;
  return null;
}

/**
 * Trade sales tax by level — mirrors `calculate_common_stats` in server.js.
 * Seller receives `round(listPrice * (1 - tax))`.
 */
export function tradeTaxRateFromLevel(level: number | null | undefined): number {
  const lv = Number(level);
  if (!Number.isFinite(lv)) return 0.05;
  if (lv > 80) return 0.01;
  if (lv > 70) return 0.02;
  if (lv > 60) return 0.025;
  if (lv > 50) return 0.03;
  if (lv > 20) return 0.04;
  return 0.05;
}

export function resolveTradeTaxRate(entity?: EntityLike | null): number {
  const obs = entity ?? getObserving() ?? (window.observing as EntityLike | null);
  if (obs && typeof obs.tax === "number" && obs.tax >= 0 && obs.tax < 1) {
    return obs.tax;
  }
  return tradeTaxRateFromLevel(obs?.level);
}

/** Gold received after trade sales tax (matches server `round(price * (1 - tax))`). */
export function tradeSaleNetGold(
  listPrice: number,
  taxRate?: number,
): number {
  const price = Number(listPrice) | 0;
  if (!(price > 0)) return 0;
  const tax = taxRate != null ? taxRate : resolveTradeTaxRate();
  return Math.round(price * (1 - tax));
}

/**
 * Minimum list price so net gold is at least `netGold` after sales tax.
 */
export function minListPriceForNetGold(
  netGold: number,
  taxRate?: number,
): number {
  const want = Number(netGold) | 0;
  if (!(want > 0)) return 1;
  const tax = taxRate != null ? taxRate : resolveTradeTaxRate();
  if (!(tax > 0)) return want;
  let price = Math.ceil(want / (1 - tax));
  while (price > 1 && tradeSaleNetGold(price - 1, tax) >= want) price -= 1;
  while (price > 0 && tradeSaleNetGold(price, tax) < want) price += 1;
  return price;
}

/**
 * Minimum trade list price to match NPC vendor gold after sales tax.
 */
export function vendorListFloorPrice(
  itemName: string,
  options?: { level?: number | null; observer?: EntityLike | null },
): number | null {
  const vendor = vendorGoldPrice(itemName, options?.level);
  if (vendor == null || !(vendor > 0)) return null;
  const tax = resolveTradeTaxRate(options?.observer);
  return minListPriceForNetGold(vendor, tax);
}

/** Sell listings on nearby players (trade range) for the same item name. */
export function nearbyMapSellPricesForItem(
  itemName: string,
  observer?: EntityLike | null,
  options?: { level?: number | null; max?: number },
): NearbySellListing[] {
  const name = String(itemName || "").trim();
  if (!name) return [];
  const obs = observer ?? (window.observing as EntityLike | null | undefined);
  if (!obs) return [];

  const obsId = obs.id != null ? String(obs.id) : "";
  const wantLevel = options?.level;
  const max = options?.max != null ? Math.max(1, options.max | 0) : 12;
  const seen = new Set<number>();
  const out: NearbySellListing[] = [];

  const entities = getEntitiesList();
  for (let ei = 0; ei < entities.length; ei++) {
    const ent = entities[ei];
    if (!ent || !ent.slots) continue;
    if (obsId && ent.id != null && String(ent.id) === obsId) continue;
    if (!isInTradeRange(ent, obs)) continue;

    const seller =
      ent.name != null ? String(ent.name) : String(ent.id ?? "player");
    const keys = Object.keys(ent.slots);
    for (let si = 0; si < keys.length; si++) {
      const k = keys[si];
      if (k.indexOf("trade") !== 0) continue;
      const listing = ent.slots[k];
      if (!listing || !listing.name || listing.name !== name) continue;
      if (listing.b) continue;
      if (isGiveawayListing(listing)) continue;
      if (
        wantLevel != null &&
        listing.level != null &&
        listing.level !== wantLevel
      ) {
        continue;
      }
      const price = Number(listing.price) | 0;
      if (!(price > 0) || seen.has(price)) continue;
      seen.add(price);
      out.push({
        price,
        seller,
        level: listing.level,
      });
    }
  }

  out.sort((a, b) => a.price - b.price);
  return out.slice(0, max);
}

export function formatNearbySellLine(listing: NearbySellListing): string {
  const price = formatTradeGold(listing.price);
  const who =
    listing.seller.length > 10
      ? listing.seller.slice(0, 9) + "…"
      : listing.seller;
  return `${who} · ${price}g`;
}
