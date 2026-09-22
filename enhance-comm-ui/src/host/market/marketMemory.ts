/**
 * Sync in-memory merchant catalog for price dialogs (and other non-React callers).
 * Fed by Market panel persist / IDB hydrate — not a second source of truth.
 */

import type { CachedMarketMerchant } from "../../lib/market/marketPersistLogic";

let cached: CachedMarketMerchant[] = [];

export function getCachedMarketMerchants(): CachedMarketMerchant[] {
  return cached;
}

export function setCachedMarketMerchants(
  merchants: CachedMarketMerchant[],
): void {
  cached = Array.isArray(merchants) ? merchants : [];
}
