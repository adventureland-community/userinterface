/**
 * Temporal Surge has no `action` packet. The caster gets `game_response`;
 * /comm only sees `xy_emit(..., "eval", assassin_smoke(x,y,'icecrack'))`.
 * Never eval that string — parse coordinates only. Duplicate packets are
 * collapsed by the generic cast recorder (no pid).
 */

import type { EntityLike } from "../host/globals";
import { isFocusablePlayer } from "../queries/entities";

export const TEMPORAL_SURGE_ID = "temporalsurge";
/** Server `distance(...) < 160` in the skill handler — not on G.skills. */
export const TEMPORAL_SURGE_RANGE = 160;
export const TEMPORAL_SURGE_ORB = "orboftemporal";

const ICECRACK_SMOKE =
  /assassin_smoke\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*['"]icecrack['"]/;

export function parseIcecrackSmoke(
  code: string | null | undefined,
): { x: number; y: number } | null {
  if (!code) return null;
  const m = ICECRACK_SMOKE.exec(code);
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function gameResponseIsTemporalSurge(response: string): boolean {
  return response === "temporalsurge" || response === "temporalsurge_none";
}

function xyDistance(
  ax: number,
  ay: number,
  ent: EntityLike,
): number {
  const bx = ent.real_x ?? ent.x ?? 0;
  const by = ent.real_y ?? ent.y ?? 0;
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function hasTemporalOrb(ent: EntityLike): boolean {
  const orb = ent.slots?.orb;
  return !!(orb && orb.name === TEMPORAL_SURGE_ORB);
}

/**
 * Caster is within 160 of the spawn fx. Prefer someone wearing the orb.
 */
export function resolveTemporalSurgeCaster(
  x: number,
  y: number,
  entities: EntityLike[],
  range: number = TEMPORAL_SURGE_RANGE,
): EntityLike | undefined {
  let bestOrb: EntityLike | undefined;
  let bestOrbD = Infinity;
  let bestAny: EntityLike | undefined;
  let bestAnyD = Infinity;
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!isFocusablePlayer(ent)) continue;
    const d = xyDistance(x, y, ent);
    if (!(d <= range)) continue;
    if (d < bestAnyD) {
      bestAny = ent;
      bestAnyD = d;
    }
    if (hasTemporalOrb(ent) && d < bestOrbD) {
      bestOrb = ent;
      bestOrbD = d;
    }
  }
  return bestOrb || bestAny;
}
