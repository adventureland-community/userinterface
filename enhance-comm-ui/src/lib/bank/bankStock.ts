/**
 * Bank quantity lookup keyed like Market bag stacks / item groups
 * (`name\\0level\\0p`).
 */

import {
  aggregateBankItems,
  flattenBankSlots,
} from "./bankBrowse";
import type { BankSnapshot } from "./bankTypes";

/** Same identity as MarketItemGroup.key / marketBagStackKey / BankAggItem.key. */
export function bankItemStockKey(item: {
  name: string;
  level?: number | null;
  p?: string | null;
}): string {
  return (
    String(item.name) +
    "\0" +
    (item.level != null ? String(item.level) : "") +
    "\0" +
    (item.p != null && item.p !== "" ? String(item.p) : "")
  );
}

/** Map stock key → total quantity across all vault packs. */
export function buildBankQtyIndex(
  snap: BankSnapshot | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = Object.create(null);
  if (!snap || !snap.packs) return out;
  const agg = aggregateBankItems(flattenBankSlots(snap.packs));
  for (let i = 0; i < agg.length; i++) {
    const row = agg[i];
    out[row.key] = row.q;
  }
  return out;
}

export function bankQtyFor(
  index: Record<string, number> | null | undefined,
  item: { name: string; level?: number | null; p?: string | null },
): number {
  if (!index) return 0;
  const q = index[bankItemStockKey(item)];
  return q != null && Number.isFinite(q) ? q : 0;
}
