import { getG } from "../host/al";
import type { EntityLike, GLike } from "../host/globals";
import {
  equippedFingerprint,
  playerCtype,
  visitEquippedStatBags,
} from "./equippedProps";
import { createFpCache } from "./fpCache";

export type CouragePools = {
  courage: number;
  mcourage: number;
  pcourage: number;
};

const poolCache = createFpCache<CouragePools>(64);

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
  const ctype = playerCtype(entity);
  if (!ctype) return null;
  const classDef = G.classes[ctype] as ClassDef | undefined;
  if (!classDef) return null;

  const level = typeof entity.level === "number" ? entity.level : 1;
  const pools: CouragePools = {
    courage: classDef.courage || 0,
    mcourage: classDef.mcourage || 0,
    pcourage: classDef.pcourage || 0,
  };
  const attrs = baseStrInt(classDef, level);
  const walked = visitEquippedStatBags(
    entity,
    (bag) => {
      applyCourageProp(pools, attrs, bag.prop as CourageProp);
      if (bag.slotName === "mainhand" && bag.itemDef?.wtype) {
        const wtype = bag.itemDef.wtype;
        const dh = classDef.doublehand && classDef.doublehand[wtype];
        const mh = classDef.mainhand && classDef.mainhand[wtype];
        applyCourageProp(pools, attrs, (dh || mh || undefined) as CourageProp);
      }
      if (bag.slotName === "offhand") {
        const key = bag.itemDef?.wtype || bag.itemDef?.type;
        const oh = key && classDef.offhand && classDef.offhand[key];
        applyCourageProp(pools, attrs, oh as CourageProp | undefined);
      }
    },
    G,
  );
  if (!walked) return null;

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
  const fp = equippedFingerprint(entity);
  const hit = poolCache.get(id, fp);
  if (hit) return hit;
  const pools = estimateCouragePools(entity);
  if (pools) poolCache.set(id, fp, pools);
  else poolCache.delete(id);
  return pools;
}
