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
import type { StationCoords } from "../lib/stationAccess";
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

function fingerprintCheckNamedJs(
  fp: ItemFingerprint,
  varName: string,
): string {
  const parts = [`!${varName}`, `${varName}.name!==${lit(fp.name)}`];
  if (fp.level != null) parts.push(`${varName}.level!==${fp.level}`);
  if (fp.q != null) parts.push(`${varName}.q!==${fp.q}`);
  if (fp.p != null) parts.push(`${varName}.p!==${lit(fp.p)}`);
  return parts.join("||");
}

/** Resolve fingerprint into `slotVar` (number) or abort. */
export function resolveInvSlotNamedJs(
  fp: ItemFingerprint,
  slotVar: string,
): string {
  const preferSlot = Number(fp.slot) | 0;
  const itVar = slotVar + "It";
  const candVar = slotVar + "Cand";
  const siVar = slotVar + "Si";
  const mismatch = fingerprintCheckNamedJs(fp, itVar);
  const candMismatch = fingerprintCheckNamedJs(fp, candVar);
  return [
    `var ${slotVar}=${preferSlot};`,
    `var ${itVar}=character.items[${slotVar}];`,
    `if(${mismatch}){`,
    `${slotVar}=-1;`,
    `for(var ${siVar}=0;${siVar}<character.items.length;${siVar}++){`,
    `var ${candVar}=character.items[${siVar}];`,
    `if(!(${candMismatch})){${slotVar}=${siVar};break;}`,
    `}`,
    `if(${slotVar}<0){game_log(${JSON.stringify(commLogText("station · item mismatch · " + fp.name))});return;}`,
    `${itVar}=character.items[${slotVar}];`,
    `}`,
  ].join("");
}

export function buildUpgradeScript(
  item: ItemFingerprint,
  scroll: ItemFingerprint | null,
  offering: ItemFingerprint | null,
  station: StationCoords | null,
): string {
  if (!scroll && !offering) {
    return wrapCommandScript(
      `game_log(${lit(commLogText("upgrade aborted — need scroll or offering"))});`,
    );
  }
  const parts = [
    buildEnsureStationJs(station),
    resolveInvSlotNamedJs(item, "__uItem"),
  ];
  if (scroll) {
    parts.push(resolveInvSlotNamedJs(scroll, "__uScroll"));
  } else {
    parts.push(`var __uScroll=null;`);
  }
  if (offering) {
    parts.push(resolveInvSlotNamedJs(offering, "__uOffering"));
  } else {
    parts.push(`var __uOffering=null;`);
  }
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
): boolean {
  const ok = emitObserverCommand(
    buildUpgradeScript(item, scroll, offering, station),
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
): string {
  const parts = [
    buildEnsureStationJs(station),
    resolveInvSlotNamedJs(items[0], "__c0"),
    resolveInvSlotNamedJs(items[1], "__c1"),
    resolveInvSlotNamedJs(items[2], "__c2"),
    resolveInvSlotNamedJs(scroll, "__cScroll"),
  ];
  if (offering) {
    parts.push(resolveInvSlotNamedJs(offering, "__cOffering"));
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
): boolean {
  const ok = emitObserverCommand(
    buildCompoundScript(items, scroll, offering, station),
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
