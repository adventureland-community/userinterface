/**
 * Live section labels for instance cards — e.g. "Bats · 3 visible · 7 in pack".
 * Pack size from G.maps[map].monsters[].count when design lists those mtypes.
 */

import { getG } from "../host/al";
import type { EntityLike } from "../host/globals";

/** Visible monsters whose mtype is in `mtypes`. */
export function countVisibleOfMtypes(
  entities: EntityLike[],
  mtypes: string[],
): number {
  if (!mtypes.length) return 0;
  const want = new Set(mtypes);
  let n = 0;
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent.type !== "monster" || !ent.visible || ent.dead) continue;
    if (ent.mtype && want.has(ent.mtype)) n += 1;
  }
  return n;
}

/**
 * Sum of design pack counts for matching mtypes on this map.
 * Returns null when G has no monsters list / no matching rows.
 */
export function mapDesignPackCount(
  map: string | undefined,
  mtypes: string[],
): number | null {
  if (!map || !mtypes.length) return null;
  const packs = getG()?.maps?.[map]?.monsters;
  if (!Array.isArray(packs) || !packs.length) return null;
  const want = new Set(mtypes);
  let total = 0;
  let matched = false;
  for (let i = 0; i < packs.length; i++) {
    const row = packs[i];
    if (!row || typeof row.type !== "string" || !want.has(row.type)) continue;
    matched = true;
    const c =
      typeof row.count === "number" && row.count > 0
        ? Math.floor(row.count)
        : 1;
    total += c;
  }
  return matched ? total : null;
}

/** Mockup-style section header: "Bats · 3 visible · 7 in pack". */
export function formatSectionLabel(
  base: string,
  visible: number,
  pack: number | null,
): string {
  if (pack != null && pack > 0) {
    return `${base} · ${visible} visible · ${pack} in pack`;
  }
  if (visible > 0) return `${base} · ${visible} visible`;
  return base;
}
