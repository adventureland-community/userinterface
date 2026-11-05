/**
 * Highlight bag slots that feed the open Upgrade / Compound shrine dialog,
 * plus the per-character lucky slot (always, from prefs).
 */

import { resolveLuckySlotForShrine } from "../../lib/luckyUpgradePrefs";

const HOST_ID = "bottomleftcorner";
export const SHRINE_BAG_PICK_CLASS = "is-ecu-shrine-pick";
export const SHRINE_BAG_LUCKY_CLASS = "is-ecu-shrine-lucky";
/** Lucky cell with no real item — large centered clover. */
export const SHRINE_BAG_LUCKY_EMPTY_CLASS = "is-ecu-shrine-lucky-empty";

let activeSlots: number[] = [];
/**
 * Dialog live preview. `undefined` = use persisted prefs for the observed char.
 */
let luckyOverride: number | null | undefined = undefined;

function bagSlotIsEmpty(slot: number): boolean {
  try {
    const obs = window.observing as
      | { items?: Array<{ name?: string } | null | undefined> }
      | null
      | undefined;
    const items = obs && Array.isArray(obs.items) ? obs.items : null;
    if (!items || slot < 0 || slot >= items.length) return true;
    const it = items[slot];
    return !it || !it.name || it.name === "placeholder";
  } catch {
    return true;
  }
}

function uniqueSlots(slots: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    const n = Number(slots[i]);
    if (!Number.isFinite(n) || n < 0) continue;
    const slot = n | 0;
    if (seen.has(slot)) continue;
    seen.add(slot);
    out.push(slot);
  }
  return out;
}

function resolvedLuckySlot(): number | null {
  if (luckyOverride !== undefined) {
    if (luckyOverride == null || !Number.isFinite(luckyOverride) || luckyOverride < 0) {
      return null;
    }
    return luckyOverride | 0;
  }
  return resolveLuckySlotForShrine();
}

/** Re-stamp highlight classes on the live inventory grid. */
export function applyShrineBagHighlights(): void {
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  const want = new Set(activeSlots);
  const luckySlot = resolvedLuckySlot();
  const nodes = host.querySelectorAll("[data-cnum]");
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLElement;
    const raw = node.getAttribute("data-cnum");
    if (raw == null || raw === "") {
      node.classList.remove(SHRINE_BAG_PICK_CLASS);
      node.classList.remove(SHRINE_BAG_LUCKY_CLASS);
      node.classList.remove(SHRINE_BAG_LUCKY_EMPTY_CLASS);
      continue;
    }
    const num = parseInt(raw, 10);
    if (want.has(num)) node.classList.add(SHRINE_BAG_PICK_CLASS);
    else node.classList.remove(SHRINE_BAG_PICK_CLASS);
    if (luckySlot != null && num === luckySlot) {
      node.classList.add(SHRINE_BAG_LUCKY_CLASS);
      if (bagSlotIsEmpty(num)) node.classList.add(SHRINE_BAG_LUCKY_EMPTY_CLASS);
      else node.classList.remove(SHRINE_BAG_LUCKY_EMPTY_CLASS);
    } else {
      node.classList.remove(SHRINE_BAG_LUCKY_CLASS);
      node.classList.remove(SHRINE_BAG_LUCKY_EMPTY_CLASS);
    }
  }
}

/** Replace the set of shrine-selected bag slots and refresh the grid. */
export function setShrineBagHighlights(slots: number[]): void {
  activeSlots = uniqueSlots(slots);
  applyShrineBagHighlights();
}

/**
 * Live lucky outline while the shrine dialog edits prefs.
 * Pass `null` to hide; omit restore-from-prefs via `clearShrineBagHighlights`.
 */
export function setShrineLuckySlotHighlight(slot: number | null): void {
  if (slot == null || !Number.isFinite(slot) || slot < 0) {
    luckyOverride = null;
  } else {
    luckyOverride = slot | 0;
  }
  applyShrineBagHighlights();
}

/** Drop shrine pick highlights; lucky mark returns to persisted prefs. */
export function clearShrineBagHighlights(): void {
  activeSlots = [];
  luckyOverride = undefined;
  applyShrineBagHighlights();
}

export function getShrineBagHighlights(): readonly number[] {
  return activeSlots;
}

export function getShrineLuckySlotHighlight(): number | null {
  return resolvedLuckySlot();
}
