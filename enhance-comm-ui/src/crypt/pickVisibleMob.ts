import type { EntityLike } from "../host/globals";

/**
 * Prefer an aggroed mob of this mtype (on self, then any target), else first
 * visible. Entity list order is often ascending id — first-match alone picks
 * the wrong bat when several Vampirelings are in vision.
 */
export function pickVisibleCryptMob(
  entities: EntityLike[],
  mtype: string,
  selfId?: string,
): EntityLike | undefined {
  let onSelf: EntityLike | undefined;
  let aggroed: EntityLike | undefined;
  let first: EntityLike | undefined;
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (!entity) continue;
    if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
    if (entity.mtype !== mtype) continue;
    if (!first) first = entity;
    if (entity.target == null || entity.target === "") continue;
    if (!aggroed) aggroed = entity;
    if (selfId && String(entity.target) === selfId) {
      onSelf = entity;
      break;
    }
  }
  return onSelf || aggroed || first;
}
