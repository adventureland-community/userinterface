import type { EntityLike } from "../host/globals";

/**
 * Soft xy sync uses `player_to_client(player, stranger=1)`, which omits
 * `fear` / courage. Full character (observe welcome / self) includes them.
 *
 * Server: fear = max(0, targets_p - courage, targets_m - mcourage,
 * targets_u - pcourage). Without the p/m/u split we bound fear by treating
 * all aggro as hitting the weakest courage pool:
 *   fear ≤ max(0, N - min(courage, mcourage, pcourage)).
 */
export function estimateFearFromAggro(
  courageSource: EntityLike,
  aggroCount: number,
): number | null {
  const c = (courageSource as { courage?: number }).courage;
  const mc = (courageSource as { mcourage?: number }).mcourage;
  const pc = (courageSource as { pcourage?: number }).pcourage;
  const vals: number[] = [];
  if (typeof c === "number") vals.push(c);
  if (typeof mc === "number") vals.push(mc);
  if (typeof pc === "number") vals.push(pc);
  if (!vals.length) return null;
  let minC = vals[0];
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] < minC) minC = vals[i];
  }
  return Math.max(0, aggroCount - minC);
}

export function countMonsterAggroOn(
  entities: EntityLike[],
  targetId: string,
): number {
  let n = 0;
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent.type !== "monster" || ent.target == null) continue;
    if (String(ent.target) === targetId) n++;
  }
  return n;
}

/**
 * Resolve courage-overflow fear for the watched character.
 * Prefers a live numeric `fear` (self / rare full packets); otherwise
 * estimates from welcome-snap courage + current monster aggro; last resort
 * is the welcome snap's fear (observe-switch moment).
 */
export function resolveObserverFear(
  live: EntityLike,
  snap: EntityLike | null | undefined,
  entities: EntityLike[],
): number | undefined {
  const liveFear = (live as { fear?: number }).fear;
  if (typeof liveFear === "number") return liveFear;

  const id = live.id != null ? String(live.id) : "";
  const aggro = id ? countMonsterAggroOn(entities, id) : 0;
  const courageSrc =
    snap && snap.id != null && String(snap.id) === id ? snap : live;
  const estimated = estimateFearFromAggro(courageSrc, aggro);
  if (estimated != null) return estimated;

  if (snap && typeof (snap as { fear?: number }).fear === "number") {
    return (snap as { fear?: number }).fear;
  }
  return undefined;
}
