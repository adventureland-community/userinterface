/**
 * IndexedDB persistence for the account bank snapshot.
 * Soft-hydrate Market badges + Bank panel; network load_bank still revalidates.
 */

import type { BankPacks, BankSnapshot } from "../../lib/bank/bankTypes";

const DB_NAME = "ecu-bank-cache";
const DB_VER = 1;
const STORE = "snapshots";
const RECORD_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 400;

export type BankCacheRecord = {
  accountKey: string;
  version: typeof RECORD_VERSION;
  savedAt: number;
  packs: BankPacks;
  gold: number;
  /** When the server snapshot was taken (same as BankSnapshot.loadedAt). */
  loadedAt: number;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;
let persistTimer = 0;
let pendingSnap: BankSnapshot | null = null;

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
export function bankAccountKey(): string {
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

function isPacks(raw: unknown): raw is BankPacks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const obj = raw as Record<string, unknown>;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    if (Array.isArray(obj[keys[i]])) return true;
  }
  return false;
}

export async function loadBankCacheRecord(
  accountKey: string,
): Promise<BankCacheRecord | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const row = await reqToPromise(
      store.get(accountKey) as IDBRequest<BankCacheRecord | undefined>,
    );
    if (!row || row.version !== RECORD_VERSION) return null;
    if (!isPacks(row.packs)) return null;
    return {
      accountKey: row.accountKey,
      version: RECORD_VERSION,
      savedAt: row.savedAt || 0,
      packs: row.packs,
      gold: typeof row.gold === "number" ? row.gold : 0,
      loadedAt: typeof row.loadedAt === "number" ? row.loadedAt : row.savedAt || 0,
    };
  } catch {
    return null;
  }
}

export async function saveBankCacheRecord(
  record: BankCacheRecord,
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

/** Debounced write of the in-memory bank snapshot to IndexedDB. */
export function schedulePersistBankSnapshot(snap: BankSnapshot): void {
  if (typeof window === "undefined") return;
  pendingSnap = snap;
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = 0;
    const s = pendingSnap;
    pendingSnap = null;
    if (!s) return;
    void saveBankCacheRecord({
      accountKey: bankAccountKey(),
      version: RECORD_VERSION,
      savedAt: Date.now(),
      packs: s.packs,
      gold: s.gold,
      loadedAt: s.loadedAt,
    });
  }, PERSIST_DEBOUNCE_MS);
}

/** Soft-hydrate a BankSnapshot from IndexedDB (no network). */
export async function hydrateBankSnapshotFromIdb(): Promise<BankSnapshot | null> {
  const rec = await loadBankCacheRecord(bankAccountKey());
  if (!rec) return null;
  return {
    packs: rec.packs,
    gold: rec.gold,
    loadedAt: rec.loadedAt,
  };
}
