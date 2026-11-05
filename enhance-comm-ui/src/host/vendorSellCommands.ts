/**
 * Sell bag items to an NPC vendor via o:command (`sell(slot[, qty])`).
 * With computer/supercomputer in the observed bag: sell in place (no travel).
 * Otherwise smart_moves to the nearest gold merchant from G map data
 * (`role === "merchant"` with stock — e.g. Gabriel / basics).
 */

import { emitObserverCommand, getG } from "./al";
import { buildEnsureStationJs } from "./stationCommands";
import { commLogText, wrapCommandScript } from "./commandScript";
import { resolveInvSlotJs } from "./gearCommands";
import { refreshObservedInventory } from "./inventory";
import type { ItemFingerprint, MailItem } from "./mail/types";
import {
  findVendorSellStation,
  observingHasComputer,
  type StationCoords,
} from "../lib/stationAccess";
import { vendorGoldPrice } from "../lib/tradeItemPricing";
import type { EntityLike } from "./globals";

function lit(value: string): string {
  return JSON.stringify(String(value));
}

function scheduleBagRefresh(): void {
  const delays = [1200, 4000, 10000];
  for (let i = 0; i < delays.length; i++) {
    window.setTimeout(() => {
      try {
        refreshObservedInventory();
      } catch {
        /* best-effort */
      }
    }, delays[i]);
  }
}

/**
 * Nearest usable NPC gold shop from G + observer map position.
 * Not Angel (citizen4) — Angel is a citizen, not a merchant.
 */
export function defaultVendorSellStation(
  G?: ReturnType<typeof getG>,
  entity?: EntityLike | null,
): StationCoords | null {
  return findVendorSellStation(G || getG(), entity);
}

export function itemIsLocked(item: MailItem | null | undefined): boolean {
  if (!item) return false;
  const lock = item.l;
  return lock != null && lock !== false && lock !== 0;
}

export function itemIsCash(itemName: string): boolean {
  const name = String(itemName || "").trim();
  if (!name) return false;
  const G = getG();
  const def = G && G.items && G.items[name];
  return !!(def && (def as { cash?: unknown }).cash);
}

/** True when the bag stack can be sold to an NPC for gold. */
export function canVendorSellItem(
  fp: ItemFingerprint,
  item?: MailItem | null,
): boolean {
  if (!fp || !fp.name) return false;
  if (itemIsLocked(item)) return false;
  if (itemIsCash(fp.name)) return false;
  const unit = vendorGoldPrice(fp.name, fp.level);
  return unit != null && unit > 0;
}

export function buildVendorSellScript(
  fp: ItemFingerprint,
  quantity: number,
  station?: StationCoords | null,
): string {
  const qty = Number(quantity) | 0;
  if (qty <= 0) {
    return wrapCommandScript(
      `game_log(${lit(commLogText("vendor-sell aborted — invalid quantity"))});`,
    );
  }
  // Computer sells anywhere — do not emit smart_move at all.
  const dest =
    station !== undefined
      ? station
      : observingHasComputer()
        ? null
        : defaultVendorSellStation(getG());
  const sellCall =
    qty === 1 ? `await sell(__slot)` : `await sell(__slot,${qty})`;
  const okLabel = commLogText(
    "vendor-sell ok · " + fp.name + (qty > 1 ? " ×" + qty : ""),
  );
  const via =
    dest == null
      ? "computer"
      : dest.id
        ? String(dest.id)
        : "merchant";
  return wrapCommandScript(
    [
      buildEnsureStationJs(dest),
      resolveInvSlotJs(fp),
      `if(it&&it.l){game_log(${lit(commLogText("vendor-sell aborted — locked"))});return;}`,
      `try{${sellCall};game_log(${lit(okLabel + " · " + via)});}`,
      `catch(__e){game_log(${lit(commLogText("vendor-sell failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
    ].join(""),
  );
}

/** Instruct observed character to sell bag item → NPC vendor gold. */
export function vendorSellCommand(
  fp: ItemFingerprint,
  quantity: number,
): boolean {
  const script = buildVendorSellScript(fp, quantity);
  const ok = emitObserverCommand(
    script,
    `vendor-sell ${fp.name}` + (quantity > 1 ? ` ×${quantity}` : ""),
  );
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}
