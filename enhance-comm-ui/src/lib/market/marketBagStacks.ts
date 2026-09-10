/**
 * Collapse bag slots that share name + level + title for Market bag UI.
 */

export type MarketBagSlot = {
  slot: number;
  name: string;
  q?: number;
  level?: number;
  p?: string | null;
  skin?: string;
};

export type MarketBagStack = {
  /** First bag slot index (for list / drag actions). */
  slot: number;
  /** All bag indices that contributed to this stack. */
  slots: number[];
  name: string;
  /** Summed quantity across collapsed slots. */
  q: number;
  level?: number;
  p?: string | null;
  skin?: string;
  /** How many physical bag slots were merged. */
  slotCount: number;
};

export function marketBagStackKey(item: {
  name: string;
  level?: number;
  p?: string | null;
}): string {
  return (
    item.name +
    "\0" +
    (item.level != null ? String(item.level) : "") +
    "\0" +
    (item.p != null && item.p !== "" ? String(item.p) : "")
  );
}

/**
 * Merge bag slots with the same item identity (name, level, title `p`).
 * Order follows first appearance in the bag.
 */
export function collapseMarketBagStacks(
  items: Array<MarketBagSlot | null | undefined> | null | undefined,
): MarketBagStack[] {
  if (!items || !items.length) return [];
  const order: string[] = [];
  const byKey: Record<string, MarketBagStack> = Object.create(null);

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || !it.name) continue;
    const name = String(it.name);
    const level = typeof it.level === "number" ? it.level : undefined;
    const p =
      it.p != null && String(it.p) !== "" ? String(it.p) : null;
    const key = marketBagStackKey({ name, level, p });
    const qty =
      typeof it.q === "number" && it.q > 0 ? it.q | 0 : 1;
    const slot = typeof it.slot === "number" ? it.slot : i;
    const existing = byKey[key];
    if (!existing) {
      byKey[key] = {
        slot,
        slots: [slot],
        name,
        q: qty,
        level,
        p,
        skin: it.skin,
        slotCount: 1,
      };
      order.push(key);
      continue;
    }
    existing.q += qty;
    existing.slots.push(slot);
    existing.slotCount += 1;
    if (!existing.skin && it.skin) existing.skin = it.skin;
  }

  const out: MarketBagStack[] = [];
  for (let i = 0; i < order.length; i++) {
    out.push(byKey[order[i]]);
  }
  return out;
}
