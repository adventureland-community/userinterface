/**
 * Buy-desk browse filters / sort for Market listings.
 */

import type { MarketListingRow } from "./marketTypes";
import { listingMatchesMarketQuery } from "./marketQuery";
import { formatTradeGold, tradeOfferRatioParts } from "../tradeHelpers";

export type MarketBrowseFilters = {
  query: string;
  /** sale = gold sales; buy = buy orders; giveaway; trade = item-for-item; all */
  side: "sale" | "buy" | "giveaway" | "trade" | "all";
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
  tradeOffers: import("./marketTypes").MarketListingRow[];
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
    if (filters.side === "sale" && (row.buyOrder || row.giveaway || row.tradeOffer))
      continue;
    if (filters.side === "buy" && !row.buyOrder) continue;
    if (filters.side === "giveaway" && !row.giveaway) continue;
    if (filters.side === "trade" && !row.tradeOffer) continue;
    if (!listingMatchesMarketQuery(row, filters.query, qCtx)) continue;
    if (filters.nearOnly) {
      if (!row.fromLive && row.merchantStatus !== "you") continue;
    }
    if (filters.canAfford && !row.buyOrder && !row.giveaway && !row.tradeOffer) {
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
    // Drop gold-sale stubs (price 0, no want) — not buyable; often incomplete trades.
    if (
      !row.giveaway &&
      !row.tradeOffer &&
      !row.buyOrder &&
      !(row.price > 0)
    ) {
      continue;
    }
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
    const tradeOffers: MarketListingRow[] = [];
    for (let j = 0; j < list.length; j++) {
      if (list[j].giveaway) giveaways.push(list[j]);
      else if (list[j].tradeOffer) tradeOffers.push(list[j]);
      else if (list[j].buyOrder) wants.push(list[j]);
      else sales.push(list[j]);
    }
    let bestSale: number | null = null;
    let bestWant: number | null = null;
    for (let j = 0; j < sales.length; j++) {
      if (!(sales[j].price > 0)) continue;
      if (bestSale == null || sales[j].price < bestSale) bestSale = sales[j].price;
    }
    for (let j = 0; j < wants.length; j++) {
      if (!(wants[j].price > 0)) continue;
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
      tradeOffers,
      bestSale,
      bestWant,
    });
  }
  out.sort((a, b) => {
    const da =
      marketGroupHasBothPrices(a) ||
      a.giveaways.length ||
      a.tradeOffers.length
        ? 0
        : 1;
    const db =
      marketGroupHasBothPrices(b) ||
      b.giveaways.length ||
      b.tradeOffers.length
        ? 0
        : 1;
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

/** True when cheapest sell is below best buy with a visible spread. */
export function marketGroupHasArb(g: MarketItemGroup): boolean {
  if (g.bestSale == null || g.bestWant == null) return false;
  if (!(g.bestSale < g.bestWant)) return false;
  // 999_999 vs 1_000_000 both render as 1.00M — not an arb players can see.
  return formatTradeGold(g.bestSale) !== formatTradeGold(g.bestWant);
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
    // dual (default): both priced sides (or a giveaway / trade offer) first, then name
    const da =
      marketGroupHasBothPrices(a) ||
      a.giveaways.length ||
      a.tradeOffers.length
        ? 0
        : 1;
    const db =
      marketGroupHasBothPrices(b) ||
      b.giveaways.length ||
      b.tradeOffers.length
        ? 0
        : 1;
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
    const ga = a.giveaway ? 3 : a.tradeOffer ? 2 : a.buyOrder ? 1 : 0;
    const gb = b.giveaway ? 3 : b.tradeOffer ? 2 : b.buyOrder ? 1 : 0;
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

/** Collapse item-for-item offers that share merchant + items + ratio. */
export type TradeOfferStack = {
  key: string;
  /** Best row to act on (in-range / live / smallest stack). */
  row: MarketListingRow;
  count: number;
  rows: MarketListingRow[];
  /** Reduced give∶get parts when known. */
  ratio: { give: number; get: number } | null;
};

export type TradeOfferMerchantGroup = {
  key: string;
  merchant: string;
  /** Best row for merchant travel / status chips. */
  row: MarketListingRow;
  stacks: TradeOfferStack[];
  listingCount: number;
};

function tradeWantOfferFingerprint(row: MarketListingRow): string {
  const w = row.want;
  return [
    String(row.merchant || "").toLowerCase(),
    row.name,
    row.level != null ? String(row.level) : "",
    row.p != null ? String(row.p) : "",
    w ? w.name : "",
    w && w.level != null ? String(w.level) : "",
    w && w.p != null ? String(w.p) : "",
  ].join("\0");
}

function tradeOfferAbsQty(row: MarketListingRow): {
  wantQ: number;
  offerQ: number;
} {
  const w = row.want;
  return {
    wantQ: w && w.q != null && w.q > 0 ? w.q | 0 : 1,
    offerQ: row.q != null && row.q > 0 ? row.q | 0 : 1,
  };
}

function tradeOfferIdentityKey(row: MarketListingRow): string {
  const { wantQ, offerQ } = tradeOfferAbsQty(row);
  // Absolute sizes — 26↔26 and 40↔40 stay separate (same ratio, different deals).
  return [tradeWantOfferFingerprint(row), String(wantQ), String(offerQ)].join(
    "\0",
  );
}

function rankTradeOfferRow(a: MarketListingRow, b: MarketListingRow): number {
  const rank = (r: MarketListingRow) =>
    r.merchantStatus === "you"
      ? 0
      : r.merchantStatus === "inRange"
        ? 1
        : r.fromLive
          ? 2
          : 3;
  const d = rank(a) - rank(b);
  if (d !== 0) return d;
  const aq = tradeOfferAbsQty(a).wantQ;
  const bq = tradeOfferAbsQty(b).wantQ;
  if (aq !== bq) return aq - bq;
  return (b.lastRefreshedAt || 0) - (a.lastRefreshedAt || 0);
}

export function groupIdenticalTradeOffers(
  rows: MarketListingRow[],
): TradeOfferStack[] {
  const byKey: Record<string, MarketListingRow[]> = Object.create(null);
  const order: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.tradeOffer || !row.want) continue;
    const key = tradeOfferIdentityKey(row);
    if (!byKey[key]) {
      byKey[key] = [];
      order.push(key);
    }
    byKey[key].push(row);
  }
  const out: TradeOfferStack[] = [];
  for (let i = 0; i < order.length; i++) {
    const list = byKey[order[i]].slice();
    list.sort(rankTradeOfferRow);
    const row = list[0];
    const { wantQ, offerQ } = tradeOfferAbsQty(row);
    out.push({
      key: order[i],
      row,
      count: list.length,
      rows: list,
      ratio: tradeOfferRatioParts(wantQ, offerQ),
    });
  }
  out.sort((a, b) => {
    const mc = a.row.merchant.localeCompare(b.row.merchant);
    if (mc !== 0) return mc;
    const an = (a.row.want && a.row.want.name) || "";
    const bn = (b.row.want && b.row.want.name) || "";
    const nc = an.localeCompare(bn);
    if (nc !== 0) return nc;
    const aq = tradeOfferAbsQty(a.row);
    const bq = tradeOfferAbsQty(b.row);
    if (aq.wantQ !== bq.wantQ) return aq.wantQ - bq.wantQ;
    return aq.offerQ - bq.offerQ;
  });
  return out;
}

/** One Travel card per merchant; stacks are ratio lines underneath. */
export function groupTradeOffersByMerchant(
  rows: MarketListingRow[],
): TradeOfferMerchantGroup[] {
  const stacks = groupIdenticalTradeOffers(rows);
  const byMerch: Record<string, TradeOfferStack[]> = Object.create(null);
  const order: string[] = [];
  for (let i = 0; i < stacks.length; i++) {
    const stack = stacks[i];
    const key = String(stack.row.merchant || "").toLowerCase();
    if (!byMerch[key]) {
      byMerch[key] = [];
      order.push(key);
    }
    byMerch[key].push(stack);
  }
  const out: TradeOfferMerchantGroup[] = [];
  for (let i = 0; i < order.length; i++) {
    const list = byMerch[order[i]];
    const reps = list.map((s) => s.row);
    reps.sort(rankTradeOfferRow);
    let listingCount = 0;
    for (let j = 0; j < list.length; j++) listingCount += list[j].count;
    out.push({
      key: order[i],
      merchant: reps[0].merchant,
      row: reps[0],
      stacks: list,
      listingCount,
    });
  }
  out.sort((a, b) => {
    const rank = (g: TradeOfferMerchantGroup) =>
      g.row.merchantStatus === "you"
        ? 0
        : g.row.merchantStatus === "inRange"
          ? 1
          : 2;
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return a.merchant.localeCompare(b.merchant);
  });
  return out;
}
