/**
 * Equipped-slot walk shared by courage reconstruct and paperdoll luck/gold
 * estimates. Same order as stock `character_slots`.
 */

import { getG, resolvePlayerCtype } from "../host/al";
import type { EntityLike, GLike, SlotLike } from "../host/globals";
import { createFpCache } from "./fpCache";

export const CHARACTER_SLOTS = [
  "ring1",
  "ring2",
  "earring1",
  "earring2",
  "belt",
  "mainhand",
  "offhand",
  "helmet",
  "chest",
  "pants",
  "shoes",
  "gloves",
  "amulet",
  "orb",
  "elixir",
  "cape",
] as const;

export type EquippedSlotName = (typeof CHARACTER_SLOTS)[number];

export type EquippedItemDef = NonNullable<GLike["items"]>[string];

export type EquippedStatBag = {
  prop: Record<string, unknown>;
  /** Equipped slot only — set bonuses and statuses omit this. */
  slotName?: EquippedSlotName;
  itemDef?: EquippedItemDef;
};

/** Status numbers that invalidate courage / luck / gold reconstruct. Timers omitted. */
const FINGERPRINT_STAT_KEYS = [
  "luck",
  "gold",
  "courage",
  "mcourage",
  "pcourage",
  "str",
  "int",
] as const;

type MultCacheValue = { luckm: number; goldm: number };

const multCache = createFpCache<MultCacheValue>(64);

export function currentMapName(): string | undefined {
  const m = window.map;
  if (m && typeof m.map_name === "string" && m.map_name) return m.map_name;
  return undefined;
}

export function playerCtype(entity: EntityLike): string {
  return String(
    entity.ctype ||
      resolvePlayerCtype(
        entity.id != null ? String(entity.id) : undefined,
        entity,
      ) ||
      "",
  );
}

function slotCacheKey(slot: SlotLike | null | undefined): string {
  if (!slot || !slot.name) return "";
  return `${slot.name}|${slot.level ?? ""}|${slot.p ?? ""}|${slot.stat_type ?? ""}`;
}

function statusFingerprint(entity: EntityLike): string {
  const statuses = entity.s || {};
  const keys = Object.keys(statuses);
  keys.sort();
  const parts: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const st = statuses[key];
    if (!st) continue;
    const rec = st as Record<string, unknown>;
    const fields: string[] = [];
    for (let j = 0; j < FINGERPRINT_STAT_KEYS.length; j++) {
      const n = rec[FINGERPRINT_STAT_KEYS[j]];
      fields.push(typeof n === "number" ? String(n) : "");
    }
    parts.push(`${key}:${fields.join("|")}`);
  }
  return parts.join(";");
}

/** Gear + conditions identity for reconstruct caches (not swap-event display). */
export function equippedFingerprint(entity: EntityLike): string {
  const ctype = playerCtype(entity);
  const level = typeof entity.level === "number" ? entity.level : 1;
  const slots = entity.slots || {};
  const slotParts: string[] = [];
  for (let i = 0; i < CHARACTER_SLOTS.length; i++) {
    const name = CHARACTER_SLOTS[i];
    slotParts.push(`${name}:${slotCacheKey(slots[name])}`);
  }
  return `${ctype}|${level}|${currentMapName() || ""}|${slotParts.join(";")}|${statusFingerprint(entity)}`;
}

function calculateItemProperties(
  item: SlotLike & { name: string },
  args: { class: string; map?: string },
): Record<string, unknown> | null {
  const fn = window.calculate_item_properties;
  if (typeof fn !== "function") return null;
  try {
    return fn(item, args);
  } catch {
    return null;
  }
}

function classAllows(
  prop: Record<string, unknown>,
  ctype: string,
): boolean {
  const cls = prop.class;
  return !Array.isArray(cls) || cls.indexOf(ctype) >= 0;
}

/**
 * Visit equipped slots (class-filtered), completed set pieces, and live
 * statuses / G.conditions. False if calc, ctype, or G.items is missing.
 */
export function visitEquippedStatBags(
  entity: EntityLike,
  onBag: (bag: EquippedStatBag) => void,
  G: GLike | undefined = getG(),
): boolean {
  if (typeof window.calculate_item_properties !== "function") return false;
  if (!G?.items) return false;
  const ctype = playerCtype(entity);
  if (!ctype) return false;
  const slots = entity.slots || {};
  const map = currentMapName();
  const sets: Record<string, number> = {};
  for (let i = 0; i < CHARACTER_SLOTS.length; i++) {
    const slotName = CHARACTER_SLOTS[i];
    const current = slots[slotName];
    if (!current || !current.name) continue;
    const itemDef = G.items[current.name];
    if (!itemDef) continue;
    const named = current as SlotLike & { name: string };
    const prop = calculateItemProperties(named, { class: ctype, map });
    if (!prop || !classAllows(prop, ctype)) continue;
    onBag({ prop, slotName, itemDef });
    if (typeof prop.set === "string" && prop.set) {
      sets[prop.set] = (sets[prop.set] || 0) + 1;
    }
  }
  if (G.sets) {
    const setNames = Object.keys(sets);
    for (let i = 0; i < setNames.length; i++) {
      const name = setNames[i];
      const piece = G.sets[name] && G.sets[name][sets[name]];
      if (piece && typeof piece === "object") {
        onBag({ prop: piece as Record<string, unknown> });
      }
    }
  }
  const statuses = entity.s || {};
  const condNames = Object.keys(statuses);
  for (let i = 0; i < condNames.length; i++) {
    const name = condNames[i];
    const live = statuses[name];
    if (!live) continue;
    onBag({ prop: live as Record<string, unknown> });
    const cond = G.conditions && G.conditions[name];
    if (cond) onBag({ prop: cond as Record<string, unknown> });
  }
  return true;
}

function addFiniteStat(
  totals: Record<string, number>,
  prop: Record<string, unknown>,
  stats: readonly string[],
): void {
  for (let i = 0; i < stats.length; i++) {
    const stat = stats[i];
    const n = prop[stat];
    if (typeof n === "number" && Number.isFinite(n)) totals[stat] += n;
  }
}

/** Sum numeric item/condition/set stats. Undefined if the walk cannot run. */
export function sumEquippedStats(
  entity: EntityLike,
  stats: readonly string[],
): Record<string, number> | undefined {
  const totals: Record<string, number> = {};
  for (let i = 0; i < stats.length; i++) totals[stats[i]] = 0;
  const ok = visitEquippedStatBags(entity, (bag) => {
    addFiniteStat(totals, bag.prop, stats);
  });
  if (!ok) return undefined;
  return totals;
}

/** `1 + xstat/100` like server luckm / goldm. One gear walk; cached per id. */
export function estimateMultipliersFromGear(
  entity: EntityLike,
): { luckm: number; goldm: number } | undefined {
  const id = entity.id != null ? String(entity.id) : "";
  const fp = id ? equippedFingerprint(entity) : "";
  if (id) {
    const hit = multCache.get(id, fp);
    if (hit) return { luckm: hit.luckm, goldm: hit.goldm };
  }
  const sums = sumEquippedStats(entity, ["luck", "gold"]);
  if (!sums) {
    if (id) multCache.delete(id);
    return undefined;
  }
  const result = {
    luckm: 1 + sums.luck / 100,
    goldm: 1 + sums.gold / 100,
  };
  if (id) multCache.set(id, fp, result);
  return result;
}
