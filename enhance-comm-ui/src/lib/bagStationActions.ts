/**
 * Bag-slot craft / exchange / dismantle eligibility (bag-only default path).
 * auto_craft requires a *single* inventory slot with enough qty per ingredient.
 */

import type { BankAggItem, BankSlotRef } from "./bank/bankTypes";
import { itemDisplayName } from "./gameIcon";
import type { GLike } from "../host/globals";
import {
  craftStationForRecipe,
  dismantleStation,
  evaluateStationAccess,
  exchangeStationForItem,
  type StationAccess,
  type StationCoords,
} from "./stationAccess";

export type CraftIngredientNeed = {
  name: string;
  need: number;
  level?: number;
  /** Best single-slot qty in bag matching name+level (auto_craft rule). */
  bagSlotHave: number;
  /** Total bag qty across slots. */
  bagTotal: number;
  /** Bank aggregated qty (optional; for withdraw hints). */
  bankHave: number;
  missingFromBag: number;
};

export type CraftFromBagOffer = {
  output: string;
  outputName: string;
  cost: number;
  /** True when every ingredient has a bag slot with need qty (auto_craft). */
  bagReady: boolean;
  /** True when bag totals + bank cover one craft (withdraw can help). */
  withdrawCanReady: boolean;
  ingredients: CraftIngredientNeed[];
  station: StationCoords | null;
  access: StationAccess;
};

export type ExchangeFromBagOffer = {
  name: string;
  displayName: string;
  /** Items consumed per exchange (`G.items[name].e`). */
  e: number;
  q: number;
  enoughQty: boolean;
  locked: boolean;
  station: StationCoords | null;
  access: StationAccess;
};

export type DismantleFromBagOffer = {
  name: string;
  displayName: string;
  level?: number;
  /** `recipe` = G.dismantle; `compound` = split leveled compound gear. */
  kind: "recipe" | "compound";
  cost: number;
  locked: boolean;
  blocked: boolean;
  station: StationCoords | null;
  access: StationAccess;
};

type BagItemLike = {
  name?: string;
  level?: number;
  q?: number;
  p?: string | null;
  l?: string | number | boolean | null;
  b?: boolean | null;
};

function parseCraftRow(row: unknown): {
  need: number;
  name: string;
  level?: number;
} | null {
  if (!Array.isArray(row) || row.length < 2) return null;
  const need = Number(row[0]);
  const name = String(row[1] || "");
  if (!(need > 0) || !name) return null;
  const third = row[2];
  if (typeof third === "number") return { need, name, level: third };
  return { need, name };
}

/** Best single-slot quantity for name (+ optional level) in bag. */
export function bestBagSlotQty(
  items: Array<BagItemLike | null | undefined> | null | undefined,
  name: string,
  level?: number,
): number {
  if (!items) return 0;
  let best = 0;
  const wantLevel = level != null ? level : 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || !it.name || it.name === "placeholder") continue;
    if (String(it.name) !== name) continue;
    const lv = it.level != null ? Number(it.level) : 0;
    if (lv !== wantLevel) continue;
    const q = it.q != null && Number.isFinite(Number(it.q)) ? Number(it.q) : 1;
    if (q > best) best = q;
  }
  return best;
}

export function totalBagQty(
  items: Array<BagItemLike | null | undefined> | null | undefined,
  name: string,
  level?: number,
): number {
  if (!items) return 0;
  let total = 0;
  const wantLevel = level != null ? level : 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || !it.name || it.name === "placeholder") continue;
    if (String(it.name) !== name) continue;
    const lv = it.level != null ? Number(it.level) : 0;
    if (lv !== wantLevel) continue;
    const q = it.q != null && Number.isFinite(Number(it.q)) ? Number(it.q) : 1;
    total += q;
  }
  return total;
}

function bankQty(
  bankAgg: BankAggItem[] | null | undefined,
  name: string,
  level?: number,
): number {
  if (!bankAgg) return 0;
  const wantLevel = level != null ? level : undefined;
  let q = 0;
  for (let i = 0; i < bankAgg.length; i++) {
    const it = bankAgg[i];
    if (it.name !== name) continue;
    if (wantLevel != null) {
      const lv = it.level != null ? it.level : 0;
      if (lv !== wantLevel) continue;
    } else if (it.level != null && it.level !== 0) {
      continue;
    }
    q += it.q;
  }
  return q;
}

function recipeUsesItem(
  recipeItems: unknown[],
  itemName: string,
): boolean {
  for (let i = 0; i < recipeItems.length; i++) {
    const parsed = parseCraftRow(recipeItems[i]);
    if (parsed && parsed.name === itemName) return true;
  }
  return false;
}

function buildCraftOffer(
  output: string,
  recipe: { cost?: number; items?: unknown[]; quest?: string },
  bagItems: Array<BagItemLike | null | undefined> | null | undefined,
  bankAgg: BankAggItem[] | null | undefined,
  gold: number,
  G: GLike,
): CraftFromBagOffer {
  const rows = Array.isArray(recipe.items) ? recipe.items : [];
  const ingredients: CraftIngredientNeed[] = [];
  let bagReady = true;
  let withdrawCanReady = true;
  for (let i = 0; i < rows.length; i++) {
    const parsed = parseCraftRow(rows[i]);
    if (!parsed) continue;
    const bagSlotHave = bestBagSlotQty(bagItems, parsed.name, parsed.level);
    const bagTotal = totalBagQty(bagItems, parsed.name, parsed.level);
    const bankHave = bankQty(bankAgg, parsed.name, parsed.level);
    const missingFromBag = Math.max(0, parsed.need - bagSlotHave);
    if (bagSlotHave < parsed.need) bagReady = false;
    if (bagTotal + bankHave < parsed.need) withdrawCanReady = false;
    ingredients.push({
      name: parsed.name,
      need: parsed.need,
      level: parsed.level,
      bagSlotHave,
      bagTotal,
      bankHave,
      missingFromBag,
    });
  }
  const cost = Number(recipe.cost) || 0;
  if (cost > gold) {
    bagReady = false;
  }
  const station = craftStationForRecipe(output, G);
  const access = evaluateStationAccess(station, { items: bagItems });
  return {
    output,
    outputName: itemDisplayName(output),
    cost,
    bagReady: bagReady && ingredients.length > 0,
    withdrawCanReady:
      withdrawCanReady &&
      ingredients.length > 0 &&
      cost <= gold &&
      !bagReady,
    ingredients,
    station,
    access,
  };
}

function ingredientShortLabel(ing: CraftIngredientNeed): string {
  let label = itemDisplayName(ing.name);
  if (ing.level != null && ing.level > 0) label += `+${ing.level}`;
  return label;
}

/**
 * Short menu suffix when `offer.bagReady` is false — names the shortfall
 * instead of a vague "(missing)".
 */
export function craftOfferNotReadySuffix(offer: CraftFromBagOffer): string {
  if (offer.bagReady) return "";
  const miss: CraftIngredientNeed[] = [];
  for (let i = 0; i < offer.ingredients.length; i++) {
    const ing = offer.ingredients[i];
    if (ing.bagSlotHave >= ing.need) continue;
    miss.push(ing);
  }
  if (miss.length) {
    if (offer.withdrawCanReady) {
      const inBank: string[] = [];
      for (let i = 0; i < miss.length; i++) {
        if (miss[i].bankHave > 0) inBank.push(ingredientShortLabel(miss[i]));
      }
      if (inBank.length) {
        const shown = inBank.slice(0, 2).join(", ");
        const more = inBank.length > 2 ? ` +${inBank.length - 2}` : "";
        return ` (${shown}${more} in bank)`;
      }
      return " (need bag)";
    }
    const names = miss.map(ingredientShortLabel);
    const shown = names.slice(0, 2).join(", ");
    const more = names.length > 2 ? ` +${names.length - 2}` : "";
    return ` (need ${shown}${more})`;
  }
  if (offer.cost > 0) return " (need gold)";
  return " (need bag)";
}

/**
 * When dismantle is not offered, explain why for upgrade/compound gear.
 * Returns null for items where a missing dismantle row would just be noise.
 */
export function dismantleUnavailableHint(
  item: BagItemLike,
  G?: GLike | null,
): { label: string; title: string } | null {
  if (!item || !item.name || !G || !G.items) return null;
  if (dismantleOfferForBagItem(item, null, G)) return null;
  const name = String(item.name);
  const def = G.items[name] as
    | { upgrade?: boolean; compound?: boolean; type?: string }
    | undefined;
  if (!def) return null;
  const level =
    item.level != null && Number.isFinite(Number(item.level))
      ? Number(item.level)
      : 0;
  if (def.compound && def.type !== "booster") {
    if (level < 1) {
      return {
        label: "Dismantle (need +1)",
        title: "Compound gear only splits back into three copies at level 1+",
      };
    }
    return null;
  }
  if (def.upgrade) {
    return {
      label: "Dismantle (n/a)",
      title:
        "No dismantle recipe — upgrade gear cannot be split at the craftsman",
    };
  }
  return null;
}

/**
 * Craft recipes that use `itemName` as an ingredient, or craft more of `itemName`
 * when it is a craft output and bag can (or almost can) finish the recipe.
 */
export function listCraftOffersForBagItem(
  itemName: string,
  bagItems: Array<BagItemLike | null | undefined> | null | undefined,
  options?: {
    G?: GLike | null;
    gold?: number;
    bankAgg?: BankAggItem[] | null;
  },
): CraftFromBagOffer[] {
  const G = (options && options.G) || null;
  if (!G) return [];
  const craftMap = (G as GLike & { craft?: Record<string, any> }).craft;
  if (!craftMap || typeof craftMap !== "object") return [];
  const gold =
    options && options.gold != null && Number.isFinite(options.gold)
      ? Number(options.gold)
      : 0;
  const bankAgg = options && options.bankAgg ? options.bankAgg : null;
  const out: CraftFromBagOffer[] = [];
  const outputs = Object.keys(craftMap);
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    const recipe = craftMap[output];
    if (!recipe || !Array.isArray(recipe.items)) continue;
    const asIngredient = recipeUsesItem(recipe.items, itemName);
    const asOutput = output === itemName;
    if (!asIngredient && !asOutput) continue;
    out.push(
      buildCraftOffer(output, recipe, bagItems, bankAgg, gold, G),
    );
  }
  out.sort((a, b) => {
    const readyA = a.bagReady && a.access.ok ? 1 : 0;
    const readyB = b.bagReady && b.access.ok ? 1 : 0;
    if (readyB !== readyA) return readyB - readyA;
    return a.outputName.localeCompare(b.outputName);
  });
  return out;
}

export function exchangeOfferForBagItem(
  item: BagItemLike,
  bagItems: Array<BagItemLike | null | undefined> | null | undefined,
  G?: GLike | null,
): ExchangeFromBagOffer | null {
  if (!item || !item.name || !G || !G.items) return null;
  const def = G.items[item.name];
  const e = def && def.e != null ? Number(def.e) : 0;
  if (!(e > 0)) return null;
  const q =
    item.q != null && Number.isFinite(Number(item.q)) ? Number(item.q) : 1;
  const station = exchangeStationForItem(String(item.name), G);
  const access = evaluateStationAccess(station, { items: bagItems });
  return {
    name: String(item.name),
    displayName: itemDisplayName(String(item.name)),
    e,
    q,
    enoughQty: q >= e,
    locked: !!(item.l != null && item.l !== false && item.l !== 0),
    station,
    access,
  };
}

export function dismantleOfferForBagItem(
  item: BagItemLike,
  bagItems: Array<BagItemLike | null | undefined> | null | undefined,
  G?: GLike | null,
): DismantleFromBagOffer | null {
  if (!item || !item.name || !G || !G.items) return null;
  const name = String(item.name);
  const def = G.items[name];
  const level =
    item.level != null && Number.isFinite(Number(item.level))
      ? Number(item.level)
      : 0;
  const dismantleMap = (G as GLike & { dismantle?: Record<string, any> })
    .dismantle;
  const recipe = dismantleMap && dismantleMap[name];
  const compoundSplit =
    !!def &&
    !!def.compound &&
    level >= 1 &&
    def.type !== "booster";

  let kind: "recipe" | "compound" | null = null;
  let cost = 0;
  if (recipe) {
    kind = "recipe";
    cost = Number(recipe.cost) || 0;
  } else if (compoundSplit) {
    kind = "compound";
    // Server: min(50_000_000, calculate_item_value(item) * 10) — UI shows approx.
    cost = 0;
  }
  if (!kind) return null;

  const station = dismantleStation(G);
  const access = evaluateStationAccess(station, { items: bagItems });
  return {
    name,
    displayName: itemDisplayName(name),
    level: level > 0 ? level : undefined,
    kind,
    cost,
    locked: !!(item.l != null && item.l !== false && item.l !== 0),
    blocked: !!(item.b != null && item.b),
    station,
    access,
  };
}

/**
 * Pick bank pack slots to cover `missing` qty of name/level (greedy, largest first).
 */
export function pickBankSlotsForNeed(
  slots: BankSlotRef[],
  name: string,
  need: number,
  level?: number,
): Array<{ pack: string; index: number; q: number }> {
  if (!(need > 0)) return [];
  const wantLevel = level != null ? level : 0;
  const matches: BankSlotRef[] = [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (String(s.item.name) !== name) continue;
    const lv = s.item.level != null ? Number(s.item.level) : 0;
    if (lv !== wantLevel) continue;
    matches.push(s);
  }
  matches.sort((a, b) => {
    const qa =
      a.item.q != null && Number.isFinite(Number(a.item.q))
        ? Number(a.item.q)
        : 1;
    const qb =
      b.item.q != null && Number.isFinite(Number(b.item.q))
        ? Number(b.item.q)
        : 1;
    return qb - qa;
  });
  const out: Array<{ pack: string; index: number; q: number }> = [];
  let remaining = need;
  for (let i = 0; i < matches.length && remaining > 0; i++) {
    const s = matches[i];
    const q =
      s.item.q != null && Number.isFinite(Number(s.item.q))
        ? Number(s.item.q)
        : 1;
    out.push({ pack: s.pack, index: s.index, q });
    remaining -= q;
  }
  return out;
}
