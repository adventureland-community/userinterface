/**
 * Trade row / merchant stand slot helpers (mirrors stock render_slots trade row).
 */

import type { EntityLike, SlotLike } from "../host/globals";

export function isTradeSlot(slotName: string): boolean {
  return String(slotName || "").indexOf("trade") === 0;
}

export function formatTradeSlotLabel(slotName: string): string {
  const num = parseInt(String(slotName).replace("trade", ""), 10);
  if (Number.isFinite(num) && num > 0) return `Trade ${num}`;
  return slotName;
}

function hasTradeRowKey(
  slots: Record<string, SlotLike | null | undefined>,
): boolean {
  return Object.prototype.hasOwnProperty.call(slots, "trade1");
}

/** Personal (non-merchant) trade row is open — trade1 key exists and stand is closed. */
export function personalTradeRowOpen(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
  entity?: EntityLike | null,
): boolean {
  if (!slots) return false;
  if (entity && entity.stand) return false;
  return hasTradeRowKey(slots);
}

/** Trade row visible (personal row or merchant stand), including empty slots. */
export function tradeRowVisible(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
  entity?: EntityLike | null,
): boolean {
  if (!slots) return false;
  if (entity && entity.stand) return true;
  if (hasTradeRowKey(slots)) return true;
  const keys = Object.keys(slots);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].indexOf("trade") === 0 && slots[keys[i]]) return true;
  }
  return false;
}

export type TradeSlotOptions = {
  /** Always show personal trade1–4 while editing (row/stand need not be open). */
  editPersonalRow?: boolean;
};

const PERSONAL_TRADE_SLOTS = ["trade1", "trade2", "trade3", "trade4"];

/** Stand slot capacity from merchant tier (open or closed). */
export function merchantStandCapacity(
  entity: EntityLike | null | undefined,
): number {
  if (!entity) return 16;
  const level = entity.level != null ? Number(entity.level) : 0;
  const stand = entity.stand ? String(entity.stand) : "";
  if (entity.type === "merchant" && level >= 80) return 30;
  if (entity.type === "merchant" && (level >= 70 || stand === "cstand")) return 24;
  return 16;
}

/** Merchant stand capacity (mirrors server get_trade_slots). Zero when stand closed. */
export function standTradeSlotCount(entity: EntityLike | null | undefined): number {
  if (!entity || !entity.stand) return 0;
  return merchantStandCapacity(entity);
}

/** All merchant stand keys trade1…tradeN (UI preview — stand need not be open). */
export function allMerchantStandSlotNames(
  entity: EntityLike | null | undefined,
): string[] {
  const n = merchantStandCapacity(entity);
  const names: string[] = [];
  for (let i = 1; i <= n; i++) names.push(`trade${i}`);
  return names;
}

/** All stand slot keys trade1…tradeN for an open stand. */
export function allStandTradeSlotNames(
  entity: EntityLike | null | undefined,
): string[] {
  const n = standTradeSlotCount(entity);
  if (n <= 0) return [];
  const names: string[] = [];
  for (let i = 1; i <= n; i++) names.push(`trade${i}`);
  return names;
}

/** Grid column count for a stand (stock render_slots layout). */
export function standGridColumns(slotCount: number): number {
  if (slotCount > 16) return 6;
  return 4;
}

/**
 * Default trade1–4 — the slots everyone has without a merchant stand.
 * Shown for your character and for inspected merchants (stand open or closed).
 */
export function personalTradeSlotNames(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
  entity?: EntityLike | null,
  gearEditable?: boolean,
): string[] {
  if (gearEditable) return PERSONAL_TRADE_SLOTS.slice();
  if (!slots) return [];
  if (entity && entity.stand) return PERSONAL_TRADE_SLOTS.slice();
  if (hasTradeRowKey(slots)) return PERSONAL_TRADE_SLOTS.slice();
  const keys = Object.keys(slots);
  const filled: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k.indexOf("trade") !== 0) continue;
    const num = parseInt(k.replace("trade", ""), 10);
    if (num >= 1 && num <= 4 && slots[k]) filled.push(k);
  }
  filled.sort((a, b) => {
    const na = parseInt(a.replace("trade", ""), 10) || 0;
    const nb = parseInt(b.replace("trade", ""), 10) || 0;
    return na - nb;
  });
  return filled.length ? PERSONAL_TRADE_SLOTS.slice() : [];
}

/**
 * Merchant stand extras (trade5+) — rendered whether stand is open or closed.
 * When `excludePersonal`, omits trade1–4 (shown as the default trade-slot row).
 */
export function merchantStandSlotNames(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
  entity: EntityLike | null | undefined,
  compact: boolean,
  excludePersonal = false,
): string[] {
  if (!entity || !slots) return [];
  const all = allMerchantStandSlotNames(entity);
  const candidates = excludePersonal ? all.slice(4) : all;
  return compactTradeSlotNames(candidates, slots, compact);
}

/**
 * Stand slots when merchant stand is open (legacy alias).
 * When `excludePersonal`, omits trade1–4 (shown in the personal row instead).
 */
export function standTradeSlotNames(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
  entity: EntityLike | null | undefined,
  compact: boolean,
  excludePersonal = false,
): string[] {
  if (!entity || !entity.stand || !slots) return [];
  return merchantStandSlotNames(slots, entity, compact, excludePersonal);
}

/** Ordered trade slot names for GearGrid — empty slots included when row is open. */
export function tradeSlotNames(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
  entity?: EntityLike | null,
  options?: TradeSlotOptions,
): string[] {
  if (!slots) return [];
  if (options?.editPersonalRow && !(entity && entity.stand)) {
    return PERSONAL_TRADE_SLOTS.slice();
  }
  if (!tradeRowVisible(slots, entity)) return [];

  const keys = Object.keys(slots);
  const tradeKeys: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].indexOf("trade") === 0) tradeKeys.push(keys[i]);
  }
  tradeKeys.sort((a, b) => {
    const na = parseInt(a.replace("trade", ""), 10) || 0;
    const nb = parseInt(b.replace("trade", ""), 10) || 0;
    return na - nb;
  });

  if (entity && entity.stand && tradeKeys.length > 0) return tradeKeys;

  if (hasTradeRowKey(slots)) {
    return PERSONAL_TRADE_SLOTS.slice();
  }

  return tradeKeys;
}

export function observingTradeSlotNames(): string[] {
  const obs = window.observing as EntityLike | null | undefined;
  if (!obs || !obs.slots) return [];
  if (obs.stand) return allStandTradeSlotNames(obs);
  return tradeSlotNames(obs.slots, obs, { editPersonalRow: true });
}

export function tradeSlotIsEmpty(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
  slotName: string,
): boolean {
  if (!slots) return false;
  const slot = slots[slotName];
  return !slot || !slot.name;
}

/** Compact: filled slots plus one empty; expanded: full candidate list. */
export function compactTradeSlotNames(
  candidateNames: string[],
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
  compact: boolean,
): string[] {
  if (!compact || !slots) return candidateNames.slice();
  const filled: string[] = [];
  let firstEmpty: string | null = null;
  for (let i = 0; i < candidateNames.length; i++) {
    const name = candidateNames[i];
    if (!tradeSlotIsEmpty(slots, name)) filled.push(name);
    else if (!firstEmpty) firstEmpty = name;
  }
  if (firstEmpty) filled.push(firstEmpty);
  return filled;
}
