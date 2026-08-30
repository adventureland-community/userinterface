/**
 * Inventory / trade slot space labels for send and trade UI.
 */

import type { EntityLike, SlotLike } from "../host/globals";

/** Empty bag slots when `esize` is synced (non-stranger / observing). */
export function freeInventorySlots(
  entity: EntityLike | null | undefined,
): number | null {
  if (!entity || entity.esize == null) return null;
  const n = Number(entity.esize);
  if (!Number.isFinite(n) || n < 0) return null;
  return n | 0;
}

/** Compact label: "3 free" or "3/42 free" when isize known. */
export function formatFreeInventorySpace(
  entity: EntityLike | null | undefined,
): string | null {
  const free = freeInventorySlots(entity);
  if (free == null) return null;
  const isize =
    entity?.isize != null && Number.isFinite(Number(entity.isize))
      ? (Number(entity.isize) | 0)
      : null;
  if (isize != null && isize > 0) {
    return `${free}/${isize} free`;
  }
  return `${free} free`;
}

export type TradeSlotSpace = {
  total: number;
  filled: number;
  empty: number;
};

export function countTradeSlotSpace(
  slotNames: string[],
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
): TradeSlotSpace {
  let filled = 0;
  for (let i = 0; i < slotNames.length; i++) {
    const slot = slots?.[slotNames[i]];
    if (slot && slot.name) filled++;
  }
  const total = slotNames.length;
  return { total, filled, empty: Math.max(0, total - filled) };
}

/** "2 free · 14 listed" or "16 listed" when full. */
export function formatTradeSlotSpace(
  slotNames: string[],
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
): string | null {
  if (!slotNames.length) return null;
  const { filled, empty } = countTradeSlotSpace(slotNames, slots);
  if (empty <= 0) return `${filled} listed`;
  return `${empty} free · ${filled} listed`;
}
