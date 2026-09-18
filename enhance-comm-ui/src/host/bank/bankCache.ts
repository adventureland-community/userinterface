/**
 * Shared account-bank snapshot cache — Market badges + Bank panel.
 * Memory + IndexedDB soft-hydrate; load_bank revalidates and persists.
 */

import type { BankSnapshot } from "../../lib/bank/bankTypes";
import { loadBank, type BankLoadResult } from "./api";
import {
  hydrateBankSnapshotFromIdb,
  schedulePersistBankSnapshot,
} from "./bankPersist";

const DEFAULT_MAX_AGE_MS = 60_000;

let cached: BankSnapshot | null = null;
let inflight: Promise<BankLoadResult> | null = null;
let idbHydrate: Promise<BankSnapshot | null> | null = null;
const listeners: Array<(snap: BankSnapshot | null) => void> = [];

function emit(): void {
  const snap = cached;
  for (let i = 0; i < listeners.length; i++) listeners[i](snap);
}

export function getCachedBankSnapshot(): BankSnapshot | null {
  return cached;
}

/** Subscribe to cache updates (Market badges, etc.). Returns unsubscribe. */
export function subscribeBankSnapshot(
  fn: (snap: BankSnapshot | null) => void,
): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function setCachedBankSnapshot(snap: BankSnapshot | null): void {
  cached = snap;
  if (snap) schedulePersistBankSnapshot(snap);
  emit();
}

/** Soft-hydrate from IndexedDB into memory (no network). */
export async function hydrateBankCacheFromIdb(): Promise<BankSnapshot | null> {
  if (cached) return cached;
  if (!idbHydrate) {
    idbHydrate = hydrateBankSnapshotFromIdb().then((snap) => {
      idbHydrate = null;
      if (snap && !cached) {
        cached = snap;
        emit();
      }
      return snap;
    });
  }
  return idbHydrate;
}

/**
 * Return a usable snapshot. Reuses memory (then IDB) when fresh enough unless
 * `force`. Concurrent callers share one in-flight load_bank.
 */
export async function ensureBankSnapshot(opts?: {
  force?: boolean;
  maxAgeMs?: number;
}): Promise<BankLoadResult> {
  const maxAge =
    opts && opts.maxAgeMs != null ? opts.maxAgeMs : DEFAULT_MAX_AGE_MS;
  const force = !!(opts && opts.force);
  const now = Date.now();

  if (!force && cached && now - cached.loadedAt <= maxAge) {
    return { ok: true, snapshot: cached };
  }

  if (!force && !cached) {
    const fromIdb = await hydrateBankCacheFromIdb();
    if (fromIdb && now - fromIdb.loadedAt <= maxAge) {
      return { ok: true, snapshot: fromIdb };
    }
  }

  if (inflight) return inflight;

  inflight = loadBank().then((res) => {
    inflight = null;
    if (res.ok) {
      cached = res.snapshot;
      schedulePersistBankSnapshot(res.snapshot);
      emit();
    }
    return res;
  });
  return inflight;
}
