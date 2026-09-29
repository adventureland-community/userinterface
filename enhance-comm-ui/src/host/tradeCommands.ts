/**
 * Trade row / merchant stand actions on the observed character via o:command.
 *
 * Snippets run under CODE (`runner_functions`), not parent `functions.js`.
 * Critical arg-order differences:
 * - CODE `trade(invNum, tradeSlot, price, qty)` vs parent `trade(slot, num, price, q)`
 * - CODE `wishlist(slot, name, price, level, qty)` vs parent `wishlist(slot, name, price, q, level)`
 */

import { emitObserverCommand, getG } from "./al";
import { commLogText, wrapCommandScript } from "./commandScript";
import { resolveInvSlotJs } from "./gearCommands";
import { refreshObservedInventory } from "./inventory";
import { rememberTradePrice } from "../lib/tradePriceMemory";
import type { ItemFingerprint } from "./mail/types";
import type { SlotLike } from "./globals";
import {
  canRepriceTradeSlot,
  shouldSkipLiveTradeSlotGuard,
} from "../lib/standTradeSlotMemory";

function lit(value: string): string {
  return JSON.stringify(String(value));
}

function commLit(message: string): string {
  return lit(commLogText(message));
}

/** Stock client: personal trade row open when trade1 key exists on character.slots. */
function tradeRowOpenJs(): string {
  return `(character.slots&&character.slots.trade1!==undefined)`;
}

/** CODE runner has get_socket(), not bare socket (see runner_functions.js). */
function tradeShowEmitJs(): string {
  return `var __sock=get_socket();if(__sock)__sock.emit("trade",{event:"show"});`;
}

function tradeHideEmitJs(): string {
  return `var __sock=get_socket();if(__sock)__sock.emit("trade",{event:"hide"});`;
}

function socketEmitJs(event: string, payloadExpr: string): string {
  return [
    `var __sock=get_socket();`,
    `if(!__sock){game_log(${commLit("trade · no socket")});return;}`,
    `__sock.emit(${lit(event)},${payloadExpr});`,
  ].join("");
}

/** Guard: slot has a listing (empty trade keys / null slots are OK). */
function tradeSlotOccupiedGuardJs(slotExpr: string, failMessage: string): string {
  return [
    `var __ts=${slotExpr};`,
    `var __occ=character.slots&&character.slots[__ts];`,
    `if(__occ&&__occ.name){game_log(${lit(failMessage)});return;}`,
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

function tradeSlotIndex(slot: string): number {
  const n = parseInt(String(slot).replace("trade", ""), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Ensure personal trade row / merchant stand is open before list-like commands. */
function tradeListPrefaceJs(tradeSlot: string): string {
  const idx = tradeSlotIndex(tradeSlot);
  const parts: string[] = [];
  if (idx >= 1 && idx <= 4) {
    parts.push(
      `if(!${tradeRowOpenJs()}){`,
      tradeShowEmitJs(),
      `for(var __tw=0;__tw<120;__tw++){`,
      `await sleep(50);`,
      `if(${tradeRowOpenJs()})break;`,
      `if(__tw===20||__tw===50||__tw===80||__tw===100){`,
      tradeShowEmitJs(),
      `}`,
      `}`,
      `}`,
      `if(!${tradeRowOpenJs()}){`,
      `game_log(${commLit("trade-list · could not open trade row")});return;`,
      `}`,
    );
  }
  if (idx >= 5) {
    parts.push(
      `if(!character.stand){game_log(${commLit("trade-list · open merchant stand for " + tradeSlot)});return;}`,
    );
  }
  return parts.join("");
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
    return wrapCommandScript(
      `game_log(${commLit("trade-list · invalid slot")});`,
    );
  }
  if (gold <= 0) {
    return wrapCommandScript(
      `game_log(${commLit("trade-list · invalid price")});`,
    );
  }
  return wrapCommandScript(
    [
      resolveInvSlotJs(fp),
      tradeListPrefaceJs(slot),
      tradeSlotOccupiedGuardJs(
        lit(slot),
        commLogText("trade-list · slot not empty"),
      ),
      // CODE API: trade(invNum, tradeSlot, price, quantity) — not parent.trade(slot, num, …)
      `try{await trade(__slot,${lit(slot)},${gold},${qty > 0 ? qty : 1});`,
      `game_log(${commLit("trade-list ok → " + slot)});`,
      `}catch(__e){`,
      `game_log(${commLit("trade-list failed → " + slot)}+(__e&&__e.reason?(" · "+__e.reason):""));`,
      `}`,
    ].join(""),
  );
}

/**
 * List a bag stack as an item-for-item trade offer (`trade_offer` / equip+want).
 * `want` is the ask; `offerQ` is how many of the bag stack go on the stand.
 */
export function buildTradeOfferScript(
  fp: ItemFingerprint,
  tradeSlot: string,
  want: { name: string; level?: number; p?: string | null; q?: number },
  offerQ?: number,
): string {
  const slot = String(tradeSlot || "").trim();
  const qty = offerQ != null ? Number(offerQ) | 0 : 1;
  const wantName = want && want.name ? String(want.name).trim() : "";
  if (!slot || !isTradeSlotName(slot)) {
    return wrapCommandScript(
      `game_log(${commLit("trade-offer · invalid slot")});`,
    );
  }
  if (!wantName) {
    return wrapCommandScript(
      `game_log(${commLit("trade-offer · missing want")});`,
    );
  }
  if (qty <= 0) {
    return wrapCommandScript(
      `game_log(${commLit("trade-offer · invalid quantity")});`,
    );
  }
  const wantObj: Record<string, unknown> = { name: wantName };
  if (want.level != null && want.level > 0) wantObj.level = want.level | 0;
  if (want.p != null && want.p !== "") wantObj.p = String(want.p);
  if (want.q != null && want.q > 0) wantObj.q = want.q | 0;
  const wantJson = JSON.stringify(wantObj);
  return wrapCommandScript(
    [
      resolveInvSlotJs(fp),
      tradeListPrefaceJs(slot),
      tradeSlotOccupiedGuardJs(
        lit(slot),
        commLogText("trade-offer · slot not empty"),
      ),
      `var __want=${wantJson};`,
      `var __oq=${qty};`,
      `if(typeof trade_offer==="function"){`,
      `try{trade_offer(${lit(slot)},__slot,__want,__oq);`,
      `game_log(${commLit("trade-offer ok → " + slot)});`,
      `}catch(__e){game_log(${commLit("trade-offer failed → " + slot)}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
      `}else{`,
      socketEmitJs(
        "equip",
        "{q:__oq,slot:" + lit(slot) + ",num:__slot,want:__want}",
      ),
      `game_log(${commLit("trade-offer emit → " + slot)});`,
      `}`,
    ].join(""),
  );
}

export function buildTradeShowScript(): string {
  return wrapCommandScript(tradeShowEmitJs());
}

export function buildTradeHideScript(): string {
  return wrapCommandScript(tradeHideEmitJs());
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
      tradeSlotOccupiedGuardJs(lit(slot), "Wishlist failed — slot not empty"),
      tradeListPrefaceJs(slot),
      // CODE API: wishlist(tradeSlot, name, price, level, quantity)
      `try{await wishlist(${lit(slot)},${lit(name)},${gold},${lvl},${qty > 0 ? qty : 1});}catch(__e){`,
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
      socketEmitJs("trade_buy", "{id:__id,slot:__slot,rid:__rid,q:String(__q)}"),
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
      socketEmitJs("trade_sell", "{id:__id,slot:__slot,rid:__rid,q:__q}"),
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
      socketEmitJs(
        "join_giveaway",
        `{id:${lit(id)},slot:${lit(slot)},rid:${lit(listingRid)}}`,
      ),
    ].join(""),
  );
}

/** Complete a live item-for-item stand offer (`trade_swap`). */
export function buildTradeSwapScript(
  targetId: string,
  tradeSlot: string,
  rid: string,
  bagSlot: number,
  item: { name?: string; level?: number; p?: string; q?: number },
): string {
  const id = String(targetId || "").trim();
  const slot = normalizeTradeSlot(tradeSlot);
  const listingRid = String(rid || "").trim();
  const num = Number(bagSlot) | 0;
  if (!id || !slot || !listingRid || num < 0) {
    return wrapCommandScript(`game_log("Trade swap failed — missing target or bag slot");`);
  }
  const itemJson = JSON.stringify(item || null);
  return wrapCommandScript(
    [
      `var __id=${lit(id)};`,
      `var __slot=${lit(slot)};`,
      `var __rid=${lit(listingRid)};`,
      `var __num=${num};`,
      `var __item=${itemJson};`,
      `var __bag=character.items[__num];`,
      `if(!__bag){game_log("Trade swap failed — bag slot empty");return;}`,
      `if(typeof trade_swap==="function"){trade_swap(__slot,__id,__rid,__num,__item||__bag);}`,
      `else{`,
      socketEmitJs(
        "trade_swap",
        "{slot:__slot,id:__id,rid:__rid,num:__num,item:__item||__bag}",
      ),
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
      tradeListPrefaceJs(slot),
      tradeSlotOccupiedGuardJs(lit(slot), "Giveaway failed — slot not empty"),
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
      // CODE API: wishlist(tradeSlot, name, price, level, quantity)
      `try{await wishlist(__slot,__name,__price,__level,__q);}catch(__e){`,
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
      `if((__it.q||1)<__q)continue;`,
      `__num=__si;break;`,
      `}`,
      `if(__num<0){game_log("Reprice failed — item not in bag after delist");return;}`,
      // CODE API: trade(invNum, tradeSlot, price, quantity)
      `try{await trade(__num,__slot,__price,__q);}catch(__e){`,
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
  const ok = emitObserverCommand(
    script,
    `wishlist ${tradeSlot} ${itemName}`,
  );
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
  return emitObserverCommand(
    script,
    `join-giveaway ${tradeSlot}`,
  );
}

export function tradeSwapCommand(
  targetId: string,
  tradeSlot: string,
  rid: string,
  bagSlot: number,
  item: { name?: string; level?: number; p?: string; q?: number },
): boolean {
  const script = buildTradeSwapScript(targetId, tradeSlot, rid, bagSlot, item);
  const ok = emitObserverCommand(script, `trade-swap ${tradeSlot}`);
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function giveawayCommand(
  tradeSlot: string,
  fp: ItemFingerprint,
  minutes: number,
  q?: number,
): boolean {
  const script = buildGiveawayScript(tradeSlot, fp, minutes, q);
  const ok = emitObserverCommand(
    script,
    `giveaway ${tradeSlot} ${fp.name}`,
  );
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
  const ok = emitObserverCommand(script, `trade-buy ${tradeSlot}`);
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
  const ok = emitObserverCommand(script, `trade-sell ${tradeSlot}`);
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
  const ok = emitObserverCommand(script, `trade-reprice ${tradeSlot}`);
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
  const ok = emitObserverCommand(
    script,
    `trade-list ${tradeSlot} ${fp.name}`,
  );
  if (!ok) return false;
  rememberTradePrice(fp.name, price, q ?? fp.q ?? 1);
  scheduleBagRefresh();
  return true;
}

export function tradeOfferCommand(
  fp: ItemFingerprint,
  tradeSlot: string,
  want: { name: string; level?: number; p?: string | null; q?: number },
  offerQ?: number,
): boolean {
  const script = buildTradeOfferScript(fp, tradeSlot, want, offerQ);
  const ok = emitObserverCommand(
    script,
    `trade-offer ${tradeSlot} ${fp.name}`,
  );
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function tradeShowCommand(): boolean {
  return emitObserverCommand(buildTradeShowScript(), "trade-show");
}

export function tradeHideCommand(): boolean {
  return emitObserverCommand(buildTradeHideScript(), "trade-hide");
}

export function merchantCloseCommand(): boolean {
  const ok = emitObserverCommand(buildMerchantCloseScript(), "merchant-close");
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function merchantOpenCommand(invSlot?: number): boolean {
  const script = buildMerchantOpenScript(invSlot);
  const ok = emitObserverCommand(script, "merchant-open");
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}
