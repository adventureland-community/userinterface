/**
 * Bag sort planning — target order + safe swap sequence (avoids stack merges).
 */

import type { GLike } from "../host/globals";
import type { MailItem } from "../host/mail/types";
import { equipSlotsForItemName } from "./gearSlots";
import {
  enabledBagSortRules,
  type BagSortPrefs,
  type BagSortRule,
} from "./bagSortPrefs";

export type BagItemDef = {
  type?: string;
  g?: number;
  s?: number | boolean;
  class?: string[] | string | null;
  upgrade?: boolean;
  compound?: boolean;
};

const GEAR_SLOT_ORDER = [
  "helmet",
  "chest",
  "pants",
  "shoes",
  "gloves",
  "belt",
  "amulet",
  "cape",
  "mainhand",
  "offhand",
  "ring1",
  "ring2",
  "earring1",
  "earring2",
  "orb",
  "elixir",
];

const CATEGORY_ORDER: Record<string, number> = {
  consumable: 10,
  scroll: 20,
  equipment: 30,
  weapon: 40,
  armor: 40,
  quest: 50,
  material: 60,
  misc: 70,
  other: 80,
  unknown: 99,
};

export function isBagSlotBlocked(item: MailItem | null | undefined): boolean {
  return !!(item && item.name === "placeholder");
}

export function isBagSlotEmpty(item: MailItem | null | undefined): boolean {
  if (isBagSlotBlocked(item)) return false;
  if (!item || !item.name) return true;
  return false;
}

/** Full bag width for planning (isize or items.length). */
export function observedBagSlotCount(
  obs: { isize?: number; items?: Array<MailItem | null | undefined> } | null | undefined,
): number {
  if (!obs) return 0;
  const isize =
    obs.isize != null && Number.isFinite(Number(obs.isize))
      ? (Number(obs.isize) | 0)
      : 42;
  const len = Array.isArray(obs.items) ? obs.items.length : 0;
  return Math.max(isize, len, 0);
}

/** Pad observing.items to full bag slot count for sort planning. */
export function normalizeObservedBagItems(
  obs: { isize?: number; items?: Array<MailItem | null | undefined> } | null | undefined,
): Array<MailItem | null> {
  const n = observedBagSlotCount(obs);
  if (n <= 0) return [];
  const src = obs?.items;
  const out: Array<MailItem | null> = [];
  for (let i = 0; i < n; i++) {
    const it = src?.[i];
    if (isBagSlotBlocked(it)) {
      out.push(it as MailItem);
    } else if (isBagSlotEmpty(it)) {
      out.push(null);
    } else {
      out.push(it as MailItem);
    }
  }
  return out;
}

export function bagItemDef(
  G: GLike | undefined,
  name: string,
): BagItemDef | null {
  if (!G || !G.items) return null;
  const def = G.items[name] as BagItemDef | undefined;
  return def ?? null;
}

function itemLocked(item: MailItem): boolean {
  return !!(item.l || item.acl || item.v);
}

function itemCategory(def: BagItemDef | null, name: string): string {
  if (!def) return "unknown";
  const t = String(def.type || "").toLowerCase();
  if (t === "pot" || t === "elixir") return "consumable";
  if (t.indexOf("scroll") >= 0 || t === "cscroll" || t === "scroll") {
    return "scroll";
  }
  if (def.upgrade || def.compound) return "equipment";
  if (
    t === "weapon" ||
    t === "shield" ||
    t === "helmet" ||
    t === "chest" ||
    t === "pants" ||
    t === "shoes" ||
    t === "gloves" ||
    t === "belt" ||
    t === "ring" ||
    t === "earring" ||
    t === "amulet" ||
    t === "orb" ||
    t === "cape"
  ) {
    return "equipment";
  }
  if (t === "quest" || t === "material" || t === "misc") return t;
  if (t) return "other";
  return name.indexOf("scroll") >= 0 ? "scroll" : "unknown";
}

function categoryRank(category: string): number {
  return CATEGORY_ORDER[category] ?? CATEGORY_ORDER.other;
}

function gearSlotRank(def: BagItemDef | null, name: string): number {
  const slots = equipSlotsForItemName(name);
  const slot = slots.length ? slots[0] : def?.type ?? "";
  const idx = GEAR_SLOT_ORDER.indexOf(String(slot));
  return idx >= 0 ? idx : 999;
}

function classSortKey(def: BagItemDef | null): string {
  if (!def || def.class == null) return "";
  if (Array.isArray(def.class)) return def.class.slice().sort().join(",");
  return String(def.class);
}

function compareScalar(
  a: number | string,
  b: number | string,
  dir: "asc" | "desc",
): number {
  let cmp = 0;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b));
  }
  return dir === "desc" ? -cmp : cmp;
}

function ruleValue(
  rule: BagSortRule,
  item: MailItem,
  G: GLike | undefined,
): number | string {
  const def = bagItemDef(G, item.name);
  switch (rule.key) {
    case "category":
      return categoryRank(itemCategory(def, item.name));
    case "type":
      return def?.type ?? "";
    case "grade":
      return def?.g ?? 0;
    case "gearSlot":
      return gearSlotRank(def, item.name);
    case "class":
      return classSortKey(def);
    case "name":
      return item.name;
    case "level":
      return item.level ?? 0;
    case "quantity":
      return item.q ?? 1;
    case "stackable":
      return def?.s ? 0 : 1;
    case "locked":
      return itemLocked(item) ? 1 : 0;
    default: {
      const _never: never = rule.key;
      void _never;
      return "";
    }
  }
}

export function compareBagItems(
  a: MailItem,
  b: MailItem,
  prefs: BagSortPrefs,
  G: GLike | undefined,
): number {
  const rules = enabledBagSortRules(prefs);
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const av = ruleValue(rule, a, G);
    const bv = ruleValue(rule, b, G);
    const cmp = compareScalar(av, bv, rule.dir);
    if (cmp !== 0) return cmp;
  }
  return compareScalar(a.name, b.name, "asc");
}

export function wouldStackOnMove(
  a: MailItem | null | undefined,
  b: MailItem | null | undefined,
  G: GLike | undefined,
): boolean {
  if (!a || !b || !a.name || !b.name) return false;
  if (a.name !== b.name) return false;
  if ((a.level ?? 0) !== (b.level ?? 0)) return false;
  const ap = a.p != null ? String(a.p) : "";
  const bp = b.p != null ? String(b.p) : "";
  if (ap !== bp) return false;
  const def = bagItemDef(G, a.name);
  return !!(def && def.s);
}

type SlotState = Array<number | null>;

function buildItemsById(
  items: Array<MailItem | null | undefined>,
): Map<number, MailItem> {
  const map = new Map<number, MailItem>();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (isBagSlotEmpty(it) || isBagSlotBlocked(it)) continue;
    map.set(i, it as MailItem);
  }
  return map;
}

function buildCurrentState(items: Array<MailItem | null | undefined>): SlotState {
  const state: SlotState = [];
  for (let i = 0; i < items.length; i++) {
    if (isBagSlotBlocked(items[i])) {
      state.push(i);
    } else if (isBagSlotEmpty(items[i])) {
      state.push(null);
    } else {
      state.push(i);
    }
  }
  return state;
}

function sortableSlotIndexes(items: Array<MailItem | null | undefined>): number[] {
  const out: number[] = [];
  for (let i = 0; i < items.length; i++) {
    if (!isBagSlotBlocked(items[i])) out.push(i);
  }
  return out;
}

function buildTargetState(
  items: Array<MailItem | null | undefined>,
  prefs: BagSortPrefs,
  G: GLike | undefined,
): SlotState {
  const n = items.length;
  const occupied: Array<{ id: number; item: MailItem }> = [];
  for (let i = 0; i < n; i++) {
    const it = items[i];
    if (isBagSlotEmpty(it) || isBagSlotBlocked(it)) continue;
    occupied.push({ id: i, item: it as MailItem });
  }
  occupied.sort((a, b) => compareBagItems(a.item, b.item, prefs, G));

  const target: SlotState = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (isBagSlotBlocked(items[i])) target[i] = i;
  }

  const slots = sortableSlotIndexes(items);
  if (prefs.emptyLast) {
    let oi = 0;
    for (let s = 0; s < slots.length && oi < occupied.length; s++) {
      target[slots[s]] = occupied[oi].id;
      oi++;
    }
    return target;
  }
  let oi = 0;
  for (let s = 0; s < slots.length && oi < occupied.length; s++) {
    const slot = slots[s];
    if (isBagSlotEmpty(items[slot])) continue;
    target[slot] = occupied[oi].id;
    oi++;
  }
  return target;
}

function itemAtSlot(
  state: SlotState,
  slot: number,
  itemsById: Map<number, MailItem>,
): MailItem | null {
  const id = state[slot];
  if (id == null) return null;
  return itemsById.get(id) ?? null;
}

function doSwapState(state: SlotState, a: number, b: number): void {
  const tmp = state[a];
  state[a] = state[b];
  state[b] = tmp;
}

function findEmptySlot(
  state: SlotState,
  skipA: number,
  skipB: number,
): number {
  for (let i = 0; i < state.length; i++) {
    if (i === skipA || i === skipB) continue;
    if (state[i] == null) return i;
  }
  return -1;
}

function planSafeSwap(
  state: SlotState,
  a: number,
  b: number,
  itemsById: Map<number, MailItem>,
  G: GLike | undefined,
  out: Array<[number, number]>,
): void {
  if (a === b) return;
  const ia = itemAtSlot(state, a, itemsById);
  const ib = itemAtSlot(state, b, itemsById);
  if (ia && ib && wouldStackOnMove(ia, ib, G)) {
    const buf = findEmptySlot(state, a, b);
    if (buf >= 0) {
      planSafeSwap(state, a, buf, itemsById, G, out);
      planSafeSwap(state, buf, b, itemsById, G, out);
      return;
    }
  }
  out.push([a, b]);
  doSwapState(state, a, b);
}

/** Minimal swap list to reach target layout (pairwise swap / imove). */
export function planBagSortSwaps(
  items: Array<MailItem | null | undefined>,
  prefs: BagSortPrefs,
  G: GLike | undefined,
): Array<[number, number]> {
  if (!items.length) return [];
  const itemsById = buildItemsById(items);
  if (itemsById.size <= 1) return [];

  const current = buildCurrentState(items);
  const target = buildTargetState(items, prefs, G);
  const state = current.slice();
  const swaps: Array<[number, number]> = [];

  for (let i = 0; i < state.length; i++) {
    if (state[i] === target[i]) continue;
    if (target[i] == null) {
      if (state[i] != null) {
        const empty = findEmptySlot(state, i, -1);
        if (empty >= 0) planSafeSwap(state, i, empty, itemsById, G, swaps);
      }
      continue;
    }
    let from = -1;
    for (let j = i; j < state.length; j++) {
      if (state[j] === target[i]) {
        from = j;
        break;
      }
    }
    if (from >= 0 && from !== i) {
      planSafeSwap(state, i, from, itemsById, G, swaps);
    }
  }
  return swaps;
}

export function bagAlreadySorted(
  items: Array<MailItem | null | undefined>,
  prefs: BagSortPrefs,
  G: GLike | undefined,
): boolean {
  return planBagSortSwaps(items, prefs, G).length === 0;
}
