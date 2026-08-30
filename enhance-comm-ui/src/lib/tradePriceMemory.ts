/**
 * Remember last list/wishlist prices per item name (localStorage).
 */

const STORAGE_KEY = "ecu-trade-price-memory";

type PriceEntry = {
  price: number;
  q?: number;
};

type PriceMap = Record<string, PriceEntry>;

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

/** Price prompt defaulting to last remembered price for this item. */
export function defaultTradePrice(itemName: string): string {
  const mem = recallTradePrice(itemName);
  return mem ? String(mem.price) : "";
}
