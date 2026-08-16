/**
 * IndexedDB persistence for the mail inbox cache.
 * Soft-hydrate on open; always revalidate head over the network.
 */

import { headFingerprint } from "./mailPersistLogic";
import {
  commit,
  getHasMore,
  getLastHeadAt,
  getLocallyReadIds,
  getMails,
  getNextCursor,
} from "./mailState";
import type { MailRow } from "./types";

const DB_NAME = "ecu-mail-cache";
const DB_VER = 1;
const STORE = "inboxes";
const RECORD_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 400;

export type MailCacheRecord = {
  accountKey: string;
  version: typeof RECORD_VERSION;
  savedAt: number;
  mails: MailRow[];
  nextCursor: string | null;
  hasMore: boolean;
  lastHeadAt: number;
  headFingerprint: string;
  locallyReadIds: string[];
};

let dbPromise: Promise<IDBDatabase | null> | null = null;
let persistTimer = 0;
let hydrateInFlight: Promise<boolean> | null = null;

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
export function mailAccountKey(): string {
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

export async function loadMailCacheRecord(
  accountKey: string,
): Promise<MailCacheRecord | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const row = await reqToPromise(
      store.get(accountKey) as IDBRequest<MailCacheRecord | undefined>,
    );
    if (!row || row.version !== RECORD_VERSION) return null;
    if (!Array.isArray(row.mails) || !row.mails.length) return null;
    return row;
  } catch {
    return null;
  }
}

export async function saveMailCacheRecord(
  record: MailCacheRecord,
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

function buildRecordFromState(): MailCacheRecord | null {
  const mails = getMails();
  if (!mails.length) return null;
  const readIds = getLocallyReadIds();
  const locallyReadIds: string[] = [];
  for (const id of readIds) {
    locallyReadIds.push(id);
  }
  return {
    accountKey: mailAccountKey(),
    version: RECORD_VERSION,
    savedAt: Date.now(),
    mails,
    nextCursor: getNextCursor(),
    hasMore: getHasMore(),
    lastHeadAt: getLastHeadAt(),
    headFingerprint: headFingerprint(mails),
    locallyReadIds,
  };
}

/** Debounced write of the current in-memory inbox to IndexedDB. */
export function schedulePersistMailCache(): void {
  if (typeof window === "undefined") return;
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = 0;
    const record = buildRecordFromState();
    if (!record) return;
    void saveMailCacheRecord(record);
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Apply IndexedDB snapshot when the session list is empty.
 * Returns true if rows were restored (UI can paint before network head).
 */
export async function hydrateMailCacheFromIdb(): Promise<boolean> {
  if (getMails().length > 0) return false;
  if (hydrateInFlight) return hydrateInFlight;
  hydrateInFlight = (async () => {
    const rec = await loadMailCacheRecord(mailAccountKey());
    if (!rec || getMails().length > 0) return false;
    const local = getLocallyReadIds();
    for (let i = 0; i < rec.locallyReadIds.length; i++) {
      local.add(rec.locallyReadIds[i]);
    }
    commit({
      mails: rec.mails,
      nextCursor: rec.nextCursor,
      hasMore: !!rec.hasMore,
      lastHeadAt: rec.lastHeadAt || 0,
      lastHeadReason: "idb",
      status: "Restored " + rec.mails.length + " from cache",
      statusKind: "",
    });
    return true;
  })();
  try {
    return await hydrateInFlight;
  } finally {
    hydrateInFlight = null;
  }
}
