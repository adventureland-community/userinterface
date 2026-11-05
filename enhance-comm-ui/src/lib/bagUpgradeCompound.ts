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
  /**
   * Bag slot when already owned. `-1` when this row is a vendor-buy option
   * (Confirm will `buy()` first — computer or travel to the scrolls merchant).
   */
  slot: number;
  name: string;
  q: number;
  grade: number;
  type: string;
  displayName: string;
  /** Exact grade match for the gear. */
  recommended: boolean;
  /** True when not in bag — purchase from an NPC vendor on Confirm. */
  buy?: boolean;
  /** NPC gold price (`G.items[].g`) when `buy`. */
  buyPrice?: number;
};

export type OfferingPick = {
  slot: number;
  name: string;
  q: number;
  grade?: number;
  displayName: string;
  buy?: boolean;
  buyPrice?: number;
};

/** Stable id for scroll/offering tile selection (bag slot vs vendor buy). */
export function shrinePickId(pick: {
  slot: number;
  name: string;
  buy?: boolean;
}): string {
  return pick.buy ? "buy:" + pick.name : "bag:" + pick.slot;
}

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

type BuyableDef = ItemDefLike & {
  buy?: boolean;
  g?: number;
  cash?: number;
  p2w?: boolean;
};

/** NPC gold shop item — `process_game_data` sets `buy` from merchant stock. */
export function isNpcGoldBuyable(
  def: BuyableDef | null | undefined,
): boolean {
  if (!def || !def.buy) return false;
  if (def.cash && !def.p2w) return false;
  const g = Number(def.g);
  return Number.isFinite(g) && g > 0;
}

function vendorBuyPrice(def: BuyableDef): number {
  return Number(def.g) | 0;
}

/** Stable selection key — bag slot vs vendor buy-by-name. */
export function findShrinePickById<T extends { slot: number; name: string; buy?: boolean }>(
  picks: T[],
  id: string | null,
): T | null {
  if (id == null || id === "") return null;
  for (let i = 0; i < picks.length; i++) {
    if (shrinePickId(picks[i]) === id) return picks[i];
  }
  return null;
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

/**
 * Compatible scrolls sold by NPC vendors (not already listed from the bag).
 * Confirm buys one via `buy()` — computer works anywhere; else travel to vendor.
 */
export function listCompatibleVendorScrolls(
  itemDef: ItemDefLike,
  itemGrade: number,
  mode: "upgrade" | "compound",
  G: GLike,
  excludeNames?: Set<string> | null,
): ScrollPick[] {
  if (!G.items) return [];
  const excl = excludeNames || null;
  const out: ScrollPick[] = [];
  const names = Object.keys(G.items);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (excl && excl.has(name)) continue;
    const def = G.items[name] as BuyableDef | undefined;
    if (!def || !isNpcGoldBuyable(def)) continue;
    if (!scrollCompatible(def, itemDef, itemGrade, mode)) continue;
    const grade = Number(def.grade) || 0;
    out.push({
      slot: -1,
      name,
      q: 0,
      grade,
      type: String(def.type || ""),
      displayName: itemDisplayName(name),
      recommended: grade === itemGrade,
      buy: true,
      buyPrice: vendorBuyPrice(def),
    });
  }
  out.sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.name.localeCompare(b.name);
  });
  return out;
}

/** Merge bag scrolls with vendor-buy options for missing names. */
export function listScrollsForShrine(
  items: Array<BagItemLike | null | undefined> | null | undefined,
  itemDef: ItemDefLike,
  itemGrade: number,
  mode: "upgrade" | "compound",
  G: GLike,
): ScrollPick[] {
  const bag = listCompatibleScrollsInBag(items, itemDef, itemGrade, mode, G);
  const have = new Set<string>();
  for (let i = 0; i < bag.length; i++) have.add(bag[i].name);
  const vendor = listCompatibleVendorScrolls(
    itemDef,
    itemGrade,
    mode,
    G,
    have,
  );
  return bag.concat(vendor);
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

/** Vendor offerings not already in the bag. */
export function listVendorOfferings(
  G: GLike,
  excludeNames?: Set<string> | null,
): OfferingPick[] {
  if (!G.items) return [];
  const excl = excludeNames || null;
  const out: OfferingPick[] = [];
  const names = Object.keys(G.items);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (excl && excl.has(name)) continue;
    const def = G.items[name] as BuyableDef | undefined;
    if (!def || !isOfferingDef(def) || !isNpcGoldBuyable(def)) continue;
    out.push({
      slot: -1,
      name,
      q: 0,
      grade: def.grade != null ? Number(def.grade) : undefined,
      displayName: itemDisplayName(name),
      buy: true,
      buyPrice: vendorBuyPrice(def),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Bag offerings plus vendor-buy options for missing names. */
export function listOfferingsForShrine(
  items: Array<BagItemLike | null | undefined> | null | undefined,
  G: GLike,
): OfferingPick[] {
  const bag = listOfferingsInBag(items, G);
  const have = new Set<string>();
  for (let i = 0; i < bag.length; i++) have.add(bag[i].name);
  return bag.concat(listVendorOfferings(G, have));
}

function titleKey(p: string | null | undefined): string {
  return p != null && String(p).trim() !== "" ? String(p) : "";
}

/** Other bag copies of the same compound item+level+title (excluding primary). */
export function findCompoundPartners(
  items: Array<BagItemLike | null | undefined> | null | undefined,
  primarySlot: number,
  name: string,
  level: number,
  p?: string | null,
): BagSlotRef[] {
  const slots = listBagSlots(items);
  const out: BagSlotRef[] = [];
  const wantLevel = Number(level) || 0;
  const wantTitle = titleKey(p);
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.slot === primarySlot) continue;
    if (s.name !== name) continue;
    const lv = s.level != null ? Number(s.level) : 0;
    if (lv !== wantLevel) continue;
    if (titleKey(s.p) !== wantTitle) continue;
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
    scrolls: listScrollsForShrine(bagItems, def, grade, "upgrade", G),
    offerings: listOfferingsForShrine(bagItems, G),
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
    item.p != null ? String(item.p) : null,
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
    scrolls: listScrollsForShrine(bagItems, def, grade, "compound", G),
    offerings: listOfferingsForShrine(bagItems, G),
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

export type ShrineBatchMaterial = {
  name: string;
  displayName?: string;
  q: number;
  buy?: boolean;
  buyPrice?: number;
};

export type ShrineBatchPlan = {
  /** Attempts after capping by peers and materials. */
  attempts: number;
  /** Peer upgrades or compound sets before material caps. */
  wantAttempts: number;
  scrollUse: number;
  scrollHave: number | null;
  offeringUse: number;
  offeringHave: number | null;
  goldNeed: number;
  goldHave: number;
  limitedBy: "peers" | "scroll" | "offering" | "gold" | null;
};

/**
 * How many batch shrine attempts fit the bag (and optional vendor gold).
 * One attempt = one upgrade, or one compound of 3 copies.
 */
export function planShrineBatch(opts: {
  mode: "upgrade" | "compound";
  peerCount: number;
  scroll?: ShrineBatchMaterial | null;
  offering?: ShrineBatchMaterial | null;
  gold?: number;
}): ShrineBatchPlan {
  const peers = Math.max(0, opts.peerCount | 0);
  const want =
    opts.mode === "compound" ? Math.floor(peers / 3) : peers;
  let attempts = want;
  let limitedBy: ShrineBatchPlan["limitedBy"] = want > 0 ? "peers" : null;

  const scroll = opts.scroll || null;
  const offering = opts.offering || null;
  const gold =
    typeof opts.gold === "number" && Number.isFinite(opts.gold)
      ? Math.max(0, opts.gold)
      : 0;

  let scrollHave: number | null = null;
  if (scroll) {
    if (scroll.buy) {
      scrollHave = null;
    } else {
      scrollHave = Math.max(0, Number(scroll.q) || 0);
      if (scrollHave < attempts) {
        attempts = scrollHave;
        limitedBy = "scroll";
      }
    }
  }

  let offeringHave: number | null = null;
  if (offering) {
    if (offering.buy) {
      offeringHave = null;
    } else {
      offeringHave = Math.max(0, Number(offering.q) || 0);
      if (offeringHave < attempts) {
        attempts = offeringHave;
        limitedBy = "offering";
      }
    }
  }

  let costPer = 0;
  if (scroll && scroll.buy) {
    costPer += Math.max(0, Number(scroll.buyPrice) || 0);
  }
  if (offering && offering.buy) {
    costPer += Math.max(0, Number(offering.buyPrice) || 0);
  }
  if (costPer > 0) {
    const byGold = Math.floor(gold / costPer);
    if (byGold < attempts) {
      attempts = byGold;
      limitedBy = "gold";
    }
  }

  if (attempts <= 0) {
    attempts = 0;
    if (want > 0 && limitedBy === "peers") limitedBy = null;
  } else if (attempts === want) {
    limitedBy = "peers";
  }

  return {
    attempts,
    wantAttempts: want,
    scrollUse: scroll ? attempts : 0,
    scrollHave,
    offeringUse: offering ? attempts : 0,
    offeringHave,
    goldNeed: costPer > 0 ? attempts * costPer : 0,
    goldHave: gold,
    limitedBy: attempts > 0 ? limitedBy : want > 0 ? limitedBy || "scroll" : null,
  };
}

function formatBatchGold(n: number): string {
  if (n >= 1_000_000) return Math.floor(n / 1_000_000) + "m";
  if (n >= 10_000) return Math.floor(n / 1000) + "k";
  return String(n);
}

/** Short UI line: copies/sets + scrolls/offerings used vs have. */
export function formatShrineBatchSummary(
  plan: ShrineBatchPlan,
  opts: {
    mode: "upgrade" | "compound";
    scroll?: ShrineBatchMaterial | null;
    offering?: ShrineBatchMaterial | null;
  },
): string {
  if (plan.wantAttempts <= 0) {
    return opts.mode === "compound" ? " · need 3 copies" : " · no copies";
  }
  const unit = opts.mode === "compound" ? "set" : "upgrade";
  const units = opts.mode === "compound" ? "sets" : "upgrades";
  const head =
    plan.attempts === plan.wantAttempts
      ? " · " +
        plan.attempts +
        " " +
        (plan.attempts === 1 ? unit : units)
      : " · " +
        plan.attempts +
        " of " +
        plan.wantAttempts +
        " " +
        units;
  const parts: string[] = [head];
  const scroll = opts.scroll || null;
  if (scroll && plan.scrollUse > 0) {
    const label = scroll.displayName || scroll.name;
    if (scroll.buy) {
      parts.push(
        "buy " + plan.scrollUse + "× " + label,
      );
    } else {
      parts.push(
        "use " +
          plan.scrollUse +
          "× " +
          label +
          " (have " +
          (plan.scrollHave != null ? plan.scrollHave : "?") +
          ")",
      );
    }
  }
  const offering = opts.offering || null;
  if (offering && plan.offeringUse > 0) {
    const label = offering.displayName || offering.name;
    if (offering.buy) {
      parts.push(
        "buy " + plan.offeringUse + "× " + label,
      );
    } else {
      parts.push(
        "use " +
          plan.offeringUse +
          "× " +
          label +
          " (have " +
          (plan.offeringHave != null ? plan.offeringHave : "?") +
          ")",
      );
    }
  }
  if (plan.goldNeed > 0) {
    parts.push(
      "gold " +
        formatBatchGold(plan.goldNeed) +
        " (have " +
        formatBatchGold(plan.goldHave) +
        ")",
    );
  }
  return parts.join(" · ");
}
