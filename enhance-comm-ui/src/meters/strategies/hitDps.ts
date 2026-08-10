import type { EntityLike } from "../../host/globals";
import { findEntity } from "../../queries/entities";
import { getActorDamage } from "../combatMeter";
import { isVisiblePlayer } from "../partyCombat";
import type { RankRow } from "../RankMeter";

const WINDOW_SEC = 10;

/**
 * Rank rows for Hit DPS (10s window).
 * Only includes actors currently visible — same vision set as Combat
 * "Visible parties" (`isVisiblePlayer` / players in the entity snapshot).
 */
export function buildHitDpsRows(
  entities: EntityLike[],
  now = Date.now(),
): RankRow[] {
  const actorDamage = getActorDamage(now);
  const rows: RankRow[] = [];
  const ids = Object.keys(actorDamage);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!isVisiblePlayer(id)) continue;
    const total = actorDamage[id];
    const dps = total / WINDOW_SEC;
    if (dps <= 0) continue;
    const ent = findEntity(entities, id);
    rows.push({
      id,
      name: ent?.name || id,
      ctype: ent?.ctype,
      value: dps,
      barMax: 0,
      label: dps.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    });
  }
  rows.sort((a, b) => b.value - a.value);
  let max = 0;
  for (let i = 0; i < rows.length; i++) {
    max = Math.max(max, rows[i].value);
  }
  for (let i = 0; i < rows.length; i++) {
    rows[i].barMax = max || 1;
  }
  return rows;
}
