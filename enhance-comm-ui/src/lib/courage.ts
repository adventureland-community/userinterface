import { getG } from "../host/al";
import type { EntityLike, GLike, SlotLike } from "../host/globals";

/** Same order as stock `character_slots` in old_common_functions.js. */
const CHARACTER_SLOTS = [
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

const MAX_POOL_CACHE = 64;

export type CouragePools = {
  courage: number;
  mcourage: number;
  pcourage: number;
};

type ClassDef = {
  courage?: number;
  mcourage?: number;
  pcourage?: number;
  stats?: Record<string, number>;
  lstats?: Record<string, number>;
  mainhand?: Record<string, Record<string, number>>;
  doublehand?: Record<string, Record<string, number>>;
  offhand?: Record<string, Record<string, number>>;
};

/** Stats that feed courage pools (class gear bonuses + warrior/priest/paladin). */
type CourageProp = {
  courage?: number;
  mcourage?: number;
  pcourage?: number;
  str?: number;
  int?: number;
  set?: string | null;
  class?: string[] | null;
};

type CacheEntry = { fp: string; pools: CouragePools };

/** Bound map: long /comm sessions drop oldest entries when full. */
const poolCache = new Map<string, CacheEntry>();

function hostCalc(
  item: SlotLike & { name: string },
  args: { class: string; map?: string },
): CourageProp | null {
  const fn = window.calculate_item_properties;
  if (typeof fn !== "function") return null;
  try {
    return fn(item, args) as CourageProp;
  } catch {
    return null;
  }
}

function applyCourageProp(
  pools: CouragePools,
  attrs: { str: number; int: number },
  prop: CourageProp | null | undefined,
): void {
  if (!prop) return;
  if (typeof prop.courage === "number") pools.courage += prop.courage;
  if (typeof prop.mcourage === "number") pools.mcourage += prop.mcourage;
  if (typeof prop.pcourage === "number") pools.pcourage += prop.pcourage;
  if (typeof prop.str === "number") attrs.str += prop.str;
  if (typeof prop.int === "number") attrs.int += prop.int;
}

function levelStat(base: number, per: number, level: number): number {
  let v = base + level * per;
  if (level > 40) v += (level - 40) * per;
  if (level > 55) v += (level - 55) * per;
  if (level > 65) v += (level - 65) * per;
  if (level > 80) v -= (level - 80) * per;
  return Math.floor(v);
}

/** Only str/int matter for courage class bonuses. */
function baseStrInt(
  classDef: ClassDef,
  level: number,
): { str: number; int: number } {
  const stats = classDef.stats || {};
  const lstats = classDef.lstats || {};
  return {
    str: levelStat(stats.str || 0, lstats.str || 0, level),
    int: levelStat(stats.int || 0, lstats.int || 0, level),
  };
}

function mapName(): string {
  const m = window.map;
  if (m && typeof m.map_name === "string" && m.map_name) return m.map_name;
  return "";
}

function slotCourageKey(slot: SlotLike | null | undefined): string {
  if (!slot || !slot.name) return "";
  return `${slot.name}|${slot.level ?? ""}|${slot.p ?? ""}|${slot.stat_type ?? ""}`;
}

function courageFingerprint(entity: EntityLike): string {
  const ctype = String(entity.ctype || "");
  const level = typeof entity.level === "number" ? entity.level : 1;
  const slots = entity.slots || {};
  const slotParts: string[] = [];
  for (let i = 0; i < CHARACTER_SLOTS.length; i++) {
    const name = CHARACTER_SLOTS[i];
    slotParts.push(`${name}:${slotCourageKey(slots[name])}`);
  }
  const statuses = entity.s || {};
  const sKeys = Object.keys(statuses);
  sKeys.sort();
  const sParts: string[] = [];
  for (let i = 0; i < sKeys.length; i++) {
    const key = sKeys[i];
    const st = statuses[key];
    if (!st) continue;
    sParts.push(
      `${key}:${st.courage ?? ""}|${st.mcourage ?? ""}|${st.pcourage ?? ""}|${st.str ?? ""}|${st.int ?? ""}`,
    );
  }
  return `${ctype}|${level}|${mapName()}|${slotParts.join(";")}|${sParts.join(";")}`;
}

function cachePut(id: string, fp: string, pools: CouragePools): void {
  if (poolCache.size >= MAX_POOL_CACHE && !poolCache.has(id)) {
    const oldest = poolCache.keys().next().value;
    if (oldest != null) poolCache.delete(oldest);
  }
  poolCache.set(id, { fp, pools });
}

/**
 * Reconstruct courage / mcourage / pcourage from visible soft-sync data:
 * ctype, level, slots, active conditions, and G (class + items + sets).
 *
 * Mirrors courage-relevant parts of server `calculate_player_stats`.
 * Omits inventory stones / tracker achievements (not on soft sync).
 */
export function estimateCouragePools(
  entity: EntityLike,
  G: GLike | undefined = getG(),
): CouragePools | null {
  if (!G || !G.classes || !G.items) return null;
  const ctype = String(entity.ctype || "");
  if (!ctype) return null;
  const classDef = G.classes[ctype] as ClassDef | undefined;
  if (!classDef) return null;
  if (typeof window.calculate_item_properties !== "function") return null;

  const level = typeof entity.level === "number" ? entity.level : 1;
  const pools: CouragePools = {
    courage: classDef.courage || 0,
    mcourage: classDef.mcourage || 0,
    pcourage: classDef.pcourage || 0,
  };
  const attrs = baseStrInt(classDef, level);
  const sets: Record<string, number> = {};
  const slots = entity.slots || {};
  const map = mapName() || undefined;

  for (let i = 0; i < CHARACTER_SLOTS.length; i++) {
    const slotName = CHARACTER_SLOTS[i];
    const current = slots[slotName];
    if (!current || !current.name) continue;
    const def = G.items[current.name];
    if (!def) continue;

    const prop = hostCalc(current as SlotLike & { name: string }, {
      class: ctype,
      map,
    });
    if (!prop) continue;
    if (
      prop.class &&
      Array.isArray(prop.class) &&
      prop.class.indexOf(ctype) < 0
    ) {
      continue;
    }

    applyCourageProp(pools, attrs, prop);

    if (slotName === "mainhand" && def.wtype) {
      const dh = classDef.doublehand && classDef.doublehand[def.wtype];
      const mh = classDef.mainhand && classDef.mainhand[def.wtype];
      applyCourageProp(pools, attrs, (dh || mh || undefined) as CourageProp);
    }
    if (slotName === "offhand") {
      const key = def.wtype || def.type;
      const oh = key && classDef.offhand && classDef.offhand[key];
      applyCourageProp(pools, attrs, oh as CourageProp | undefined);
    }
    if (prop.set) {
      sets[prop.set] = (sets[prop.set] || 0) + 1;
    }
  }

  if (G.sets) {
    const setNames = Object.keys(sets);
    for (let i = 0; i < setNames.length; i++) {
      const name = setNames[i];
      const setDef = G.sets[name];
      const pieceProp = setDef && setDef[sets[name]];
      applyCourageProp(pools, attrs, pieceProp as CourageProp | undefined);
    }
  }

  const statuses = entity.s || {};
  const condNames = Object.keys(statuses);
  for (let i = 0; i < condNames.length; i++) {
    const name = condNames[i];
    if (!statuses[name]) continue;
    applyCourageProp(pools, attrs, statuses[name] as CourageProp);
    const cond = G.conditions && G.conditions[name];
    applyCourageProp(pools, attrs, cond as CourageProp | undefined);
  }

  if (ctype === "warrior") pools.courage += Math.round(attrs.str / 30);
  if (ctype === "priest") pools.mcourage += Math.round(attrs.int / 30);
  if (ctype === "paladin") {
    pools.pcourage += Math.round(attrs.str / 30 + attrs.int / 30);
  }

  return pools;
}

/** Cached courage pools; rebuilds only when gear / level / conditions change. */
export function estimateCouragePoolsCached(
  entity: EntityLike,
): CouragePools | null {
  const id = entity.id != null ? String(entity.id) : "";
  if (!id) return estimateCouragePools(entity);
  const fp = courageFingerprint(entity);
  const hit = poolCache.get(id);
  if (hit && hit.fp === fp) return hit.pools;
  const pools = estimateCouragePools(entity);
  if (pools) cachePut(id, fp, pools);
  else poolCache.delete(id);
  return pools;
}
