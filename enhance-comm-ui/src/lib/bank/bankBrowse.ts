/**
 * Flatten / aggregate / categorize account bank packs.
 */

import type { BankAggItem, BankItem, BankPacks, BankSlotRef } from "./bankTypes";

export const SLOTS_PER_BANK_PACK = 42;

const OFFICIAL_PACK = /^items(\d+)$/;

export function isOfficialBankPack(key: string): boolean {
  return OFFICIAL_PACK.test(key);
}

export function compareBankPackKeys(a: string, b: string): number {
  const ma = OFFICIAL_PACK.exec(a);
  const mb = OFFICIAL_PACK.exec(b);
  if (ma && mb) return Number(ma[1]) - Number(mb[1]);
  if (ma && !mb) return -1;
  if (!ma && mb) return 1;
  return a.localeCompare(b);
}

export function listBankPackKeys(packs: BankPacks): string[] {
  return Object.keys(packs || {}).sort(compareBankPackKeys);
}

export function packDisplayLabel(packKey: string): string {
  const m = OFFICIAL_PACK.exec(packKey);
  if (m) return "Pack " + (Number(m[1]) + 1);
  return packKey;
}

export function flattenBankSlots(packs: BankPacks): BankSlotRef[] {
  const keys = listBankPackKeys(packs);
  const out: BankSlotRef[] = [];
  for (let i = 0; i < keys.length; i++) {
    const pack = keys[i];
    const slots = packs[pack];
    if (!Array.isArray(slots)) continue;
    for (let j = 0; j < slots.length; j++) {
      const item = slots[j];
      if (!item || !item.name || item.name === "placeholder") continue;
      out.push({ pack, index: j, item });
    }
  }
  return out;
}

function aggKey(item: BankItem): string {
  return (
    String(item.name) +
    "\0" +
    (item.level != null ? String(item.level) : "") +
    "\0" +
    (item.p != null ? String(item.p) : "")
  );
}

/** Merge identical name/level/title stacks across packs. */
export function aggregateBankItems(slots: BankSlotRef[]): BankAggItem[] {
  const byKey: Record<string, BankAggItem> = Object.create(null);
  for (let i = 0; i < slots.length; i++) {
    const { pack, index, item } = slots[i];
    const key = aggKey(item);
    const q = item.q != null && Number.isFinite(item.q) ? Number(item.q) : 1;
    let row = byKey[key];
    if (!row) {
      row = {
        key,
        name: String(item.name),
        level: item.level,
        p: item.p != null ? String(item.p) : null,
        q: 0,
        locs: [],
      };
      byKey[key] = row;
    }
    row.q += q;
    row.locs.push({ pack, index, q });
  }
  const keys = Object.keys(byKey);
  const out: BankAggItem[] = [];
  for (let i = 0; i < keys.length; i++) out.push(byKey[keys[i]]);
  out.sort((a, b) => {
    const n = a.name.localeCompare(b.name);
    if (n !== 0) return n;
    const la = a.level != null ? a.level : -1;
    const lb = b.level != null ? b.level : -1;
    if (la !== lb) return la - lb;
    return String(a.p || "").localeCompare(String(b.p || ""));
  });
  return out;
}

/** banksee / explorer-style type buckets. */
export const BANK_TYPE_CATEGORIES: Array<{
  id: string;
  label: string;
  /** G.items type match; empty = catch-all. */
  types: string[];
}> = [
  { id: "helmet", label: "Helmets", types: ["helmet"] },
  { id: "chest", label: "Armors", types: ["chest"] },
  { id: "pants", label: "Underarmors", types: ["pants"] },
  { id: "gloves", label: "Gloves", types: ["gloves"] },
  { id: "shoes", label: "Shoes", types: ["shoes"] },
  { id: "cape", label: "Capes", types: ["cape"] },
  { id: "ring", label: "Rings", types: ["ring"] },
  { id: "earring", label: "Earrings", types: ["earring"] },
  { id: "amulet", label: "Amulets", types: ["amulet"] },
  { id: "belt", label: "Belts", types: ["belt"] },
  { id: "orb", label: "Orbs", types: ["orb"] },
  { id: "weapon", label: "Weapons", types: ["weapon"] },
  { id: "shield", label: "Shields", types: ["shield"] },
  {
    id: "offhand",
    label: "Offhands",
    types: ["source", "quiver", "misc_offhand"],
  },
  { id: "elixir", label: "Elixirs", types: ["elixir"] },
  { id: "pot", label: "Potions", types: ["pot"] },
  {
    id: "scroll",
    label: "Scrolls",
    types: ["cscroll", "uscroll", "pscroll", "offering"],
  },
  { id: "material", label: "Crafting", types: ["material"] },
  { id: "exchange", label: "Exchangeables", types: ["exchange"] },
  { id: "other", label: "Others", types: [] },
];

function itemType(name: string, G: any): string {
  const def = G && G.items && G.items[name];
  return def && def.type != null ? String(def.type) : "";
}

function isExchangeable(name: string, G: any): boolean {
  const def = G && G.items && G.items[name];
  return !!(def && def.e);
}

export function categoryForItem(
  name: string,
  G: any,
): (typeof BANK_TYPE_CATEGORIES)[number] {
  const t = itemType(name, G);
  for (let i = 0; i < BANK_TYPE_CATEGORIES.length; i++) {
    const cat = BANK_TYPE_CATEGORIES[i];
    if (cat.id === "other") continue;
    if (cat.id === "exchange" && isExchangeable(name, G)) return cat;
    if (cat.types.indexOf(t) >= 0) return cat;
  }
  return BANK_TYPE_CATEGORIES[BANK_TYPE_CATEGORIES.length - 1];
}

export function groupBankByCategory(
  items: BankAggItem[],
  G: any,
): Array<{ id: string; label: string; items: BankAggItem[] }> {
  const buckets: Record<string, BankAggItem[]> = Object.create(null);
  for (let i = 0; i < BANK_TYPE_CATEGORIES.length; i++) {
    buckets[BANK_TYPE_CATEGORIES[i].id] = [];
  }
  for (let i = 0; i < items.length; i++) {
    const cat = categoryForItem(items[i].name, G);
    buckets[cat.id].push(items[i]);
  }
  const out: Array<{ id: string; label: string; items: BankAggItem[] }> = [];
  for (let i = 0; i < BANK_TYPE_CATEGORIES.length; i++) {
    const cat = BANK_TYPE_CATEGORIES[i];
    const list = buckets[cat.id];
    if (list && list.length) out.push({ id: cat.id, label: cat.label, items: list });
  }
  return out;
}

/** Explorer bank sort: Category | Quantity | Stack (default Category). */
export type BankSortMode = "category" | "quantity" | "stack";

function categoryOrderIndex(name: string, G: any): number {
  const cat = categoryForItem(name, G);
  for (let i = 0; i < BANK_TYPE_CATEGORIES.length; i++) {
    if (BANK_TYPE_CATEGORIES[i].id === cat.id) return i;
  }
  return BANK_TYPE_CATEGORIES.length;
}

/**
 * Match al-data-explorer BankRender sort:
 * optional quantity/stack primary, then category order, type, name, level desc.
 */
export function sortBankItems(
  items: BankAggItem[],
  mode: BankSortMode,
  G?: any,
): BankAggItem[] {
  const copy = items.slice();
  copy.sort((a, b) => {
    if (mode === "stack" && a.locs.length !== b.locs.length) {
      return b.locs.length - a.locs.length;
    }
    if (mode === "quantity" && a.q !== b.q) {
      return b.q - a.q;
    }

    const ca = categoryOrderIndex(a.name, G);
    const cb = categoryOrderIndex(b.name, G);
    if (ca !== cb) return ca - cb;

    const ta = itemType(a.name, G);
    const tb = itemType(b.name, G);
    if (ta && tb && ta !== tb) return ta.localeCompare(tb);

    if (a.name !== b.name) return a.name.localeCompare(b.name);

    const la = a.level != null ? Number(a.level) : 0;
    const lb = b.level != null ? Number(b.level) : 0;
    if (la !== lb) return lb - la;

    return String(a.p || "").localeCompare(String(b.p || ""));
  });
  return copy;
}
