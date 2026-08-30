/**
 * Remember last list/wishlist prices per item name (localStorage).
 */

import type { EntityLike, SlotLike } from "../host/globals";
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
  kind?: "vendor" | "last" | "current" | "yours" | "nearby" | "undercut";
};

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

function formatGold(n: number): string {
  const v = Number(n) | 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  return String(v);
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
};

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

  const vendorNet = vendorGoldPrice(name, options?.level);
  const vendorFloor = vendorListFloorPrice(name, {
    level: options?.level,
    observer,
  });
  if (vendorFloor != null && vendorNet != null) {
    const tax = resolveTradeTaxRate(observer);
    const taxPct = Math.round(tax * 100);
    const netLabel = formatGold(vendorNet);
    push(
      `Vendor · ${formatGold(vendorFloor)}g (${netLabel}g net, ${taxPct}% tax)`,
      vendorFloor,
      "vendor",
    );
  }

  const mem = recallTradePrice(name);
  if (mem) push(`Last · ${formatGold(mem.price)}g`, mem.price, "last");

  const current = options?.currentPrice;
  if (current != null && Number(current) > 0) {
    push(`Current · ${formatGold(current)}g`, Number(current), "current");
  }

  const yours = nearbyTradePricesForItem(name, options?.slots);
  for (let i = 0; i < yours.length; i++) {
    push(`Yours · ${formatGold(yours[i])}g`, yours[i], "yours");
  }

  const nearbyMap = nearbyMapSellPricesForItem(name, observer, {
    level: options?.level,
  });
  for (let i = 0; i < nearbyMap.length; i++) {
    const row = nearbyMap[i];
    push(formatNearbySellLine(row), row.price, "nearby");
  }

  if (nearbyMap.length > 0) {
    const low = nearbyMap[0].price;
    const undercut = Math.max(1, low - 1);
    if (!seen.has(undercut)) {
      push(`Undercut · ${formatGold(undercut)}g`, undercut, "undercut");
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

  for (let i = 0; i < suggestions.length; i++) {
    const sug = suggestions[i];
    if (sug.kind === "vendor") continue;
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
