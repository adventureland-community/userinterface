/**
 * Trade row / merchant stand actions on the observed character via o:command.
 */

import { emitObserverCommand, getG } from "./al";
import { wrapCommandScript } from "./commandScript";
import { resolveInvSlotJs } from "./gearCommands";
import { refreshObservedInventory } from "./inventory";
import { defaultTradePrice, rememberTradePrice } from "../lib/tradePriceMemory";
import type { ItemFingerprint } from "./mail/types";
import type { SlotLike } from "./globals";
import {
  canRepriceTradeSlot,
  shouldSkipLiveTradeSlotGuard,
} from "../lib/standTradeSlotMemory";

function lit(value: string): string {
  return JSON.stringify(String(value));
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

export function buildTradeListScript(
  fp: ItemFingerprint,
  tradeSlot: string,
  price: number,
  q?: number,
): string {
  const slot = String(tradeSlot || "").trim();
  const gold = Number(price) | 0;
  const qty = q != null ? Number(q) | 0 : 1;
  if (!slot || !isTradeSlotName(slot)) {
    return wrapCommandScript(`game_log("Trade list aborted — invalid slot");`);
  }
  if (gold <= 0) {
    return wrapCommandScript(`game_log("Trade list aborted — invalid price");`);
  }
  return wrapCommandScript(
    [
      resolveInvSlotJs(fp),
      `if(character.slots[${lit(slot)}]){game_log(${lit("Trade list failed — slot not empty")});return;}`,
      `try{await trade(${lit(slot)},__slot,${gold},${qty > 0 ? qty : 1});}catch(__e){`,
      `game_log(${lit("Trade list failed → " + slot)}+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildTradeShowScript(): string {
  return wrapCommandScript(`socket.emit("trade",{event:"show"});`);
}

export function buildTradeHideScript(): string {
  return wrapCommandScript(`socket.emit("trade",{event:"hide"});`);
}

export function buildMerchantCloseScript(): string {
  return wrapCommandScript(
    [
      `try{await close_merchant();}catch(__e){`,
      `game_log("Close merchant failed"+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildMerchantOpenScript(invSlot?: number): string {
  if (invSlot != null && Number(invSlot) >= 0) {
    const slot = Number(invSlot) | 0;
    return wrapCommandScript(
      [
        `if(${slot}<0||!character.items[${slot}]){game_log("Open stand failed — invalid slot");return;}`,
        `try{await open_merchant(${slot});}catch(__e){`,
        `game_log("Open merchant failed"+(__e&&__e.reason?(" · "+__e.reason):""));`,
        `}`,
      ].join(""),
    );
  }
  return wrapCommandScript(
    [
      `var __num=-1;`,
      `for(var __si=0;__si<character.items.length;__si++){`,
      `var __it=character.items[__si];`,
      `if(!__it||!__it.name)continue;`,
      `var __def=G.items[__it.name];`,
      `if(__def&&(__def.stand||__def.type==="stand")){__num=__si;break;}`,
      `}`,
      `if(__num<0){game_log("No merchant stand in bag");return;}`,
      `try{await open_merchant(__num);}catch(__e){`,
      `game_log("Open merchant failed"+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildWishlistScript(
  tradeSlot: string,
  itemName: string,
  price: number,
  q?: number,
  level?: number,
): string {
  const slot = normalizeTradeSlot(tradeSlot);
  const name = String(itemName || "").trim();
  const gold = Number(price) | 0;
  const qty = q != null ? Number(q) | 0 : 1;
  const lvl = level != null ? Number(level) | 0 : 0;
  if (!slot || !name) {
    return wrapCommandScript(`game_log("Wishlist aborted — missing slot or item");`);
  }
  if (gold <= 0) {
    return wrapCommandScript(`game_log("Wishlist aborted — invalid price");`);
  }
  return wrapCommandScript(
    [
      `if(character.slots[${lit(slot)}]){game_log(${lit("Wishlist failed — slot not empty")});return;}`,
      `try{await wishlist(${lit(slot)},${lit(name)},${gold},${qty > 0 ? qty : 1},${lvl});}catch(__e){`,
      `game_log(${lit("Wishlist failed → " + slot)}+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildTradePurchaseScript(
  targetId: string,
  tradeSlot: string,
  rid: string,
  quantity: number,
): string {
  const id = String(targetId || "").trim();
  const slot = normalizeTradeSlot(tradeSlot);
  const listingRid = String(rid || "").trim();
  const q = Number(quantity) | 0;
  if (!id || !slot || !listingRid) {
    return wrapCommandScript(`game_log("Buy failed — missing target or listing");`);
  }
  if (q <= 0) {
    return wrapCommandScript(`game_log("Buy failed — invalid quantity");`);
  }
  return wrapCommandScript(
    [
      `var __id=${lit(id)};`,
      `var __slot=${lit(slot)};`,
      `var __rid=${lit(listingRid)};`,
      `var __q=${q};`,
      `var __target=parent.entities[__id];`,
      `if(!__target||!__target.slots||!__target.slots[__slot]){game_log("Buy failed — listing gone");return;}`,
      `var __listing=__target.slots[__slot];`,
      `if(__listing.b){game_log("Buy failed — slot is a buy order");return;}`,
      `if(__listing.rid!==__rid){game_log("Buy failed — listing changed");return;}`,
      `try{socket.emit("trade_buy",{id:__id,slot:__slot,rid:__rid,q:String(__q)});}catch(__e){`,
      `game_log("Buy failed"+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildTradeFulfillScript(
  targetId: string,
  tradeSlot: string,
  rid: string,
  quantity: number,
): string {
  const id = String(targetId || "").trim();
  const slot = normalizeTradeSlot(tradeSlot);
  const listingRid = String(rid || "").trim();
  const q = Number(quantity) | 0;
  if (!id || !slot || !listingRid) {
    return wrapCommandScript(`game_log("Fulfill failed — missing target or listing");`);
  }
  if (q <= 0) {
    return wrapCommandScript(`game_log("Fulfill failed — invalid quantity");`);
  }
  return wrapCommandScript(
    [
      `var __id=${lit(id)};`,
      `var __slot=${lit(slot)};`,
      `var __rid=${lit(listingRid)};`,
      `var __q=${q};`,
      `var __target=parent.entities[__id];`,
      `if(!__target||!__target.slots||!__target.slots[__slot]){game_log("Fulfill failed — listing gone");return;}`,
      `var __listing=__target.slots[__slot];`,
      `if(!__listing.b){game_log("Fulfill failed — not a buy order");return;}`,
      `if(__listing.rid!==__rid){game_log("Fulfill failed — listing changed");return;}`,
      `var __have=false;`,
      `for(var __si=0;__si<character.items.length;__si++){`,
      `var __it=character.items[__si];`,
      `if(!__it||__it.name!==__listing.name)continue;`,
      `if(__listing.level!=null&&(__it.level||0)!==__listing.level)continue;`,
      `__have=true;break;`,
      `}`,
      `if(!__have){game_log("Fulfill failed — no matching item in bag");return;}`,
      `try{socket.emit("trade_sell",{id:__id,slot:__slot,rid:__rid,q:__q});}catch(__e){`,
      `game_log("Fulfill failed"+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildJoinGiveawayScript(
  targetId: string,
  tradeSlot: string,
  rid: string,
): string {
  const id = String(targetId || "").trim();
  const slot = normalizeTradeSlot(tradeSlot);
  const listingRid = String(rid || "").trim();
  if (!id || !slot || !listingRid) {
    return wrapCommandScript(`game_log("Giveaway join failed — missing target");`);
  }
  return wrapCommandScript(
    [
      `try{socket.emit("join_giveaway",{id:${lit(id)},slot:${lit(slot)},rid:${lit(listingRid)}});}catch(__e){`,
      `game_log("Giveaway join failed"+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

export function buildGiveawayScript(
  tradeSlot: string,
  fp: ItemFingerprint,
  minutes: number,
  q?: number,
): string {
  const slot = normalizeTradeSlot(tradeSlot);
  const mins = Number(minutes) | 0;
  const qty = q != null ? Number(q) | 0 : 1;
  if (!slot) {
    return wrapCommandScript(`game_log("Giveaway aborted — invalid slot");`);
  }
  if (mins <= 0) {
    return wrapCommandScript(`game_log("Giveaway aborted — invalid duration");`);
  }
  return wrapCommandScript(
    [
      resolveInvSlotJs(fp),
      `if(character.slots[${lit(slot)}]){game_log(${lit("Giveaway failed — slot not empty")});return;}`,
      `try{await giveaway(${lit(slot)},__slot,${qty > 0 ? qty : 1},${mins});}catch(__e){`,
      `game_log(${lit("Giveaway failed → " + slot)}+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

function tradeListingSnapshotJs(snapshot: SlotLike): string {
  const o: Record<string, unknown> = { name: snapshot.name };
  if (snapshot.q != null) o.q = snapshot.q;
  if (snapshot.level != null) o.level = snapshot.level;
  if (snapshot.b) o.b = true;
  if (snapshot.p != null) o.p = snapshot.p;
  return JSON.stringify(o);
}

export function buildTradeRepriceScript(
  tradeSlot: string,
  newPrice: number,
  listingSnapshot?: SlotLike | null,
): string {
  const slot = normalizeTradeSlot(tradeSlot);
  const gold = Number(newPrice) | 0;
  if (!slot) {
    return wrapCommandScript(`game_log("Reprice aborted — invalid slot");`);
  }
  if (gold <= 0) {
    return wrapCommandScript(`game_log("Reprice aborted — invalid price");`);
  }
  const listedInit = listingSnapshot?.name
    ? `var __listed=${tradeListingSnapshotJs(listingSnapshot)};`
    : `var __listed=character.slots[__slot];`;
  return wrapCommandScript(
    [
      `var __slot=${lit(slot)};`,
      `var __price=${gold};`,
      listedInit,
      `if(!__listed||!__listed.name){game_log("Reprice failed — slot empty");return;}`,
      `var __name=__listed.name;`,
      `var __q=__listed.q||1;`,
      `var __level=__listed.level||0;`,
      `var __p=__listed.p||null;`,
      `var __wish=!!__listed.b;`,
      `try{await unequip(__slot);}catch(__e){`,
      `game_log("Reprice failed (delist)"+(__e&&__e.reason?(" · "+__e.reason):""));return;`,
      `}`,
      `if(__wish){`,
      `try{await wishlist(__slot,__name,__price,__q,__level);}catch(__e){`,
      `game_log("Reprice failed (wishlist)"+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
      `}else{`,
      `var __num=-1;`,
      `for(var __si=0;__si<character.items.length;__si++){`,
      `var __it=character.items[__si];`,
      `if(!__it||__it.name!==__name||__it.b)continue;`,
      `if((__it.level||0)!==__level)continue;`,
      `if(__p&&__it.p!==__p)continue;`,
      `if(!__p&&__it.p)continue;`,
      `__num=__si;break;`,
      `}`,
      `if(__num<0){game_log("Reprice failed — item not in bag after delist");return;}`,
      `try{await trade(__slot,__num,__price,__q);}catch(__e){`,
      `game_log("Reprice failed (relist)"+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
      `}`,
    ].join(""),
  );
}

function normalizeTradeSlot(slot: string): string {
  const s = String(slot || "").trim();
  if (!s) return "";
  if (s.indexOf("trade") === 0) return s;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? "trade" + n : s;
}

function isStandItemName(name: string): boolean {
  const G = getG();
  const def = G && G.items && G.items[name];
  if (!def) return false;
  const d = def as { type?: string; stand?: string | boolean };
  return d.type === "stand" || !!d.stand;
}

/** First bag slot holding a merchant stand item, if any. */
export function merchantStandInvSlot(
  items: Array<{ name?: string } | null | undefined> | null | undefined,
): number | null {
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || !it.name || it.name === "placeholder") continue;
    if (isStandItemName(it.name)) return i;
  }
  return null;
}

function isTradeSlotName(slot: string): boolean {
  return slot.indexOf("trade") === 0;
}

export function wishlistCommand(
  tradeSlot: string,
  itemName: string,
  price: number,
  q?: number,
  level?: number,
): boolean {
  const script = buildWishlistScript(tradeSlot, itemName, price, q, level);
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  rememberTradePrice(itemName, price, q ?? 1);
  scheduleBagRefresh();
  return true;
}

export function joinGiveawayCommand(
  targetId: string,
  tradeSlot: string,
  rid: string,
): boolean {
  const script = buildJoinGiveawayScript(targetId, tradeSlot, rid);
  return emitObserverCommand(script);
}

export function giveawayCommand(
  tradeSlot: string,
  fp: ItemFingerprint,
  minutes: number,
  q?: number,
): boolean {
  const script = buildGiveawayScript(tradeSlot, fp, minutes, q);
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function tradePurchaseCommand(
  targetId: string,
  tradeSlot: string,
  rid: string,
  quantity: number,
): boolean {
  const script = buildTradePurchaseScript(targetId, tradeSlot, rid, quantity);
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function tradeFulfillCommand(
  targetId: string,
  tradeSlot: string,
  rid: string,
  quantity: number,
): boolean {
  const script = buildTradeFulfillScript(targetId, tradeSlot, rid, quantity);
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function tradeRepriceCommand(
  tradeSlot: string,
  newPrice: number,
  listingSnapshot?: SlotLike | null,
): boolean {
  const obs = window.observing as
    | {
        id?: string | number;
        slots?: Record<string, SlotLike | null | undefined>;
        stand?: boolean | string;
      }
    | null
    | undefined;
  const listed =
    listingSnapshot ??
    (obs && obs.slots
      ? (obs.slots[tradeSlot] as SlotLike | null | undefined)
      : null);
  if (
    !canRepriceTradeSlot(
      tradeSlot,
      listed,
      obs?.slots,
      !!obs?.stand,
    )
  ) {
    window.alert(
      "Open your merchant stand to change prices on stand slots (trade5+).",
    );
    return false;
  }
  const script = buildTradeRepriceScript(
    tradeSlot,
    newPrice,
    shouldSkipLiveTradeSlotGuard(tradeSlot, listed, obs?.slots)
      ? listed
      : undefined,
  );
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  if (listed?.name) {
    rememberTradePrice(listed.name, newPrice, listed.q ?? 1);
  }
  scheduleBagRefresh();
  return true;
}

export function tradeListCommand(
  fp: ItemFingerprint,
  tradeSlot: string,
  price: number,
  q?: number,
): boolean {
  const script = buildTradeListScript(fp, tradeSlot, price, q);
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  rememberTradePrice(fp.name, price, q ?? fp.q ?? 1);
  scheduleBagRefresh();
  return true;
}

export function tradeShowCommand(): boolean {
  return emitObserverCommand(buildTradeShowScript());
}

export function tradeHideCommand(): boolean {
  return emitObserverCommand(buildTradeHideScript());
}

export function merchantCloseCommand(): boolean {
  const ok = emitObserverCommand(buildMerchantCloseScript());
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function merchantOpenCommand(invSlot?: number): boolean {
  const script = buildMerchantOpenScript(invSlot);
  const ok = emitObserverCommand(script);
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

/** Optional level for wishlist on upgrade/compound catalog items. */
export function promptWishlistLevel(itemName: string): number | null {
  const G = getG();
  const def = G && G.items && G.items[itemName];
  const d = def as { upgrade?: boolean; compound?: boolean } | undefined;
  if (!d || (!d.upgrade && !d.compound)) return 0;
  const raw = window.prompt(
    `Wishlist level for ${itemName} (0–12, compound max 7):`,
    "0",
  );
  if (raw == null || String(raw).trim() === "") return null;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > 12) {
    window.alert("Enter a level from 0 to 12.");
    return null;
  }
  return n;
}

/** Quantity prompt for buying or fulfilling stackable trade listings. */
export function promptTradeQuantity(
  maxQ?: number,
  itemName?: string,
): number | null {
  const cap =
    maxQ != null && Number(maxQ) > 0 ? Number(maxQ) | 0 : undefined;
  const hint = itemName
    ? cap != null
      ? `Quantity for ${itemName} (1–${cap}):`
      : `Quantity for ${itemName}:`
    : cap != null
      ? `Quantity (1–${cap}):`
      : "Quantity:";
  const raw = window.prompt(hint, "1");
  if (raw == null || String(raw).trim() === "") return null;
  const n = parseInt(String(raw).replace(/,/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) {
    window.alert("Enter a positive quantity.");
    return null;
  }
  if (cap != null && n > cap) {
    window.alert(`Maximum quantity is ${cap}.`);
    return null;
  }
  return n;
}

/** Duration prompt for listing a giveaway on a trade slot. */
export function promptGiveawayMinutes(defaultMins = 60): number | null {
  const raw = window.prompt(
    "Giveaway duration in minutes:",
    String(defaultMins > 0 ? defaultMins : 60),
  );
  if (raw == null || String(raw).trim() === "") return null;
  const n = parseInt(String(raw).replace(/,/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) {
    window.alert("Enter a positive number of minutes.");
    return null;
  }
  return n;
}

/** Simple gold price prompt for listing items on trade slots. */
export function promptTradePrice(itemName?: string): number | null {
  const hint = itemName
    ? `List ${itemName} — price in gold:`
    : "List item — price in gold:";
  const raw = window.prompt(hint, itemName ? defaultTradePrice(itemName) : "");
  if (raw == null || String(raw).trim() === "") return null;
  const n = parseInt(String(raw).replace(/,/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) {
    window.alert("Enter a positive gold amount.");
    return null;
  }
  return n;
}
