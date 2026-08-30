/**
 * Equip / unequip / inventory swap on the observed character via o:command.
 */

import { emitObserverCommand } from "./al";
import { wrapCommandScript } from "./commandScript";
import { refreshObservedInventory } from "./inventory";
import { findFingerprintSlot } from "./mail/itemFingerprint";
import type { ItemFingerprint, MailItem } from "./mail/types";
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
    `if(__slot<0){game_log(${lit("Gear command aborted — item mismatch")});return;}`,
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

export function buildInvSwapScript(a: number, b: number): string {
  const ai = Number(a) | 0;
  const bi = Number(b) | 0;
  return wrapCommandScript(
    [
      `if(${ai}<0||${bi}<0||${ai}>=character.items.length||${bi}>=character.items.length){`,
      `game_log("Swap aborted — invalid slot");return;}`,
      `try{await swap(${ai},${bi});}catch(__e){`,
      `game_log("Swap failed → "+${ai}+"↔"+${bi});`,
      `}`,
    ].join(""),
  );
}

function patchObservingAfterInvSwap(a: number, b: number): void {
  const obs = window.observing as { items?: Array<unknown> } | null | undefined;
  if (!obs || !Array.isArray(obs.items)) return;
  const ai = Number(a) | 0;
  const bi = Number(b) | 0;
  if (
    ai < 0 ||
    bi < 0 ||
    ai >= obs.items.length ||
    bi >= obs.items.length
  ) {
    return;
  }
  const tmp = obs.items[ai];
  obs.items[ai] = obs.items[bi];
  obs.items[bi] = tmp;
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
  const ok = emitObserverCommand(script);
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
  const ok = emitObserverCommand(script);
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
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  patchObservingAfterInvSwap(a, b);
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
