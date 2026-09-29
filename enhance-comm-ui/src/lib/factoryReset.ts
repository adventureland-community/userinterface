/**
 * Factory-reset Comm UI persistence: ECU localStorage / sessionStorage keys
 * and known IndexedDB caches. Does not wipe adventure.land / other site data.
 */

export const ECU_LOCAL_STORAGE_PREFIXES = ["ecu-", "al-comm-ui-"] as const;

/** IndexedDB databases owned by Enhance Comm UI. */
export const ECU_INDEXED_DB_NAMES = [
  "ecu-market-cache",
  "ecu-mail-cache",
  "ecu-bank-cache",
  "ecu-meter-archive",
] as const;

export function isEcuStorageKey(key: string): boolean {
  const k = String(key || "");
  for (let i = 0; i < ECU_LOCAL_STORAGE_PREFIXES.length; i++) {
    if (k.indexOf(ECU_LOCAL_STORAGE_PREFIXES[i]) === 0) return true;
  }
  return false;
}

/** Remove matching keys from a Storage-like object. Returns how many were removed. */
export function clearEcuKeysFromStorage(store: Storage | null | undefined): number {
  if (!store) return 0;
  const toRemove: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && isEcuStorageKey(key)) toRemove.push(key);
    }
  } catch {
    return 0;
  }
  for (let i = 0; i < toRemove.length; i++) {
    try {
      store.removeItem(toRemove[i]);
    } catch {
      // ignore
    }
  }
  return toRemove.length;
}

function deleteIndexedDb(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined" || !indexedDB.deleteDatabase) {
      resolve(false);
      return;
    }
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(true);
    } catch {
      resolve(false);
    }
  });
}

export type FactoryResetResult = {
  localKeys: number;
  sessionKeys: number;
  indexedDbs: string[];
};

/**
 * Wipe ECU persisted state. Caller should reload so in-memory caches die.
 */
export async function factoryResetCommUi(): Promise<FactoryResetResult> {
  const localKeys = clearEcuKeysFromStorage(
    typeof localStorage !== "undefined" ? localStorage : null,
  );
  const sessionKeys = clearEcuKeysFromStorage(
    typeof sessionStorage !== "undefined" ? sessionStorage : null,
  );
  const indexedDbs: string[] = [];
  for (let i = 0; i < ECU_INDEXED_DB_NAMES.length; i++) {
    const name = ECU_INDEXED_DB_NAMES[i];
    const ok = await deleteIndexedDb(name);
    if (ok) indexedDbs.push(name);
  }
  return { localKeys, sessionKeys, indexedDbs };
}

/** Confirm + wipe + hard reload. Returns false if the user cancelled. */
export async function confirmAndFactoryResetCommUi(): Promise<boolean> {
  const ok = window.confirm(
    "Reset Comm UI to factory defaults?\n\n" +
      "This clears layouts, meters, overlay toggles, market/mail/bank caches, " +
      "trade price memory, and guided-tour progress for this browser.\n\n" +
      "Adventure.land account data is not affected. The page will reload.",
  );
  if (!ok) return false;
  const again = window.confirm(
    "Really wipe all Comm UI local data? This cannot be undone.",
  );
  if (!again) return false;
  await factoryResetCommUi();
  try {
    window.location.reload();
  } catch {
    // ignore
  }
  return true;
}
