/**
 * Buy-desk browse filters / sort for Market listings.
 */

import type { MarketListingRow } from "./marketTypes";
import { listingMatchesMarketQuery } from "./marketQuery";

export type MarketBrowseFilters = {
  query: string;
  /** sale = for-sale; buy = buy orders; giveaway = free joins; all = both */
  side: "sale" | "buy" | "giveaway" | "all";
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
  giveaways: import("./marketTypes").MarketListingRow[];
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
    if (filters.side === "sale" && (row.buyOrder || row.giveaway)) continue;
    if (filters.side === "buy" && !row.buyOrder) continue;
    if (filters.side === "giveaway" && !row.giveaway) continue;
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
    const giveaways: MarketListingRow[] = [];
    for (let j = 0; j < list.length; j++) {
      if (list[j].giveaway) giveaways.push(list[j]);
      else if (list[j].buyOrder) wants.push(list[j]);
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
      giveaways,
      bestSale,
      bestWant,
    });
  }
  out.sort((a, b) => {
    const da =
      marketGroupHasBothPrices(a) || a.giveaways.length ? 0 : 1;
    const db =
      marketGroupHasBothPrices(b) || b.giveaways.length ? 0 : 1;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export type MarketGroupSort =
  | "dual"
  | "arb"
  | "name"
  | "sellAsc"
  | "sellDesc"
  | "buyDesc"
  | "offers";

export const MARKET_GROUP_SORT_OPTIONS: Array<{
  id: MarketGroupSort;
  label: string;
}> = [
  { id: "dual", label: "Both sides" },
  { id: "arb", label: "Arb" },
  { id: "name", label: "Name" },
  { id: "sellAsc", label: "Sell low" },
  { id: "sellDesc", label: "Sell high" },
  { id: "buyDesc", label: "Buy high" },
  { id: "offers", label: "Most offers" },
];

/** True when cheapest sell is below best buy (arb / spread). */
export function marketGroupHasArb(g: MarketItemGroup): boolean {
  return (
    g.bestSale != null && g.bestWant != null && g.bestSale < g.bestWant
  );
}

/** Both a priced sell and a priced buy exist (spread is meaningful). */
export function marketGroupHasBothPrices(g: MarketItemGroup): boolean {
  return g.bestSale != null && g.bestWant != null;
}

/** Buy−sell spread when both prices exist; otherwise −∞. */
function priceSpread(g: MarketItemGroup): number {
  if (!marketGroupHasBothPrices(g) || g.bestSale == null || g.bestWant == null) {
    return Number.NEGATIVE_INFINITY;
  }
  return g.bestWant - g.bestSale;
}

function salePrice(g: MarketItemGroup): number {
  return g.bestSale != null ? g.bestSale : Number.POSITIVE_INFINITY;
}

function wantPrice(g: MarketItemGroup): number {
  return g.bestWant != null ? g.bestWant : Number.NEGATIVE_INFINITY;
}

/** Sort item groups for the market grid. Favorites float to the top. */
export function sortMarketGroups(
  groups: MarketItemGroup[],
  sort: MarketGroupSort,
  favoriteKeys?: Record<string, boolean> | null,
): MarketItemGroup[] {
  const copy = groups.slice();
  const fav = favoriteKeys || null;
  copy.sort((a, b) => {
    if (fav) {
      const fa = fav[a.key] ? 0 : 1;
      const fb = fav[b.key] ? 0 : 1;
      if (fa !== fb) return fa - fb;
    }
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "sellAsc") {
      const pa = salePrice(a);
      const pb = salePrice(b);
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    }
    if (sort === "sellDesc") {
      const pa = a.bestSale != null ? a.bestSale : Number.NEGATIVE_INFINITY;
      const pb = b.bestSale != null ? b.bestSale : Number.NEGATIVE_INFINITY;
      if (pa !== pb) return pb - pa;
      return a.name.localeCompare(b.name);
    }
    if (sort === "buyDesc") {
      const pa = wantPrice(a);
      const pb = wantPrice(b);
      if (pa !== pb) return pb - pa;
      return a.name.localeCompare(b.name);
    }
    if (sort === "offers") {
      const na = a.rows.length;
      const nb = b.rows.length;
      if (na !== nb) return nb - na;
      return a.name.localeCompare(b.name);
    }
    if (sort === "arb") {
      // 0 = green-border arb, 1 = both prices but no arb, 2 = missing a side
      const tier = (g: MarketItemGroup) =>
        marketGroupHasArb(g) ? 0 : marketGroupHasBothPrices(g) ? 1 : 2;
      const ta = tier(a);
      const tb = tier(b);
      if (ta !== tb) return ta - tb;
      if (ta === 0) {
        const sa = priceSpread(a);
        const sb = priceSpread(b);
        if (sa !== sb) return sb - sa;
      }
      return a.name.localeCompare(b.name);
    }
    // dual (default): both priced sides (or a giveaway) first, then name
    const da =
      marketGroupHasBothPrices(a) || a.giveaways.length ? 0 : 1;
    const db =
      marketGroupHasBothPrices(b) || b.giveaways.length ? 0 : 1;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });
  return copy;
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
    const ga = a.giveaway ? 2 : a.buyOrder ? 1 : 0;
    const gb = b.giveaway ? 2 : b.buyOrder ? 1 : 0;
    if (ga !== gb) return ga - gb;
    // sales: cheapest first; buy orders: highest first; giveaways: by entrants
    if (!a.buyOrder && !b.buyOrder && !a.giveaway && !b.giveaway) {
      return a.price - b.price;
    }
    if (a.buyOrder && b.buyOrder) return b.price - a.price;
    if (a.giveaway && b.giveaway) {
      return (a.giveawayEntries || 0) - (b.giveawayEntries || 0);
    }
    return a.price - b.price;
  });
  return copy;
}
