/**
 * Summarize Market catalog sell / buy-order prices for one item.
 */

import type { CachedMarketMerchant } from "./marketPersistLogic";

export type MarketCatalogSample = {
  price: number;
  merchant: string;
  level?: number;
  buyOrder: boolean;
};

export type MarketCatalogPriceInfo = {
  sells: MarketCatalogSample[];
  wants: MarketCatalogSample[];
};

/**
 * Scan cached merchants for priced listings of `itemName`.
 * Sells sorted ascending; wants (buy orders) sorted descending.
 */
export function marketCatalogPricesForItem(
  itemName: string,
  merchants: CachedMarketMerchant[],
  options?: { level?: number | null; max?: number },
): MarketCatalogPriceInfo {
  const name = String(itemName || "").trim();
  const empty: MarketCatalogPriceInfo = { sells: [], wants: [] };
  if (!name || !merchants || !merchants.length) return empty;

  const wantLevel = options?.level;
  const max = options?.max != null ? Math.max(1, options.max | 0) : 8;
  const sells: MarketCatalogSample[] = [];
  const wants: MarketCatalogSample[] = [];
  const seenSell = new Set<number>();
  const seenWant = new Set<number>();

  for (let mi = 0; mi < merchants.length; mi++) {
    const m = merchants[mi];
    if (!m || !m.slots || !m.slots.length) continue;
    const merchant = String(m.name || "").trim() || "merchant";
    for (let si = 0; si < m.slots.length; si++) {
      const slot = m.slots[si];
      if (!slot || slot.name !== name) continue;
      if (slot.giveaway) continue;
      const price = Number(slot.price) | 0;
      if (!(price > 0)) continue;
      if (
        wantLevel != null &&
        slot.level != null &&
        slot.level !== wantLevel
      ) {
        continue;
      }
      const sample: MarketCatalogSample = {
        price,
        merchant,
        buyOrder: !!slot.buyOrder,
      };
      if (slot.level != null) sample.level = slot.level;
      if (slot.buyOrder) {
        if (seenWant.has(price)) continue;
        seenWant.add(price);
        wants.push(sample);
      } else {
        if (seenSell.has(price)) continue;
        seenSell.add(price);
        sells.push(sample);
      }
    }
  }

  sells.sort((a, b) => a.price - b.price);
  wants.sort((a, b) => b.price - a.price);
  return {
    sells: sells.slice(0, max),
    wants: wants.slice(0, max),
  };
}
