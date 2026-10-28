/**
 * Upgrade / compound eligibility and bag reagent picking.
 * Grade + scroll rules mirror adventureland_mongodb `calculate_item_grade`
 * and server upgrade/compound handlers.
 */

import { itemDisplayName, itemInstanceLabel } from "./gameIcon";
import type { GLike } from "../host/globals";
import {
  compoundStation,
  evaluateStationAccess,
  upgradeStation,
  type StationAccess,
  type StationCoords,
} from "./stationAccess";

export type BagSlotRef = {
  slot: number;
  name: string;
  level?: number;
  q?: number;
  p?: string | null;
  /** Item grace (feeds Discord-style shrine trial card). */
  grace?: number;
  l?: unknown;
  b?: unknown;
};

export type ScrollPick = {
  slot: number;
  name: string;
  q: number;
  grade: number;
  type: string;
  displayName: string;
  /** Exact grade match for the gear. */
  recommended: boolean;
};

export type OfferingPick = {
  slot: number;
  name: string;
  q: number;
  grade?: number;
  displayName: string;
};

export type UpgradeFromBagOffer = {
  item: BagSlotRef;
  displayName: string;
  grade: number;
  maxLevel: boolean;
  locked: boolean;
  scrolls: ScrollPick[];
  offerings: OfferingPick[];
  station: StationCoords | null;
  access: StationAccess;
};

export type CompoundFromBagOffer = {
  item: BagSlotRef;
  displayName: string;
  grade: number;
  maxLevel: boolean;
  locked: boolean;
  /** Other bag slots matching name+level (need ≥2). */
  partners: BagSlotRef[];
  scrolls: ScrollPick[];
  offerings: OfferingPick[];
  station: StationCoords | null;
  access: StationAccess;
};

type BagItemLike = {
  name?: string;
  level?: number;
  q?: number;
  p?: string | null;
  l?: unknown;
  b?: unknown;
  [key: string]: unknown;
};

type ItemDefLike = {
  upgrade?: boolean;
  compound?: boolean;
  stat?: number | boolean;
  grades?: number[];
  type?: string;
  grade?: number;
  offering?: number;
  name?: string;
};

/** Stock `calculate_item_grade` — defaults grades [9,10,11,12]. */
export function calculateItemGrade(
  def: ItemDefLike | null | undefined,
  level: number,
): number {
  if (!def || !(def.upgrade || def.compound)) return 0;
  const grades = Array.isArray(def.grades) ? def.grades : [9, 10, 11, 12];
  const lv = Number(level) || 0;
  if (lv >= (grades[3] != null ? grades[3] : 12)) return 4;
  if (lv >= (grades[2] != null ? grades[2] : 11)) return 3;
  if (lv >= (grades[1] != null ? grades[1] : 10)) return 2;
  if (lv >= (grades[0] != null ? grades[0] : 9)) return 1;
  return 0;
}

function slotQty(it: BagItemLike): number {
  return it.q != null && Number.isFinite(Number(it.q)) ? Number(it.q) : 1;
}

function isLocked(it: BagItemLike): boolean {
  return !!(it.l != null && it.l !== false && it.l !== 0);
}

function toSlotRef(slot: number, it: BagItemLike): BagSlotRef {
  const ref: BagSlotRef = {
    slot,
    name: String(it.name),
  };
  if (it.level != null && Number.isFinite(Number(it.level))) {
    ref.level = Number(it.level);
  }
  if (it.q != null) ref.q = slotQty(it);
  if (it.p != null) ref.p = String(it.p);
  if (it.grace != null && Number.isFinite(Number(it.grace))) {
    ref.grace = Number(it.grace);
  }
  if (it.l != null) ref.l = it.l;
  if (it.b != null) ref.b = it.b;
  return ref;
}

function listBagSlots(
  items: Array<BagItemLike | null | undefined> | null | undefined,
): BagSlotRef[] {
  if (!items) return [];
  const out: BagSlotRef[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || !it.name || it.name === "placeholder") continue;
    out.push(toSlotRef(i, it));
  }
  return out;
}

function scrollCompatible(
  scrollDef: ItemDefLike,
  itemDef: ItemDefLike,
  itemGrade: number,
  mode: "upgrade" | "compound",
): boolean {
  if (!scrollDef || scrollDef.grade == null) return false;
  if (Number(scrollDef.grade) < itemGrade) return false;
  if (mode === "compound") {
    return scrollDef.type === "cscroll";
  }
  // upgrade: uscroll for upgradeable; pscroll for stat items
  if (scrollDef.type === "uscroll") return !!itemDef.upgrade;
  if (scrollDef.type === "pscroll") return !!itemDef.stat;
  return false;
}

function isOfferingDef(def: ItemDefLike | null | undefined): boolean {
  if (!def) return false;
  if (def.type === "offering") return true;
  return def.offering !== undefined;
}

/** Scrolls in bag that can upgrade/compound this gear. */
export function listCompatibleScrollsInBag(
  items: Array<BagItemLike | null | undefined> | null | undefined,
  itemDef: ItemDefLike,
  itemGrade: number,
  mode: "upgrade" | "compound",
  G: GLike,
): ScrollPick[] {
  const slots = listBagSlots(items);
  const out: ScrollPick[] = [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const def = G.items && (G.items[s.name] as ItemDefLike | undefined);
    if (!def || !scrollCompatible(def, itemDef, itemGrade, mode)) continue;
    const grade = Number(def.grade) || 0;
    out.push({
      slot: s.slot,
      name: s.name,
      q: s.q != null ? s.q : 1,
      grade,
      type: String(def.type || ""),
      displayName: itemDisplayName(s.name),
      recommended: grade === itemGrade,
    });
  }
  out.sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.slot - b.slot;
  });
  return out;
}

/** Offering-type stacks in bag (optional for upgrade/compound). */
export function listOfferingsInBag(
  items: Array<BagItemLike | null | undefined> | null | undefined,
  G: GLike,
): OfferingPick[] {
  const slots = listBagSlots(items);
  const out: OfferingPick[] = [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const def = G.items && (G.items[s.name] as ItemDefLike | undefined);
    if (!isOfferingDef(def)) continue;
    out.push({
      slot: s.slot,
      name: s.name,
      q: s.q != null ? s.q : 1,
      grade: def && def.grade != null ? Number(def.grade) : undefined,
      displayName: itemDisplayName(s.name),
    });
  }
  out.sort((a, b) => a.slot - b.slot);
  return out;
}

/** Other bag copies of the same compound item+level (excluding primary). */
export function findCompoundPartners(
  items: Array<BagItemLike | null | undefined> | null | undefined,
  primarySlot: number,
  name: string,
  level: number,
): BagSlotRef[] {
  const slots = listBagSlots(items);
  const out: BagSlotRef[] = [];
  const wantLevel = Number(level) || 0;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.slot === primarySlot) continue;
    if (s.name !== name) continue;
    const lv = s.level != null ? Number(s.level) : 0;
    if (lv !== wantLevel) continue;
    if (isLocked(s as BagItemLike)) continue;
    out.push(s);
  }
  out.sort((a, b) => a.slot - b.slot);
  return out;
}

export function upgradeOfferForBagItem(
  item: BagItemLike,
  slot: number,
  bagItems: Array<BagItemLike | null | undefined> | null | undefined,
  G?: GLike | null,
): UpgradeFromBagOffer | null {
  if (!item || !item.name || !G || !G.items) return null;
  const def = G.items[item.name] as ItemDefLike | undefined;
  if (!def || !def.upgrade) return null;
  const level = item.level != null ? Number(item.level) : 0;
  const grade = calculateItemGrade(def, level);
  const station = upgradeStation(G);
  const access = evaluateStationAccess(station, { items: bagItems });
  return {
    item: toSlotRef(slot, item),
    displayName: itemInstanceLabel(String(item.name), {
      level,
      p: item.p != null ? String(item.p) : undefined,
    }),
    grade,
    maxLevel: grade >= 4,
    locked: isLocked(item),
    scrolls: listCompatibleScrollsInBag(bagItems, def, grade, "upgrade", G),
    offerings: listOfferingsInBag(bagItems, G),
    station,
    access,
  };
}

export function compoundOfferForBagItem(
  item: BagItemLike,
  slot: number,
  bagItems: Array<BagItemLike | null | undefined> | null | undefined,
  G?: GLike | null,
): CompoundFromBagOffer | null {
  if (!item || !item.name || !G || !G.items) return null;
  const def = G.items[item.name] as ItemDefLike | undefined;
  if (!def || !def.compound) return null;
  if (def.type === "booster") return null;
  const level = item.level != null ? Number(item.level) : 0;
  const grade = calculateItemGrade(def, level);
  const partners = findCompoundPartners(
    bagItems,
    slot,
    String(item.name),
    level,
  );
  const station = compoundStation(G);
  const access = evaluateStationAccess(station, { items: bagItems });
  return {
    item: toSlotRef(slot, item),
    displayName: itemInstanceLabel(String(item.name), {
      level,
      p: item.p != null ? String(item.p) : undefined,
    }),
    grade,
    maxLevel: grade >= 4,
    locked: isLocked(item),
    partners,
    scrolls: listCompatibleScrollsInBag(bagItems, def, grade, "compound", G),
    offerings: listOfferingsInBag(bagItems, G),
    station,
    access,
  };
}

/**
 * Default partner pair: prefer same title (`p`) as primary, then lowest slot.
 */
export function defaultCompoundPartners(
  partners: BagSlotRef[],
  primary?: BagSlotRef | null,
): [BagSlotRef, BagSlotRef] | null {
  if (partners.length < 2) return null;
  const ranked = partners.slice();
  const wantP =
    primary && primary.p != null && String(primary.p) !== ""
      ? String(primary.p)
      : null;
  ranked.sort((a, b) => {
    if (wantP) {
      const ap = a.p != null && String(a.p) === wantP ? 0 : 1;
      const bp = b.p != null && String(b.p) === wantP ? 0 : 1;
      if (ap !== bp) return ap - bp;
    }
    return a.slot - b.slot;
  });
  return [ranked[0], ranked[1]];
}
