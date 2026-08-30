/**
 * Whether gear commands target the watched character (not arbitrary paperdolls).
 */

import { getObserving } from "./al";
import type { EntityLike } from "./globals";

export function isObservedSelf(entity: EntityLike | null | undefined): boolean {
  const obs = getObserving() || window.observing;
  if (!entity || !obs || entity.id == null || obs.id == null) return false;
  return String(entity.id) === String(obs.id);
}

export function canEditObservedGear(
  entity: EntityLike | null | undefined,
  stale?: boolean,
): boolean {
  if (stale) return false;
  return isObservedSelf(entity);
}

/** Bag drag / context menus — watched character inventory only. */
export function canEditObservedBag(): boolean {
  return canEditObservedGear(window.observing);
}
