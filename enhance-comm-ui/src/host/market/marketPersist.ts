/**
 * IndexedDB persistence for the market merchant/listing cache.
 * Soft-hydrate on Market open; pull + live open-stand revalidate in memory.
 */

import type { CachedMarketMerchant } from "../../lib/market/marketPersistLogic";
import {
  getCachedMarketMerchants,
  setCachedMarketMerchants,
} from "./marketMemory";

const DB_NAME = "ecu-market-cache";
const DB_VER = 1;
const STORE = "catalogs";
const RECORD_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 400;

export type MarketCacheRecord = {
  accountKey: string;
  version: typeof RECORD_VERSION;
  savedAt: number;
  merchants: CachedMarketMerchant[];
};

let dbPromise: Promise<IDBDatabase | null> | null = null;
let persistTimer = 0;
let pendingMerchants: CachedMarketMerchant[] | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "accountKey" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Scope cache per account when user_id / roster is available. */
export function marketAccountKey(): string {
  const w = window as Window & {
    user_id?: string | number;
    X?: { characters?: Array<{ name?: string }> };
  };
  if (w.user_id != null && String(w.user_id) !== "") {
    return "u:" + String(w.user_id);
  }
  const chars = w.X && w.X.characters;
  if (Array.isArray(chars) && chars.length) {
    const names: string[] = [];
    for (let i = 0; i < chars.length; i++) {
      const n = chars[i] && chars[i].name;
      if (n) names.push(String(n));
    }
    names.sort();
    if (names.length) return "chars:" + names.join(",");
  }
  return "default";
}

function isCachedMerchant(raw: unknown): raw is CachedMarketMerchant {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as CachedMarketMerchant;
  if (typeof m.name !== "string" || !m.name) return false;
  if (!Array.isArray(m.slots)) return false;
  return true;
}

export async function loadMarketCacheRecord(
  accountKey: string,
): Promise<MarketCacheRecord | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const row = await reqToPromise(
      store.get(accountKey) as IDBRequest<MarketCacheRecord | undefined>,
    );
    if (!row || row.version !== RECORD_VERSION) return null;
    if (!Array.isArray(row.merchants)) return null;
    const merchants: CachedMarketMerchant[] = [];
    for (let i = 0; i < row.merchants.length; i++) {
      if (isCachedMerchant(row.merchants[i])) merchants.push(row.merchants[i]);
    }
    return {
      accountKey: row.accountKey,
      version: RECORD_VERSION,
      savedAt: row.savedAt || 0,
      merchants,
    };
  } catch {
    return null;
  }
}

export async function saveMarketCacheRecord(
  record: MarketCacheRecord,
): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    await reqToPromise(store.put(record));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Debounced write of the reconciled merchant cache to IndexedDB. */
export function schedulePersistMarketCache(
  merchants: CachedMarketMerchant[],
): void {
  if (typeof window === "undefined") return;
  setCachedMarketMerchants(merchants);
  pendingMerchants = merchants;
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = 0;
    const list = pendingMerchants;
    pendingMerchants = null;
    if (!list) return;
    void saveMarketCacheRecord({
      accountKey: marketAccountKey(),
      version: RECORD_VERSION,
      savedAt: Date.now(),
      merchants: list,
    });
  }, PERSIST_DEBOUNCE_MS);
}

/** Load cached merchants for soft UI hydrate (before / between pulls). */
export async function hydrateMarketCacheFromIdb(): Promise<
  CachedMarketMerchant[]
> {
  const rec = await loadMarketCacheRecord(marketAccountKey());
  if (!rec) return [];
  // Don't clobber a fresher in-memory pull that raced ahead of IDB hydrate.
  if (!getCachedMarketMerchants().length) {
    setCachedMarketMerchants(rec.merchants);
  }
  return rec.merchants;
}
