import type { EntityLike } from "../host/globals";

type CouragePools = {
  courage: number;
  mcourage: number;
  pcourage: number;
};

/**
 * Soft xy sync omits courage/fear. Cache courage pools whenever we see a full
 * character glimpse (observe welcome) so we can estimate fear from live aggro
 * without trusting stale welcome `fear`.
 */
const courageById: Record<string, CouragePools> = {};

function readPool(
  ent: EntityLike,
  key: "courage" | "mcourage" | "pcourage",
): number | undefined {
  const v = (ent as Record<string, unknown>)[key];
  return typeof v === "number" ? v : undefined;
}

/** Remember courage pools from a full character packet (welcome / self). */
export function noteCouragePools(ent: EntityLike | null | undefined): void {
  if (!ent || ent.id == null) return;
  const c = readPool(ent, "courage");
  const mc = readPool(ent, "mcourage");
  const pc = readPool(ent, "pcourage");
  if (c == null && mc == null && pc == null) return;
  const id = String(ent.id);
  const prev = courageById[id];
  courageById[id] = {
    courage: c != null ? c : prev ? prev.courage : 0,
    mcourage: mc != null ? mc : prev ? prev.mcourage : 0,
    pcourage: pc != null ? pc : prev ? prev.pcourage : 0,
  };
}

/**
 * Server: fear = max(0, targets_p - courage, targets_m - mcourage,
 * targets_u - pcourage). Without the p/m/u split we bound fear by treating
 * all aggro as hitting the weakest courage pool:
 *   fear ≤ max(0, N - min(courage, mcourage, pcourage)).
 */
export function estimateFearFromAggro(
  pools: CouragePools,
  aggroCount: number,
): number {
  const minC = Math.min(pools.courage, pools.mcourage, pools.pcourage);
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
 * Fear for the watched character: estimate only.
 * Soft sync never refreshes `fear`, so welcome/live fear values are not used.
 */
export function resolveObserverFear(
  live: EntityLike,
  snap: EntityLike | null | undefined,
  entities: EntityLike[],
): number | undefined {
  // Refresh courage cache from any full-character fields we still hold.
  noteCouragePools(snap);
  noteCouragePools(live);

  const id = live.id != null ? String(live.id) : "";
  if (!id) return undefined;
  const pools = courageById[id];
  if (!pools) return undefined;

  const aggro = countMonsterAggroOn(entities, id);
  return estimateFearFromAggro(pools, aggro);
}
