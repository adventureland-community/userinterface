/** Map-space coordinates for entities (real_x/y preferred). */

import type { EntityLike } from "../host/globals";

export function entityMapXY(
  ent: Pick<EntityLike, "real_x" | "real_y" | "x" | "y"> | null | undefined,
): { x: number; y: number } | null {
  if (!ent) return null;
  const x = ent.real_x ?? ent.x;
  const y = ent.real_y ?? ent.y;
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isFinite(x + y)) return null;
  return { x, y };
}
