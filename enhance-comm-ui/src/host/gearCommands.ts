/**
 * Equip / unequip / inventory swap on the observed character via o:command.
 */

import { emitObserverCommand } from "./al";
import { commLogText, wrapCommandScript } from "./commandScript";
import { refreshObservedInventory } from "./inventory";
import { findFingerprintSlot } from "./mail/itemFingerprint";
import type { ItemFingerprint, MailItem } from "./mail/types";
import { canStackItems, type StackableItemLike } from "../lib/itemStack";
import { forgetStandTradeSlot, shouldSkipLiveTradeSlotGuard } from "../lib/standTradeSlotMemory";
import { isTradeSlot } from "../lib/tradeSlots";
import type { SlotLike } from "./globals";

function lit(value: string): string {
  return JSON.stringify(String(value));
}

function fingerprintCheckJs(fp: ItemFingerprint, varName: string): string {
  const parts = [`!${varName}`, `${varName}.name!==${lit(fp.name)}`];
  if (fp.level != null) parts.push(`${varName}.level!==${fp.level}`);
  if (fp.q != null) parts.push(`${varName}.q!==${fp.q}`);
  if (fp.p != null) parts.push(`${varName}.p!==${lit(fp.p)}`);
  return parts.join("||");
}

export function resolveInvSlotJs(fp: ItemFingerprint): string {
  const preferSlot = Number(fp.slot) | 0;
  const mismatch = fingerprintCheckJs(fp, "it");
  const candMismatch = fingerprintCheckJs(fp, "__cand");
  return [
    `var __slot=${preferSlot};`,
    `var it=character.items[__slot];`,
    `if(${mismatch}){`,
    `__slot=-1;`,
    `for(var __si=0;__si<character.items.length;__si++){`,
    `var __cand=character.items[__si];`,
    `if(!(${candMismatch})){__slot=__si;break;}`,
    `}`,
    `if(__slot<0){game_log(${JSON.stringify(commLogText("gear · item mismatch"))});return;}`,
    `it=character.items[__slot];`,
    `}`,
  ].join("");
}

function scheduleBagRefresh(): void {
  window.setTimeout(() => {
    try {
      refreshObservedInventory();
    } catch {
      /* best-effort */
    }
  }, 900);
}

export function buildEquipScript(
  fp: ItemFingerprint,
  gearSlot?: string,
): string {
  const slot = gearSlot ? String(gearSlot).trim() : "";
  const slotArg = slot ? `,${lit(slot)}` : "";
  return wrapCommandScript(
    [
      resolveInvSlotJs(fp),
      `try{await equip(__slot${slotArg});}catch(__e){`,
      `game_log(${lit("Equip failed" + (slot ? " → " + slot : ""))}+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildUnequipScript(
  gearSlot: string,
  options?: { skipSlotGuard?: boolean },
): string {
  const slot = String(gearSlot || "").trim();
  if (!slot) {
    return wrapCommandScript(`game_log("Unequip aborted — no slot");`);
  }
  if (slot === "elixir") {
    return wrapCommandScript(`game_log("Cannot unequip elixir");`);
  }
  const guard = options?.skipSlotGuard
    ? ""
    : `if(!character.slots[${lit(slot)}]){game_log(${lit("Unequip failed — slot empty")});return;}`;
  return wrapCommandScript(
    [
      guard,
      `try{await unequip(${lit(slot)});}catch(__e){`,
      `game_log(${lit("Unequip failed → " + slot)}+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildInvSwapScript(fromSlot: number, toSlot: number): string {
  const from = Number(fromSlot) | 0;
  const to = Number(toSlot) | 0;
  return wrapCommandScript(
    [
      `if(${from}<0||${to}<0||${from}>=character.items.length||${to}>=character.items.length){`,
      `game_log("Swap aborted — invalid slot");return;}`,
      `try{await swap(${to},${from});}catch(__e){`,
      `game_log("Swap failed → "+${from}+"↔"+${to});`,
      `}`,
    ].join(""),
  );
}

function patchObservingAfterInvMove(fromSlot: number, toSlot: number): void {
  const obs = window.observing as { items?: Array<unknown> } | null | undefined;
  if (!obs || !Array.isArray(obs.items)) return;
  const from = Number(fromSlot) | 0;
  const to = Number(toSlot) | 0;
  if (
    from < 0 ||
    to < 0 ||
    from >= obs.items.length ||
    to >= obs.items.length
  ) {
    return;
  }
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const itemLo = obs.items[lo] as StackableItemLike | null;
  const itemHi = obs.items[hi] as StackableItemLike | null;

  if (canStackItems(itemLo, itemHi)) {
    const combinedQ = (itemLo?.q ?? 1) + (itemHi?.q ?? 1);
    const targetItem = obs.items[to] as StackableItemLike | null;
    if (targetItem) targetItem.q = combinedQ;
    obs.items[from] = null;
  } else {
    const tmp = obs.items[lo];
    obs.items[lo] = obs.items[hi];
    obs.items[hi] = tmp;
  }
  try {
    if (typeof window.render_inventory === "function") {
      window.render_inventory(true);
    }
  } catch {
    /* ignore */
  }
}

export function equipCommand(
  fp: ItemFingerprint,
  gearSlot?: string,
): boolean {
  const script = buildEquipScript(fp, gearSlot);
  const ok = emitObserverCommand(
    script,
    `equip ${gearSlot || fp.name}`,
  );
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function unequipCommand(
  gearSlot: string,
  options?: { slotListing?: SlotLike | null },
): boolean {
  const obs = window.observing as
    | { id?: string | number; slots?: Record<string, SlotLike | null | undefined> }
    | null
    | undefined;
  const skipSlotGuard = shouldSkipLiveTradeSlotGuard(
    gearSlot,
    options?.slotListing,
    obs?.slots,
  );
  const script = buildUnequipScript(gearSlot, { skipSlotGuard });
  const ok = emitObserverCommand(script, `unequip ${gearSlot}`);
  if (!ok) return false;
  if (isTradeSlot(gearSlot)) {
    const id = obs && obs.id != null ? String(obs.id) : "";
    if (id) forgetStandTradeSlot(id, gearSlot);
  }
  scheduleBagRefresh();
  return true;
}

export function invSwapCommand(a: number, b: number): boolean {
  const script = buildInvSwapScript(a, b);
  const ok = emitObserverCommand(script, `inv-swap ${a}↔${b}`);
  if (!ok) return false;
  patchObservingAfterInvMove(a, b);
  scheduleBagRefresh();
  return true;
}

/** True when fingerprint still resolves in observing.items. */
export function observedBagHasFingerprint(fp: ItemFingerprint): boolean {
  const obs = window.observing as
    | { items?: Array<MailItem | null | undefined> }
    | null
    | undefined;
  if (!obs || !Array.isArray(obs.items)) return false;
  return findFingerprintSlot(obs.items, fp, null) >= 0;
}
