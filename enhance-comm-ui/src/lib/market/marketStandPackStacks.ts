/**
 * Pack-mode stand collapse: merge identical listings into one cell with summed qty.
 * Identity: buy/sell · name · level · title · price.
 */

import type { SlotLike } from "../../host/globals";

export type MarketStandPackEntry = {
  /** Primary trade slot for actions / drag. */
  slotName: string;
  /** All trade slots merged into this cell. */
  slotNames: string[];
  /** Display listing (q summed); null for empty. */
  slot: SlotLike | null;
};

export function marketStandPackStackKey(slot: {
  name: string;
  b?: boolean;
  giveaway?: boolean;
  registry?: Record<string, string>;
  level?: number;
  p?: string | null;
  price?: number;
}): string {
  const give = !!(slot.giveaway || slot.registry);
  return (
    (give ? "g" : slot.b ? "1" : "0") +
    "\0" +
    slot.name +
    "\0" +
    (slot.level != null ? String(slot.level) : "") +
    "\0" +
    (slot.p != null && slot.p !== "" ? String(slot.p) : "") +
    "\0" +
    (give ? "give" : slot.price != null ? String(slot.price) : "")
  );
}

function listingQty(slot: SlotLike): number {
  if (typeof slot.q === "number" && slot.q > 0) return slot.q | 0;
  return 1;
}

/**
 * Collapse filled stand slots that share buy/sell + name + level + title + price.
 * Empty slots pass through unchanged (Pack usually appends one empty).
 * Order follows first appearance in `slotNames`.
 */
export function collapseMarketStandPackSlots(
  slotNames: string[],
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
): MarketStandPackEntry[] {
  if (!slotNames.length) return [];
  const out: MarketStandPackEntry[] = [];
  const byKey: Record<string, MarketStandPackEntry> = Object.create(null);

  for (let i = 0; i < slotNames.length; i++) {
    const slotName = slotNames[i];
    const raw = slots ? slots[slotName] : null;
    if (!raw || !raw.name) {
      out.push({ slotName, slotNames: [slotName], slot: null });
      continue;
    }
    const name = String(raw.name);
    const key = marketStandPackStackKey({
      name,
      b: !!raw.b,
      giveaway: !!raw.giveaway,
      registry: raw.registry,
      level: typeof raw.level === "number" ? raw.level : undefined,
      p: raw.p != null && String(raw.p) !== "" ? String(raw.p) : null,
      price: typeof raw.price === "number" ? raw.price : undefined,
    });
    const existing = byKey[key];
    if (!existing) {
      const display: SlotLike = { ...raw, name, q: listingQty(raw) };
      const entry: MarketStandPackEntry = {
        slotName,
        slotNames: [slotName],
        slot: display,
      };
      byKey[key] = entry;
      out.push(entry);
      continue;
    }
    existing.slotNames.push(slotName);
    if (existing.slot) {
      existing.slot = {
        ...existing.slot,
        q: (existing.slot.q || 0) + listingQty(raw),
      };
    }
  }

  return out;
}
