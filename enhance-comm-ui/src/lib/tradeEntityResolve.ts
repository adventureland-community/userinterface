/**
 * Resolve own / inspected trade entities (shared by Market Sell desk + tests).
 */

import type { EntityLike } from "../host/globals";
import { findEntity } from "../queries/entities";
import { tradeRowVisible } from "./tradeSlots";

function snapshotEntity(ent: EntityLike): EntityLike {
  const copy: EntityLike = Object.assign({}, ent);
  if (ent.slots) copy.slots = Object.assign({}, ent.slots);
  return copy;
}

export function resolveInspectedEntity(
  entities: EntityLike[],
  selectedEntity: string | undefined,
  observing: EntityLike | null | undefined,
  cached: EntityLike | null,
): { entity: EntityLike | null; stale: boolean; cache: EntityLike | null } {
  const obsId =
    observing && observing.id != null ? String(observing.id) : "";
  const selectedId =
    selectedEntity != null && selectedEntity !== ""
      ? String(selectedEntity)
      : "";

  if (!selectedId || selectedId === obsId) {
    return { entity: null, stale: false, cache: null };
  }

  const live = findEntity(entities, selectedId);
  if (live) {
    return {
      entity: snapshotEntity(live),
      stale: false,
      cache: snapshotEntity(live),
    };
  }
  if (cached && String(cached.id) === selectedId) {
    return { entity: cached, stale: true, cache: cached };
  }
  return { entity: null, stale: false, cache: null };
}

export function resolveOwnTradeEntity(
  entities: EntityLike[],
  observing: EntityLike | null | undefined,
): EntityLike | null {
  if (!observing || observing.id == null) return null;
  const obsId = String(observing.id);
  return findEntity(entities, obsId) || observing;
}

/** @deprecated use resolveOwnTradeEntity / resolveInspectedEntity */
export function resolveTradePanelEntity(
  entities: EntityLike[],
  selectedEntity: string | undefined,
  observing: EntityLike | null | undefined,
  cached: EntityLike | null,
): { entity: EntityLike | null; stale: boolean; cache: EntityLike | null } {
  const obsId =
    observing && observing.id != null ? String(observing.id) : "";
  const selectedId =
    selectedEntity != null && selectedEntity !== ""
      ? String(selectedEntity)
      : "";

  if (selectedId && selectedId !== obsId) {
    return resolveInspectedEntity(entities, selectedEntity, observing, cached);
  }
  const own = resolveOwnTradeEntity(entities, observing);
  return { entity: own, stale: false, cache: null };
}

export function tradePanelHasContent(
  entity: EntityLike | null,
  gearEditable: boolean,
): boolean {
  if (!entity || !entity.slots) return false;
  if (gearEditable) return true;
  return tradeRowVisible(entity.slots, entity);
}
