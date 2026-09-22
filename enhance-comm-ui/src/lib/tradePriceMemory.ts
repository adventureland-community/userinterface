/**
 * Remember last list/wishlist prices per item name (localStorage).
 */

import type { EntityLike, SlotLike } from "../host/globals";
import { getCachedMarketMerchants } from "../host/market/marketMemory";
import { marketCatalogPricesForItem } from "./market/marketCatalogPricing";
import { formatTradeGold } from "./tradeHelpers";
import {
  formatNearbySellLine,
  nearbyMapSellPricesForItem,
  vendorGoldPrice,
  vendorListFloorPrice,
  resolveTradeTaxRate,
} from "./tradeItemPricing";

const STORAGE_KEY = "ecu-trade-price-memory";

type PriceEntry = {
  price: number;
  q?: number;
};

type PriceMap = Record<string, PriceEntry>;

export type TradePriceSuggestion = {
  label: string;
  price: number;
  /** Chip styling hint for the price dialog. */
  kind?:
    | "vendor"
    | "last"
    | "current"
    | "yours"
    | "nearby"
    | "undercut"
    | "market"
    | "want";
};

export type TradePriceDialogMode = "list" | "wishlist" | "reprice";

function readMap(): PriceMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PriceMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: PriceMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function recallTradePrice(itemName: string): PriceEntry | null {
  const key = String(itemName || "").trim();
  if (!key) return null;
  const entry = readMap()[key];
  if (!entry || !(entry.price > 0)) return null;
  return entry;
}

export function rememberTradePrice(
  itemName: string,
  price: number,
  q?: number,
): void {
  const key = String(itemName || "").trim();
  if (!key || !(price > 0)) return;
  const map = readMap();
  map[key] = { price: price | 0, q: q != null && q > 0 ? q | 0 : undefined };
  writeMap(map);
}

/** Prices for the same item already listed on trade slots. */
export function nearbyTradePricesForItem(
  itemName: string,
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
): number[] {
  const name = String(itemName || "").trim();
  if (!name || !slots) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  const keys = Object.keys(slots);
  for (let i = 0; i < keys.length; i++) {
    const slot = slots[keys[i]];
    if (!slot || slot.name !== name) continue;
    const price = Number(slot.price) | 0;
    if (!(price > 0) || seen.has(price)) continue;
    seen.add(price);
    out.push(price);
  }
  out.sort((a, b) => a - b);
  return out;
}

export type TradePriceSuggestionOptions = {
  slots?: Record<string, SlotLike | null | undefined> | null;
  currentPrice?: number;
  level?: number | null;
  observer?: EntityLike | null;
  mode?: TradePriceDialogMode;
};

function truncateMerchant(name: string): string {
  return name.length > 10 ? name.slice(0, 9) + "…" : name;
}

export function tradePriceSuggestions(
  itemName: string,
  options?: TradePriceSuggestionOptions,
): TradePriceSuggestion[] {
  const name = String(itemName || "").trim();
  if (!name) return [];
  const out: TradePriceSuggestion[] = [];
  const seen = new Set<number>();

  const push = (
    label: string,
    price: number,
    kind?: TradePriceSuggestion["kind"],
  ) => {
    const p = Number(price) | 0;
    if (!(p > 0) || seen.has(p)) return;
    seen.add(p);
    out.push({ label, price: p, kind });
  };

  const observer = options?.observer ?? (window.observing as EntityLike | null);
  const mode = options?.mode;

  const vendorNet = vendorGoldPrice(name, options?.level);
  const vendorFloor = vendorListFloorPrice(name, {
    level: options?.level,
    observer,
  });
  if (vendorFloor != null && vendorNet != null) {
    const tax = resolveTradeTaxRate(observer);
    const taxPct = Math.round(tax * 100);
    const netLabel = formatTradeGold(vendorNet);
    push(
      `Vendor · ${formatTradeGold(vendorFloor)}g (${netLabel}g net, ${taxPct}% tax)`,
      vendorFloor,
      "vendor",
    );
  }

  const catalog = marketCatalogPricesForItem(
    name,
    getCachedMarketMerchants(),
    { level: options?.level },
  );
  if (catalog.sells.length) {
    const low = catalog.sells[0];
    push(
      `Market low · ${formatTradeGold(low.price)}g (${truncateMerchant(low.merchant)})`,
      low.price,
      "market",
    );
  }
  if (catalog.wants.length) {
    const high = catalog.wants[0];
    push(
      `Want · ${formatTradeGold(high.price)}g (${truncateMerchant(high.merchant)})`,
      high.price,
      "want",
    );
  }

  const mem = recallTradePrice(name);
  if (mem) push(`Last · ${formatTradeGold(mem.price)}g`, mem.price, "last");

  const current = options?.currentPrice;
  if (current != null && Number(current) > 0) {
    push(`Current · ${formatTradeGold(current)}g`, Number(current), "current");
  }

  const yours = nearbyTradePricesForItem(name, options?.slots);
  for (let i = 0; i < yours.length; i++) {
    push(`Yours · ${formatTradeGold(yours[i])}g`, yours[i], "yours");
  }

  const nearbyMap = nearbyMapSellPricesForItem(name, observer, {
    level: options?.level,
  });
  for (let i = 0; i < nearbyMap.length; i++) {
    const row = nearbyMap[i];
    push(formatNearbySellLine(row), row.price, "nearby");
  }

  let undercutBase = 0;
  if (nearbyMap.length > 0) undercutBase = nearbyMap[0].price;
  if (catalog.sells.length > 0) {
    const marketLow = catalog.sells[0].price;
    if (!undercutBase || marketLow < undercutBase) undercutBase = marketLow;
  }
  if (undercutBase > 0 && mode !== "wishlist") {
    const undercut = Math.max(1, undercutBase - 1);
    if (!seen.has(undercut)) {
      push(`Undercut · ${formatTradeGold(undercut)}g`, undercut, "undercut");
    }
  }

  return out.slice(0, 12);
}

/** Default price string for legacy callers / input value. */
export function defaultTradePrice(itemName: string): string {
  const n = defaultTradePriceNumber(itemName);
  return n != null ? String(n) : "";
}

export function defaultTradePriceNumber(
  itemName: string,
  options?: TradePriceSuggestionOptions,
): number {
  const observer = options?.observer ?? (window.observing as EntityLike | null);
  const vendorFloor = vendorListFloorPrice(itemName, {
    level: options?.level,
    observer,
  });
  const floor = vendorFloor != null && vendorFloor > 0 ? vendorFloor : 1;
  const suggestions = tradePriceSuggestions(itemName, { ...options, observer });
  const mode = options?.mode;

  if (mode === "wishlist") {
    for (let i = 0; i < suggestions.length; i++) {
      if (suggestions[i].kind === "market") return suggestions[i].price;
    }
    for (let i = 0; i < suggestions.length; i++) {
      if (suggestions[i].kind === "want") return suggestions[i].price;
    }
    for (let i = 0; i < suggestions.length; i++) {
      const sug = suggestions[i];
      if (sug.kind === "vendor") continue;
      if (sug.price > 0) return sug.price;
    }
  }

  for (let i = 0; i < suggestions.length; i++) {
    const sug = suggestions[i];
    if (sug.kind === "vendor" || sug.kind === "want") continue;
    if (sug.price >= floor) return sug.price;
  }

  return floor;
}

export function parseTradeGoldInput(raw: string): number | null {
  const trimmed = String(raw ?? "").trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n | 0;
}
