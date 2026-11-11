/**
 * Observed-character craft / exchange / dismantle / upgrade / compound via o:command.
 * Default path uses bag stock only; travel to station when no computer.
 * Source of truth: adventureland_mongodb CODE APIs.
 */

import { emitObserverCommand, getG } from "./al";
import {
  buildEnsureBankFloorJs,
  bankPackMap,
} from "./bank/bankCommands";
import {
  ensureBankSnapshot,
  getCachedBankSnapshot,
} from "./bank/bankCache";
import { commLogText, wrapCommandScript } from "./commandScript";
import { resolveInvSlotJs } from "./gearCommands";
import { refreshObservedInventory } from "./inventory";
import type { ItemFingerprint } from "./mail/types";
import {
  findVendorCoordsForItem,
  type StationCoords,
} from "../lib/stationAccess";
import {
  pickBankSlotsForNeed,
  type CraftFromBagOffer,
} from "../lib/bagStationActions";
import {
  aggregateBankItems,
  flattenBankSlots,
} from "../lib/bank/bankBrowse";

function lit(value: string): string {
  return JSON.stringify(String(value));
}

function scheduleBagRefresh(): void {
  // Coalesced in refreshObservedInventory — keep kicks sparse so shrine watch
  // does not stack observe reconnects (bag blank + dropped watching).
  const delays = [1500, 6000];
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

function scheduleBankAndBagRefresh(): void {
  const delays = [1500, 8000, 20000];
  for (let i = 0; i < delays.length; i++) {
    window.setTimeout(() => {
      try {
        refreshObservedInventory();
      } catch {
        /* best-effort */
      }
      void ensureBankSnapshot({ force: true });
    }, delays[i]);
  }
}

/** smart_move to station when not already on map within range — computer skips. */
export function buildEnsureStationJs(
  station: StationCoords | null,
  options?: { skipIfComputer?: boolean },
): string {
  if (!station) return "";
  const skipComputer = options == null || options.skipIfComputer !== false;
  const parts: string[] = [];
  if (skipComputer) {
    parts.push(
      `var __hasComp=false;`,
      `for(var __ci=0;__ci<character.items.length;__ci++){`,
      `var __cit=character.items[__ci];`,
      `if(__cit&&(__cit.name==="computer"||__cit.name==="supercomputer")){__hasComp=true;break;}`,
      `}`,
      `if(!__hasComp){`,
    );
  }
  parts.push(
    `var __stMap=${lit(station.map)};`,
    `var __stx=${Number(station.x)};`,
    `var __sty=${Number(station.y)};`,
    `var __needTravel=character.map!==__stMap;`,
    `if(!__needTravel){`,
    `var __dx=(character.real_x!=null?character.real_x:character.x)-__stx;`,
    `var __dy=(character.real_y!=null?character.real_y:character.y)-__sty;`,
    `if(Math.sqrt(__dx*__dx+__dy*__dy)>400)__needTravel=true;`,
    `}`,
    `if(__needTravel){`,
    `game_log(${lit(commLogText("station · smart_move → " + (station.id || station.map)))});`,
    `try{await smart_move({map:__stMap,x:__stx,y:__sty});}catch(__e){`,
    `game_log(${lit(commLogText("station · smart_move failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));return;`,
    `}`,
    `}`,
  );
  if (skipComputer) parts.push(`}`);
  return parts.join("");
}

export function buildAutoCraftScript(
  outputName: string,
  station: StationCoords | null,
): string {
  const name = String(outputName || "").trim();
  if (!name) {
    return wrapCommandScript(
      `game_log(${lit(commLogText("craft aborted — no recipe"))});`,
    );
  }
  return wrapCommandScript(
    [
      buildEnsureStationJs(station),
      `try{await auto_craft(${lit(name)});game_log(${lit(commLogText("craft ok · " + name))});}`,
      `catch(__e){game_log(${lit(commLogText("craft failed · " + name))}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
    ].join(""),
  );
}

export function autoCraftCommand(
  outputName: string,
  station: StationCoords | null,
): boolean {
  const ok = emitObserverCommand(
    buildAutoCraftScript(outputName, station),
    `craft ${outputName}`,
  );
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function buildExchangeScript(
  fp: ItemFingerprint,
  station: StationCoords | null,
): string {
  return wrapCommandScript(
    [
      buildEnsureStationJs(station),
      resolveInvSlotJs(fp),
      `try{await exchange(__slot);game_log(${lit(commLogText("exchange ok · " + fp.name))});}`,
      `catch(__e){game_log(${lit(commLogText("exchange failed · " + fp.name))}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
    ].join(""),
  );
}

export function exchangeCommand(
  fp: ItemFingerprint,
  station: StationCoords | null,
): boolean {
  const ok = emitObserverCommand(
    buildExchangeScript(fp, station),
    `exchange ${fp.name}`,
  );
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function buildDismantleScript(
  fp: ItemFingerprint,
  station: StationCoords | null,
): string {
  return wrapCommandScript(
    [
      buildEnsureStationJs(station),
      resolveInvSlotJs(fp),
      `try{await dismantle(__slot);game_log(${lit(commLogText("dismantle ok · " + fp.name))});}`,
      `catch(__e){game_log(${lit(commLogText("dismantle failed · " + fp.name))}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
    ].join(""),
  );
}

export function dismantleCommand(
  fp: ItemFingerprint,
  station: StationCoords | null,
): boolean {
  const ok = emitObserverCommand(
    buildDismantleScript(fp, station),
    `dismantle ${fp.name}`,
  );
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

/**
 * Title key for shrine fingerprints — empty / missing `p` is plain, and must
 * not rematch a shiny/glitched twin when preferred slots drift.
 */
function fingerprintTitleKey(p: string | null | undefined): string {
  return p != null && String(p).trim() !== "" ? String(p) : "";
}

function fingerprintCheckNamedJs(
  fp: ItemFingerprint,
  varName: string,
): string {
  const parts = [`!${varName}`, `${varName}.name!==${lit(fp.name)}`];
  if (fp.level != null) parts.push(`${varName}.level!==${fp.level}`);
  if (fp.q != null) parts.push(`${varName}.q!==${fp.q}`);
  const wantTitle = fingerprintTitleKey(fp.p);
  parts.push(
    `((${varName}.p!=null&&String(${varName}.p).trim()!=="")?String(${varName}.p):"")!==${lit(wantTitle)}`,
  );
  if (fp.data != null) parts.push(`${varName}.data!==${lit(fp.data)}`);
  return parts.join("||");
}

/**
 * Resolve fingerprint into `slotVar` (number) or abort.
 * `excludeSlotVars` skips slots already claimed (compound partners).
 */
export function resolveInvSlotNamedJs(
  fp: ItemFingerprint,
  slotVar: string,
  excludeSlotVars?: string[] | null,
): string {
  const preferSlot = Number(fp.slot) | 0;
  const itVar = slotVar + "It";
  const candVar = slotVar + "Cand";
  const siVar = slotVar + "Si";
  const mismatch = fingerprintCheckNamedJs(fp, itVar);
  const candMismatch = fingerprintCheckNamedJs(fp, candVar);
  const excl = excludeSlotVars || [];
  const excludePred =
    excl.length > 0
      ? excl.map((v) => `${siVar}===${v}`).join("||")
      : "";
  const skipExcluded = excludePred
    ? `if(${excludePred})continue;`
    : "";
  const preferExcluded =
    excl.length > 0
      ? `if(${excl.map((v) => `${slotVar}===${v}`).join("||")}){${slotVar}=-1;}`
      : "";
  return [
    `var ${slotVar}=${preferSlot};`,
    preferExcluded,
    `var ${itVar}=character.items[${slotVar}];`,
    `if(${slotVar}<0||(${mismatch})){`,
    `${slotVar}=-1;`,
    `for(var ${siVar}=0;${siVar}<character.items.length;${siVar}++){`,
    skipExcluded,
    `var ${candVar}=character.items[${siVar}];`,
    `if(!(${candMismatch})){${slotVar}=${siVar};break;}`,
    `}`,
    `if(${slotVar}<0){game_log(${JSON.stringify(commLogText("station · item mismatch · " + fp.name))});return;}`,
    `${itVar}=character.items[${slotVar}];`,
    `}`,
  ].join("");
}

/** Buy one stack from NPC (computer skips travel). Leaves name in bag. */
function buildBuyNamedJs(
  itemName: string,
  quantity: number,
  vendor: StationCoords | null,
): string {
  const q = Math.max(1, quantity | 0);
  return [
    buildEnsureStationJs(vendor),
    `try{await buy(${lit(itemName)},${q});game_log(${lit(commLogText("buy ok · " + itemName + (q > 1 ? " ×" + q : "")))});}`,
    `catch(__e){game_log(${lit(commLogText("buy failed · " + itemName))}+(__e&&__e.reason?(" · "+__e.reason):""));return;}`,
  ].join("");
}

/** Resolve first bag slot matching name into `slotVar` (number) or abort. */
function resolveInvSlotByNameJs(itemName: string, slotVar: string): string {
  return [
    `var ${slotVar}=-1;`,
    `for(var __bi=0;__bi<character.items.length;__bi++){`,
    `var __bit=character.items[__bi];`,
    `if(__bit&&__bit.name===${lit(itemName)}){${slotVar}=__bi;break;}`,
    `}`,
    `if(${slotVar}<0){game_log(${lit(commLogText("station · missing after buy · " + itemName))});return;}`,
  ].join("");
}

export type ShrineBuyOpts = {
  /** Buy this scroll name before resolving the bag slot. */
  buyScroll?: string | null;
  buyOffering?: string | null;
  /** Merchant: cast massproduction before the shrine action if buff missing. */
  massproduction?: boolean;
  /** Merchant: cast massproductionpp before the shrine action if buff missing. */
  massproductionpp?: boolean;
  /**
   * Prefer this bag index for upgrade (community “lucky slot”).
   * When set, swap the upgrade target into this slot before reagents.
   * Compound does not use lucky slots.
   */
  luckySlot?: number | null;
};

/** Pause after lucky swap so callcost / bag settle before upgrade. */
const LUCKY_SWAP_SLEEP_MS = 160;

/**
 * After exchanging `from`↔`to`, map a prior slot index through the swap.
 * `null`/non-finite values pass through (scroll/offering may be null).
 */
export function remapSlotAfterExchange(
  value: number | null | undefined,
  from: number,
  to: number,
): number | null {
  if (value == null || !Number.isFinite(value)) return value == null ? null : value;
  const v = value | 0;
  if (v === to) return from | 0;
  if (v === from) return to | 0;
  return v;
}

/**
 * Swap primary `slotVar` into lucky, then remap other already-resolved slot vars.
 *
 * Callers must resolve item + reagents BEFORE this. Do not re-scan the bag for
 * reagents after the swap — remap the exchanged pair instead.
 *
 * Robustness:
 * - skip / abort on placeholder (in-flight roll)
 * - verify the moved item landed in lucky before remapping
 * - on verify fail: attempt swap-back and abort the shrine script
 * - on swap throw: abort — never upgrade outside the lucky slot when enabled
 */
export function buildLuckySwapJs(
  slotVar: string,
  luckySlot: number | null | undefined,
  remapVars: string[] = [],
): string {
  if (luckySlot == null) return "";
  const lucky = Number(luckySlot);
  if (!Number.isFinite(lucky) || lucky < 0) return "";
  const dest = lucky | 0;
  const remaps: string[] = [];
  for (let i = 0; i < remapVars.length; i++) {
    const v = remapVars[i];
    if (!v || v === slotVar) continue;
    // Only remap numeric slots (null scroll/offering stays null).
    remaps.push(
      `if(typeof ${v}==="number"){if(${v}===${dest})${v}=__luckyFrom;else if(${v}===__luckyFrom)${v}=${dest};}`,
    );
  }
  return [
    `{`,
    `var __luckyN=Math.max(character.isize||0,character.items.length);`,
    `if(${dest}<0||${dest}>=__luckyN){`,
    `game_log(${lit(commLogText("lucky slot · aborted — invalid slot " + dest))});return;}`,
    `if(${slotVar}!==${dest}){`,
    `if(${slotVar}<0||${slotVar}>=__luckyN){`,
    `game_log(${lit(commLogText("lucky slot · aborted — item slot invalid"))});return;}`,
    `var __luckyFrom=${slotVar};`,
    `var __luckyIt=character.items[__luckyFrom];`,
    `var __luckyDest=character.items[${dest}];`,
    `if(!__luckyIt||!__luckyIt.name||__luckyIt.name==="placeholder"){`,
    `game_log(${lit(commLogText("lucky slot · aborted — item placeholder"))});return;}`,
    `if(__luckyDest&&__luckyDest.name==="placeholder"){`,
    `game_log(${lit(commLogText("lucky slot · aborted — dest placeholder"))});return;}`,
    `try{`,
    `await swap(${dest},__luckyFrom);`,
    `await sleep(${LUCKY_SWAP_SLEEP_MS});`,
    `var __land=character.items[${dest}];`,
    `var __lv0=__luckyIt.level!=null?Number(__luckyIt.level):0;`,
    `var __lv1=__land&&__land.level!=null?Number(__land.level):0;`,
    `var __p0=__luckyIt.p!=null?String(__luckyIt.p):"";`,
    `var __p1=__land&&__land.p!=null?String(__land.p):"";`,
    `if(!(__land&&__land.name===__luckyIt.name&&__lv0===__lv1&&__p0===__p1)){`,
    `game_log(${lit(commLogText("lucky slot · verify failed — rolling back"))});`,
    `try{await swap(${dest},__luckyFrom);await sleep(${LUCKY_SWAP_SLEEP_MS});}catch(__rb){}`,
    `return;`,
    `}`,
    remaps.join(""),
    `${slotVar}=${dest};`,
    `game_log(${lit(commLogText("lucky slot · swapped → " + dest))});`,
    `}catch(__e){`,
    `game_log(${lit(commLogText("lucky slot · swap failed — upgrade aborted"))}+(__e&&__e.reason?(" · "+__e.reason):""));`,
    `return;`,
    `}`,
    `}`,
    `}`,
  ].join("");
}

/** Prefix use_skill for checked merchant shrine buffs (no-op if already up). */
export function buildShrineSkillPrefixJs(opts?: ShrineBuyOpts | null): string {
  if (!opts) return "";
  const parts: string[] = [];
  if (opts.massproduction) {
    parts.push(
      `try{if(!(character.s&&character.s.massproduction)){await use_skill("massproduction");game_log(${lit(commLogText("skill · massproduction"))});}}catch(__e){}`,
    );
  }
  if (opts.massproductionpp) {
    parts.push(
      `try{if(!(character.s&&character.s.massproductionpp)){await use_skill("massproductionpp");game_log(${lit(commLogText("skill · massproductionpp"))});}}catch(__e){}`,
    );
  }
  return parts.join("");
}

function vendorForBuy(name: string | null | undefined): StationCoords | null {
  if (!name) return null;
  return findVendorCoordsForItem(name, getG());
}

export function buildUpgradeScript(
  item: ItemFingerprint,
  scroll: ItemFingerprint | null,
  offering: ItemFingerprint | null,
  station: StationCoords | null,
  buyOpts?: ShrineBuyOpts | null,
): string {
  if (!scroll && !offering) {
    return wrapCommandScript(
      `game_log(${lit(commLogText("upgrade aborted — need scroll or offering"))});`,
    );
  }
  const buyScroll = buyOpts && buyOpts.buyScroll ? String(buyOpts.buyScroll) : "";
  const buyOffering =
    buyOpts && buyOpts.buyOffering ? String(buyOpts.buyOffering) : "";
  const parts: string[] = [];
  // Buy reagents first (may need a different merchant than the shrine).
  if (buyScroll) {
    parts.push(buildBuyNamedJs(buyScroll, 1, vendorForBuy(buyScroll)));
  }
  if (buyOffering) {
    parts.push(buildBuyNamedJs(buyOffering, 1, vendorForBuy(buyOffering)));
  }
  const luckySlot =
    buyOpts && buyOpts.luckySlot != null ? Number(buyOpts.luckySlot) : null;
  parts.push(buildEnsureStationJs(station));
  parts.push(buildShrineSkillPrefixJs(buyOpts));
  parts.push(resolveInvSlotNamedJs(item, "__uItem"));
  if (scroll) {
    if (buyScroll) {
      parts.push(resolveInvSlotByNameJs(scroll.name, "__uScroll"));
    } else {
      parts.push(resolveInvSlotNamedJs(scroll, "__uScroll"));
    }
  } else {
    parts.push(`var __uScroll=null;`);
  }
  if (offering) {
    if (buyOffering) {
      parts.push(resolveInvSlotByNameJs(offering.name, "__uOffering"));
    } else {
      parts.push(resolveInvSlotNamedJs(offering, "__uOffering"));
    }
  } else {
    parts.push(`var __uOffering=null;`);
  }
  // Remap scroll/offering if they sat in the exchanged pair — don't re-scan bag.
  parts.push(buildLuckySwapJs("__uItem", luckySlot, ["__uScroll", "__uOffering"]));
  parts.push(
    `try{`,
    `var __uCalc=await upgrade(__uItem,__uScroll,__uOffering,true);`,
    `var __uChance=__uCalc&&__uCalc.chance!=null?(Number(__uCalc.chance)*100).toFixed(2):"?";`,
    `var __uGrace=__uCalc&&__uCalc.grace!=null?Number(__uCalc.grace).toFixed(2):"0.00";`,
    `game_log(${lit(commLogText("upgrade chance · " + item.name))}+" · %"+__uChance+" · grace "+__uGrace);`,
    `await upgrade(__uItem,__uScroll,__uOffering);`,
    `game_log(${lit(commLogText("upgrade ok · " + item.name))}+" · %"+__uChance);`,
    `}catch(__e){game_log(${lit(commLogText("upgrade failed · " + item.name))}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
  );
  return wrapCommandScript(parts.join(""));
}

export function upgradeCommand(
  item: ItemFingerprint,
  scroll: ItemFingerprint | null,
  offering: ItemFingerprint | null,
  station: StationCoords | null,
  buyOpts?: ShrineBuyOpts | null,
): boolean {
  const ok = emitObserverCommand(
    buildUpgradeScript(item, scroll, offering, station, buyOpts),
    `upgrade ${item.name}`,
  );
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

export function buildCompoundScript(
  items: [ItemFingerprint, ItemFingerprint, ItemFingerprint],
  scroll: ItemFingerprint,
  offering: ItemFingerprint | null,
  station: StationCoords | null,
  buyOpts?: ShrineBuyOpts | null,
): string {
  const buyScroll = buyOpts && buyOpts.buyScroll ? String(buyOpts.buyScroll) : "";
  const buyOffering =
    buyOpts && buyOpts.buyOffering ? String(buyOpts.buyOffering) : "";
  const parts: string[] = [];
  if (buyScroll) {
    parts.push(buildBuyNamedJs(buyScroll, 1, vendorForBuy(buyScroll)));
  }
  if (buyOffering) {
    parts.push(buildBuyNamedJs(buyOffering, 1, vendorForBuy(buyOffering)));
  }
  parts.push(buildEnsureStationJs(station));
  parts.push(buildShrineSkillPrefixJs(buyOpts));
  // Exclusive rematch — identical name/level/title copies must not collide
  // when preferred slots drifted after a prior roll or bag sort.
  parts.push(resolveInvSlotNamedJs(items[0], "__c0"));
  parts.push(resolveInvSlotNamedJs(items[1], "__c1", ["__c0"]));
  parts.push(resolveInvSlotNamedJs(items[2], "__c2", ["__c0", "__c1"]));
  if (buyScroll) {
    parts.push(resolveInvSlotByNameJs(scroll.name, "__cScroll"));
  } else {
    parts.push(
      resolveInvSlotNamedJs(scroll, "__cScroll", ["__c0", "__c1", "__c2"]),
    );
  }
  if (offering) {
    if (buyOffering) {
      parts.push(resolveInvSlotByNameJs(offering.name, "__cOffering"));
    } else {
      parts.push(
        resolveInvSlotNamedJs(offering, "__cOffering", [
          "__c0",
          "__c1",
          "__c2",
          "__cScroll",
        ]),
      );
    }
  } else {
    parts.push(`var __cOffering=null;`);
  }
  parts.push(
    `if(__c0===__c1||__c1===__c2||__c0===__c2){game_log(${lit(commLogText("compound aborted — duplicate slots"))});return;}`,
    `try{`,
    `var __cCalc=await compound(__c0,__c1,__c2,__cScroll,__cOffering,true);`,
    `var __cChance=__cCalc&&__cCalc.chance!=null?(Number(__cCalc.chance)*100).toFixed(2):"?";`,
    `var __cGrace=__cCalc&&__cCalc.grace!=null?Number(__cCalc.grace).toFixed(2):"0.00";`,
    `game_log(${lit(commLogText("compound chance · " + items[0].name))}+" · %"+__cChance+" · grace "+__cGrace);`,
    `await compound(__c0,__c1,__c2,__cScroll,__cOffering);`,
    `game_log(${lit(commLogText("compound ok · " + items[0].name))}+" · %"+__cChance);`,
    `}catch(__e){game_log(${lit(commLogText("compound failed · " + items[0].name))}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
  );
  return wrapCommandScript(parts.join(""));
}

export function compoundCommand(
  items: [ItemFingerprint, ItemFingerprint, ItemFingerprint],
  scroll: ItemFingerprint,
  offering: ItemFingerprint | null,
  station: StationCoords | null,
  buyOpts?: ShrineBuyOpts | null,
): boolean {
  const ok = emitObserverCommand(
    buildCompoundScript(items, scroll, offering, station, buyOpts),
    `compound ${items[0].name}`,
  );
  if (!ok) return false;
  scheduleBagRefresh();
  return true;
}

/**
 * Explicit withdraw: pull bank slots until bag can satisfy one craft
 * (does not craft). Uses cached bank snapshot locations.
 */
export function buildWithdrawCraftIngredientsScript(
  offer: CraftFromBagOffer,
): string {
  const snap = getCachedBankSnapshot();
  if (!snap) {
    return wrapCommandScript(
      `game_log(${lit(commLogText("withdraw · open Bank and Refresh first"))});`,
    );
  }
  const slots = flattenBankSlots(snap.packs);
  const retrieves: Array<{ pack: string; index: number; expect: string }> = [];
  for (let i = 0; i < offer.ingredients.length; i++) {
    const ing = offer.ingredients[i];
    if (ing.missingFromBag <= 0) continue;
    const picks = pickBankSlotsForNeed(
      slots,
      ing.name,
      ing.missingFromBag,
      ing.level,
    );
    for (let j = 0; j < picks.length; j++) {
      retrieves.push({
        pack: picks[j].pack,
        index: picks[j].index,
        expect: ing.name,
      });
    }
  }
  if (!retrieves.length) {
    return wrapCommandScript(
      `game_log(${lit(commLogText("withdraw · nothing missing in bag"))});`,
    );
  }

  // Group by vault floor so we ensure once per map.
  const byMap: Record<
    string,
    Array<{ pack: string; index: number; expect: string }>
  > = Object.create(null);
  for (let i = 0; i < retrieves.length; i++) {
    const r = retrieves[i];
    const map = bankPackMap(r.pack) || "bank";
    if (!byMap[map]) byMap[map] = [];
    byMap[map].push(r);
  }

  const parts: string[] = [];
  const maps = Object.keys(byMap);
  for (let m = 0; m < maps.length; m++) {
    const map = maps[m];
    parts.push(buildEnsureBankFloorJs(map));
    const list = byMap[map];
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      parts.push(
        `var __pack=character.bank[${lit(r.pack)}];`,
        `if(!__pack){game_log(${lit(commLogText("withdraw · pack locked " + r.pack))});return;}`,
        `var __it=__pack[${r.index | 0}];`,
        `if(!__it||__it.name!==${lit(r.expect)}){game_log(${lit(commLogText("withdraw · mismatch (refresh Bank)"))});return;}`,
        `try{await bank_retrieve(${lit(r.pack)},${r.index | 0});game_log(${lit(commLogText("withdraw ok · " + r.expect))});}`,
        `catch(__e){game_log(${lit(commLogText("withdraw failed · " + r.expect))}+(__e&&__e.reason?(" · "+__e.reason):""));return;}`,
      );
    }
  }
  return wrapCommandScript(parts.join(""));
}

export function withdrawCraftIngredientsCommand(
  offer: CraftFromBagOffer,
): boolean {
  const ok = emitObserverCommand(
    buildWithdrawCraftIngredientsScript(offer),
    `withdraw-craft ${offer.output}`,
  );
  if (!ok) return false;
  scheduleBankAndBagRefresh();
  return true;
}

/** Convenience: bank agg from cache for menu gating. */
export function cachedBankAgg() {
  const snap = getCachedBankSnapshot();
  if (!snap) return null;
  return aggregateBankItems(flattenBankSlots(snap.packs));
}

export function observingGold(): number {
  const obs = window.observing;
  if (obs && obs.gold != null && Number.isFinite(Number(obs.gold))) {
    return Number(obs.gold);
  }
  return 0;
}

export function observingBagItems(): Array<any> | null {
  const obs = window.observing;
  if (!obs || !Array.isArray(obs.items)) return null;
  return obs.items;
}

/** Re-export getG for menu builders. */
export { getG };
