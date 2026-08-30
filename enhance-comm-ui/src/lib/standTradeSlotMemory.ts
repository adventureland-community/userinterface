/**
 * When a merchant stand closes, the game only syncs trade1–4 in `cslots`
 * (`get_trade_slots`). Listings on trade5+ remain on the server but vanish
 * from client `slots` until the stand opens again.
 *
 * For the watched character we remember the last stand-open trade5+ snapshot
 * so the Trade panel can keep showing those listings while the stand is closed.
 */

import type { SlotLike } from "../host/globals";

type SlotMap = Record<string, SlotLike | null | undefined>;

const byEntity = new Map<string, SlotMap>();
let epoch = 0;

export function isStandExtraTradeSlot(name: string): boolean {
  if (name.indexOf("trade") !== 0) return false;
  const num = parseInt(name.replace("trade", ""), 10);
  return Number.isFinite(num) && num >= 5;
}

function cloneSlot(slot: SlotLike | null | undefined): SlotLike | null {
  if (!slot) return null;
  return Object.assign({}, slot);
}

/** Bumps when memory changes so TradeGrid can invalidate its memo. */
export function standTradeMemoryEpoch(): number {
  return epoch;
}

function bumpEpoch(): void {
  epoch += 1;
}

/** Snapshot trade5+ while the stand is open (called each UI pass). */
export function rememberStandTradeSlots(
  entityId: string,
  slots: SlotMap | null | undefined,
): void {
  if (!entityId || !slots) return;
  const snap: SlotMap = {};
  let changed = false;
  const prev = byEntity.get(entityId) || null;
  const keys = Object.keys(slots);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!isStandExtraTradeSlot(k)) continue;
    snap[k] = cloneSlot(slots[k]);
  }
  if (!prev) {
    changed = Object.keys(snap).length > 0;
  } else {
    const prevKeys = Object.keys(prev);
    const snapKeys = Object.keys(snap);
    if (prevKeys.length !== snapKeys.length) changed = true;
    else {
      for (let i = 0; i < snapKeys.length; i++) {
        const k = snapKeys[i];
        const a = prev[k];
        const b = snap[k];
        if (!a && !b) continue;
        if (!a || !b || a.name !== b.name || a.price !== b.price || a.q !== b.q) {
          changed = true;
          break;
        }
      }
    }
  }
  byEntity.set(entityId, snap);
  if (changed) bumpEpoch();
}

/** Drop one stand slot after a local delist while the stand is closed. */
export function forgetStandTradeSlot(entityId: string, slotName: string): void {
  if (!entityId || !isStandExtraTradeSlot(slotName)) return;
  const snap = byEntity.get(entityId);
  if (!snap || !Object.prototype.hasOwnProperty.call(snap, slotName)) return;
  delete snap[slotName];
  bumpEpoch();
}

/**
 * Live slots, plus remembered trade5+ when the stand is closed so listings
 * remain visible for the watched character.
 */
export function mergeStandTradeSlotsForUi(
  entityId: string,
  slots: SlotMap | null | undefined,
  standOpen: boolean,
): SlotMap | null | undefined {
  if (!slots) return slots;
  if (standOpen) {
    rememberStandTradeSlots(entityId, slots);
    return slots;
  }
  const snap = byEntity.get(entityId);
  if (!snap) return slots;
  const out: SlotMap = Object.assign({}, slots);
  const keys = Object.keys(snap);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (Object.prototype.hasOwnProperty.call(out, k)) continue;
    out[k] = cloneSlot(snap[k]);
  }
  return out;
}

/**
 * Listing visible from stand memory while live server sync omits trade5+.
 * Used to skip client-side slot guards before unequip on a closed stand.
 */
export function isHiddenStandTradeListing(
  slotName: string,
  slotListing: SlotLike | null | undefined,
  liveSlots: SlotMap | null | undefined,
): boolean {
  if (!slotListing?.name || !isStandExtraTradeSlot(slotName)) return false;
  const live = liveSlots?.[slotName];
  return !live?.name;
}

/** Skip `character.slots` pre-check when UI has a listing live sync dropped. */
export function shouldSkipLiveTradeSlotGuard(
  slotName: string,
  slotListing: SlotLike | null | undefined,
  liveSlots: SlotMap | null | undefined,
): boolean {
  return isHiddenStandTradeListing(slotName, slotListing, liveSlots);
}

/** Reprice relists on trade5+ — server requires an open stand. */
export function canRepriceTradeSlot(
  slotName: string,
  slotListing: SlotLike | null | undefined,
  liveSlots: SlotMap | null | undefined,
  standOpen: boolean,
): boolean {
  if (!slotListing?.name) return false;
  if (
    isHiddenStandTradeListing(slotName, slotListing, liveSlots) &&
    !standOpen
  ) {
    return false;
  }
  return true;
}
