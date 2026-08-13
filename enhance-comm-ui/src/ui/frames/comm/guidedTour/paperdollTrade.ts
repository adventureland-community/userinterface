/**
 * Paperdoll trade-slot detection for tour triggers.
 */

import type { EntityLike } from "../../../../host/globals";

/** True when the entity has filled trade* slots (merchant / player stand). */
export function entityHasTradeSlots(
  entity: EntityLike | null | undefined,
): boolean {
  if (!entity || !entity.slots) return false;
  const slots = entity.slots;
  const keys = Object.keys(slots);
  for (let i = 0; i < keys.length; i++) {
    const name = keys[i];
    if (name.indexOf("trade") !== 0) continue;
    if (slots[name]) return true;
  }
  return false;
}
