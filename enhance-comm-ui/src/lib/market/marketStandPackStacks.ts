/**
 * Pack-mode stand collapse: merge identical listings into one cell with summed qty.
 * Gold: buy/sell · name · level · title · price.
 * Trades: name · level · title · want (name/level/title/q) · offer q.
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

function wantParts(want: { name?: string; level?: number; p?: string | null; q?: number } | string | null | undefined): {
  name: string;
  level: string;
  p: string;
  q: string;
} {
  if (typeof want === "string") {
    return { name: want, level: "", p: "", q: "" };
  }
  if (!want || typeof want !== "object") {
    return { name: "", level: "", p: "", q: "" };
  }
  return {
    name: want.name ? String(want.name) : "",
    level: want.level != null ? String(want.level) : "",
    p: want.p != null && String(want.p) !== "" ? String(want.p) : "",
    q: want.q != null && want.q > 0 ? String(want.q | 0) : "",
  };
}

export function marketStandPackStackKey(slot: {
  name: string;
  b?: boolean;
  giveaway?: boolean;
  registry?: Record<string, string>;
  want?: { name?: string; level?: number; p?: string | null; q?: number } | string | null;
  level?: number;
  p?: string | null;
  price?: number;
  q?: number;
}): string {
  const give = !!(slot.giveaway || slot.registry);
  const w = wantParts(slot.want);
  const trade = !give && !slot.b && !!w.name;
  const offerQ =
    typeof slot.q === "number" && slot.q > 0 ? String(slot.q | 0) : "1";
  return (
    (give ? "g" : trade ? "t" : slot.b ? "1" : "0") +
    "\0" +
    slot.name +
    "\0" +
    (slot.level != null ? String(slot.level) : "") +
    "\0" +
    (slot.p != null && slot.p !== "" ? String(slot.p) : "") +
    "\0" +
    (give
      ? "give"
      : trade
        ? ["want", w.name, w.level, w.p, w.q, offerQ].join("\0")
        : slot.price != null
          ? String(slot.price)
          : "")
  );
}

function listingQty(slot: SlotLike): number {
  if (typeof slot.q === "number" && slot.q > 0) return slot.q | 0;
  return 1;
}

/**
 * Collapse filled stand slots that share identity (see marketStandPackStackKey).
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
      want: raw.want,
      level: typeof raw.level === "number" ? raw.level : undefined,
      p: raw.p != null && String(raw.p) !== "" ? String(raw.p) : null,
      price: typeof raw.price === "number" ? raw.price : undefined,
      q: typeof raw.q === "number" ? raw.q : undefined,
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
