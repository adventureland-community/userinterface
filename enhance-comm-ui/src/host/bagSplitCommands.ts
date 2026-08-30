/**
 * Split a stackable bag item on the observed character via o:command.
 * Mirrors stock inventory_middle / split(num, quantity).
 */

import { emitObserverCommand, getG } from "./al";
import { wrapCommandScript } from "./commandScript";
import { resolveInvSlotJs } from "./gearCommands";
import { refreshObservedInventory } from "./inventory";
import type { ItemFingerprint } from "./mail/types";
import {
  quickSplitPresetFromModifiers,
  resolveQuickSplitQuantity,
  type SplitModifierKeys,
} from "../lib/bagSplitMath";

function scheduleBagRefresh(): void {
  window.setTimeout(() => {
    try {
      refreshObservedInventory();
    } catch {
      /* best-effort */
    }
  }, 900);
}

/** Max quantity you can peel off into a new stack (stock get_input range). */
export function maxSplitQuantity(fp: ItemFingerprint): number {
  const q = fp.q != null && Number(fp.q) > 1 ? Number(fp.q) | 0 : 0;
  if (q < 2) return 0;
  const G = getG();
  const def = G && G.items && fp.name ? G.items[fp.name] : undefined;
  const stackCap =
    def && def.s != null && Number(def.s) > 0 ? Number(def.s) | 0 : 1;
  const max = Math.min(stackCap, q - 1);
  return max > 0 ? max : 0;
}

export function buildSplitScript(
  fp: ItemFingerprint,
  quantity: number,
): string {
  const qty = Number(quantity) | 0;
  if (qty <= 0) {
    return wrapCommandScript(`game_log("Split aborted — invalid quantity");`);
  }
  return wrapCommandScript(
    [
      resolveInvSlotJs(fp),
      `if(!it||!(it.q>1)){game_log("Split aborted — not a stack");return;}`,
      `try{await split(__slot,${qty});}catch(__e){`,
      `game_log("Split failed"+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function splitBagCommand(fp: ItemFingerprint, quantity: number): void {
  emitObserverCommand(buildSplitScript(fp, quantity), `bag-split ${fp.name}`);
  scheduleBagRefresh();
}

/** Instant split when a modifier preset is held (middle-click shortcuts). */
export function tryQuickSplitFromModifiers(
  fp: ItemFingerprint,
  ev: SplitModifierKeys,
): boolean {
  const preset = quickSplitPresetFromModifiers(ev);
  if (!preset) return false;
  const maxPeel = maxSplitQuantity(fp);
  const totalQ = fp.q != null && Number(fp.q) > 1 ? Number(fp.q) | 0 : 0;
  const q = resolveQuickSplitQuantity(totalQ, maxPeel, preset);
  if (q == null) return false;
  splitBagCommand(fp, q);
  return true;
}
