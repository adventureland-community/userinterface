/**
 * Observed-character bank moves via o:command → bank_retrieve / bank_store.
 * Item API (not gold bank_withdraw / bank_deposit). If the character is not on
 * the pack’s vault floor, CODE smart_moves to `bank` first, then to the floor
 * (`bank_b` / `bank_u`) when needed.
 */

import { emitObserverCommand } from "../al";
import { commLogText, wrapCommandScript } from "../commandScript";
import { refreshObservedInventory } from "../inventory";
import { resolveInvSlotJs } from "../gearCommands";
import type { ItemFingerprint } from "../mail/types";
import { ensureBankSnapshot } from "./bankCache";

/** Pack id → vault map (subset of stock bank_packs; gold/shells ignored). */
const PACK_MAP_FALLBACK: Record<string, string> = {
  items0: "bank",
  items1: "bank",
  items2: "bank",
  items3: "bank",
  items4: "bank",
  items5: "bank",
  items6: "bank",
  items7: "bank",
  items8: "bank_b",
  items9: "bank_b",
  items10: "bank_b",
  items11: "bank_b",
  items12: "bank_b",
  items13: "bank_b",
  items14: "bank_b",
  items15: "bank_b",
  items16: "bank_b",
  items17: "bank_b",
  items18: "bank_b",
  items19: "bank_b",
  items20: "bank_b",
  items21: "bank_b",
  items22: "bank_b",
  items23: "bank_b",
  items24: "bank_u",
  items25: "bank_u",
  items26: "bank_u",
  items27: "bank_u",
  items28: "bank_u",
  items29: "bank_u",
  items30: "bank_u",
  items31: "bank_u",
  items32: "bank_u",
  items33: "bank_u",
  items34: "bank_u",
  items35: "bank_u",
  items36: "bank_u",
  items37: "bank_u",
  items38: "bank_u",
  items39: "bank_u",
  items40: "bank_u",
  items41: "bank_u",
  items42: "bank_u",
  items43: "bank_u",
  items44: "bank_u",
  items45: "bank_u",
  items46: "bank_u",
  items47: "bank_u",
};

function lit(value: string): string {
  return JSON.stringify(String(value));
}

/** Map the observed character must be on to access this pack. */
export function bankPackMap(pack: string): string | null {
  const key = String(pack || "");
  if (!key) return null;
  if (typeof window !== "undefined") {
    const live = (window as Window & {
      bank_packs?: Record<string, [string, number, number]>;
    }).bank_packs;
    if (live && live[key] && live[key][0]) return String(live[key][0]);
  }
  return PACK_MAP_FALLBACK[key] || null;
}

function scheduleBankAndBagRefresh(): void {
  // o:command returns when sent; smart_move may take a while — refresh a few times.
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

/**
 * CODE prelude: arrive on `wantMap` with `character.bank` set.
 * Outside any vault → smart_move("bank"); then smart_move(wantMap) if basement/underground.
 */
export function buildEnsureBankFloorJs(wantMap: string): string {
  const want = String(wantMap || "bank").trim() || "bank";
  return [
    `var __want=${lit(want)};`,
    `var __onBank=character.map==="bank"||character.map==="bank_b"||character.map==="bank_u";`,
    `if(!(character.bank&&character.map===__want)){`,
    `if(!__onBank){`,
    `game_log(${lit(commLogText("bank · smart_move → bank"))});`,
    `try{await smart_move("bank");}catch(__e){game_log(${lit(commLogText("bank · smart_move bank failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));return;}`,
    `}`,
    `if(__want!=="bank"&&character.map!==__want){`,
    `if(character.map!=="bank"){`,
    `game_log(${lit(commLogText("bank · smart_move → bank (via main)"))});`,
    `try{await smart_move("bank");}catch(__e){game_log(${lit(commLogText("bank · smart_move bank failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));return;}`,
    `}`,
    `if(character.map!==__want){`,
    `game_log(${lit(commLogText("bank · smart_move → " + want))});`,
    `try{await smart_move(__want);}catch(__e){game_log(${lit(commLogText("bank · smart_move floor failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));return;}`,
    `}`,
    `}`,
    `if(__want==="bank"&&character.map!=="bank"){`,
    `game_log(${lit(commLogText("bank · smart_move → bank"))});`,
    `try{await smart_move("bank");}catch(__e){game_log(${lit(commLogText("bank · smart_move bank failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));return;}`,
    `}`,
    `if(!character.bank||character.map!==__want){game_log(${lit(commLogText("bank · vault not open on " + want))});return;}`,
    `}`,
  ].join("");
}

/** Any vault floor is fine (deposit without a target pack). */
export function buildEnsureAnyBankJs(): string {
  return [
    `var __onBank=character.map==="bank"||character.map==="bank_b"||character.map==="bank_u";`,
    `if(!character.bank){`,
    `if(!__onBank){`,
    `game_log(${lit(commLogText("bank · smart_move → bank"))});`,
    `try{await smart_move("bank");}catch(__e){game_log(${lit(commLogText("bank · smart_move bank failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));return;}`,
    `}`,
    `if(!character.bank){game_log(${lit(commLogText("bank · vault not open"))});return;}`,
    `}`,
  ].join("");
}

/**
 * CODE: pull one pack slot into the first free bag slot (or `inv`).
 * Optional `expectName` guards against a stale hub snapshot.
 */
export function buildBankRetrieveScript(
  pack: string,
  packSlot: number,
  options?: { inv?: number; expectName?: string },
): string {
  const packId = String(pack || "").trim();
  const slot = Number(packSlot) | 0;
  const mapHint = bankPackMap(packId) || "bank";
  if (!packId || slot < 0) {
    return wrapCommandScript(
      `game_log(${lit(commLogText("bank-retrieve aborted — bad pack/slot"))});`,
    );
  }
  const inv =
    options && options.inv != null && Number.isFinite(options.inv)
      ? Number(options.inv) | 0
      : -1;
  const expect =
    options && options.expectName
      ? String(options.expectName)
      : "";
  const parts = [
    buildEnsureBankFloorJs(mapHint),
    `var __pack=character.bank[${lit(packId)}];`,
    `if(!__pack){game_log(${lit(commLogText("bank-retrieve · pack locked or wrong vault"))});return;}`,
    `var __it=__pack[${slot}];`,
    `if(!__it||!__it.name||__it.name==="placeholder"){game_log(${lit(commLogText("bank-retrieve · empty slot"))});return;}`,
  ];
  if (expect) {
    parts.push(
      `if(__it.name!==${lit(expect)}){game_log(${lit(commLogText("bank-retrieve · item mismatch (refresh Bank)"))});return;}`,
    );
  }
  parts.push(
    `try{await bank_retrieve(${lit(packId)},${slot},${inv});game_log(${lit(commLogText("bank-retrieve ok · " + packId + "[" + slot + "]"))});}`,
    `catch(__e){game_log(${lit(commLogText("bank-retrieve failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
  );
  return wrapCommandScript(parts.join(""));
}

/** Instruct observed character to withdraw pack[slot] → bag. */
export function bankRetrieveCommand(
  pack: string,
  packSlot: number,
  options?: { inv?: number; expectName?: string },
): boolean {
  const script = buildBankRetrieveScript(pack, packSlot, options);
  const ok = emitObserverCommand(
    script,
    `bank-retrieve ${pack}[${packSlot}]`,
  );
  if (!ok) return false;
  scheduleBankAndBagRefresh();
  return true;
}

/**
 * CODE: store bag item into vault. Omit pack to let `bank_store` pick the best
 * slot on the current bank map (stack first, then empty).
 */
export function buildBankStoreScript(
  fp: ItemFingerprint,
  options?: { pack?: string; packSlot?: number },
): string {
  const pack =
    options && options.pack != null ? String(options.pack).trim() : "";
  const packSlot =
    options && options.packSlot != null && Number.isFinite(options.packSlot)
      ? Number(options.packSlot) | 0
      : -1;
  const storeCall = pack
    ? `await bank_store(__slot,${lit(pack)},${packSlot})`
    : `await bank_store(__slot)`;
  const okLabel = pack
    ? commLogText("bank-store ok · " + fp.name + " → " + pack)
    : commLogText("bank-store ok · " + fp.name);
  const ensure = pack
    ? buildEnsureBankFloorJs(bankPackMap(pack) || "bank")
    : buildEnsureAnyBankJs();
  return wrapCommandScript(
    [
      ensure,
      resolveInvSlotJs(fp),
      `try{${storeCall};game_log(${lit(okLabel)});}`,
      `catch(__e){game_log(${lit(commLogText("bank-store failed"))}+(__e&&__e.reason?(" · "+__e.reason):""));}`,
    ].join(""),
  );
}

/** Instruct observed character to deposit bag item → vault. */
export function bankStoreCommand(
  fp: ItemFingerprint,
  options?: { pack?: string; packSlot?: number },
): boolean {
  const script = buildBankStoreScript(fp, options);
  const ok = emitObserverCommand(
    script,
    `bank-store ${fp.name}`,
  );
  if (!ok) return false;
  scheduleBankAndBagRefresh();
  return true;
}
