/**
 * Buy-desk browse filters / sort for Market listings.
 */

import type { MarketListingRow } from "./marketTypes";
import { listingMatchesMarketQuery } from "./marketQuery";

export type MarketBrowseFilters = {
  query: string;
  /** sale = for-sale; buy = buy orders; all = both */
  side: "sale" | "buy" | "all";
  canAfford: boolean;
  inMyBag: boolean;
  /** Live entities only (visible / in range of the client), not catalog same-map. */
  nearOnly: boolean;
  gold: number;
  /** Item names present in observing bag (lowercase). */
  bagNames: Record<string, boolean>;
  /** Merchant names to boost (friends/party), lowercase. */
  friendNames: Record<string, boolean>;
  merchantName?: string | null;
  formatServer?: (server?: string | null) => string;
};

export type MarketItemGroup = {
  key: string;
  name: string;
  level?: number;
  p?: string | null;
  rows: import("./marketTypes").MarketListingRow[];
  sales: import("./marketTypes").MarketListingRow[];
  wants: import("./marketTypes").MarketListingRow[];
  bestSale: number | null;
  bestWant: number | null;
};

export function filterMarketListings(
  rows: MarketListingRow[],
  filters: MarketBrowseFilters,
): MarketListingRow[] {
  const out: MarketListingRow[] = [];
  const merchantFilter = filters.merchantName
    ? String(filters.merchantName).toLowerCase()
    : "";
  const qCtx = {
    gold: filters.gold,
    bagNames: filters.bagNames,
    formatServer: filters.formatServer,
  };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (merchantFilter && row.merchant.toLowerCase() !== merchantFilter) {
      continue;
    }
    if (filters.side === "sale" && row.buyOrder) continue;
    if (filters.side === "buy" && !row.buyOrder) continue;
    if (!listingMatchesMarketQuery(row, filters.query, qCtx)) continue;
    if (filters.nearOnly) {
      if (!row.fromLive && row.merchantStatus !== "you") continue;
    }
    if (filters.canAfford && !row.buyOrder) {
      if (!(filters.gold >= row.price)) continue;
    }
    if (filters.inMyBag) {
      if (!filters.bagNames[row.name.toLowerCase()]) continue;
    }
    out.push(row);
  }
  return out;
}

/** Group listings by item identity (name + level + title). */
export function groupMarketListings(
  rows: MarketListingRow[],
): MarketItemGroup[] {
  const byKey: Record<string, MarketListingRow[]> = Object.create(null);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key =
      row.name +
      "\0" +
      (row.level != null ? String(row.level) : "") +
      "\0" +
      (row.p != null ? String(row.p) : "");
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(row);
  }
  const keys = Object.keys(byKey);
  const out: MarketItemGroup[] = [];
  for (let i = 0; i < keys.length; i++) {
    const list = byKey[keys[i]];
    const sample = list[0];
    const sales: MarketListingRow[] = [];
    const wants: MarketListingRow[] = [];
    for (let j = 0; j < list.length; j++) {
      if (list[j].buyOrder) wants.push(list[j]);
      else sales.push(list[j]);
    }
    let bestSale: number | null = null;
    let bestWant: number | null = null;
    for (let j = 0; j < sales.length; j++) {
      if (bestSale == null || sales[j].price < bestSale) bestSale = sales[j].price;
    }
    for (let j = 0; j < wants.length; j++) {
      if (bestWant == null || wants[j].price > bestWant) bestWant = wants[j].price;
    }
    out.push({
      key: keys[i],
      name: sample.name,
      level: sample.level,
      p: sample.p,
      rows: list,
      sales,
      wants,
      bestSale,
      bestWant,
    });
  }
  out.sort((a, b) => {
    const da = a.sales.length && a.wants.length ? 0 : 1;
    const db = b.sales.length && b.wants.length ? 0 : 1;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });
  return out;
}

/** Group by item name; sort groups by best (lowest) sell price first. */
export function sortMarketListings(
  rows: MarketListingRow[],
  friendNames: Record<string, boolean>,
): MarketListingRow[] {
  const copy = rows.slice();
  copy.sort((a, b) => {
    const fa = friendNames[a.merchant.toLowerCase()] ? 0 : 1;
    const fb = friendNames[b.merchant.toLowerCase()] ? 0 : 1;
    if (fa !== fb) return fa - fb;
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    if (a.buyOrder !== b.buyOrder) return a.buyOrder ? 1 : -1;
    // sales: cheapest first; buy orders: highest first
    if (!a.buyOrder && !b.buyOrder) return a.price - b.price;
    if (a.buyOrder && b.buyOrder) return b.price - a.price;
    return a.price - b.price;
  });
  return copy;
}
