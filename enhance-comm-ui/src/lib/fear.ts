import { getG } from "../host/al";
import type { EntityLike } from "../host/globals";
import { estimateCouragePoolsCached, type CouragePools } from "./courage";

export type AggroByDamage = {
  physical: number;
  magical: number;
  pure: number;
};

/**
 * Server fear = max(0, targets_p - courage, targets_m - mcourage,
 * targets_u - pcourage). Monster damage_type selects the pool.
 */
export function estimateFearFromAggro(
  pools: CouragePools,
  aggro: AggroByDamage,
): number {
  return Math.max(
    0,
    aggro.physical - pools.courage,
    aggro.magical - pools.mcourage,
    aggro.pure - pools.pcourage,
  );
}

function monsterDamageType(ent: EntityLike): "physical" | "magical" | "pure" {
  const live = ent.damage_type;
  if (live === "magical" || live === "pure" || live === "physical") return live;
  const G = getG();
  const key = String(ent.mtype || "");
  const def = G && G.monsters && key ? G.monsters[key] : undefined;
  const dt = def && def.damage_type;
  if (dt === "magical" || dt === "pure" || dt === "physical") return dt;
  return "physical";
}

/** Split already-filtered aggro mobs by damage type (p / m / u). */
export function aggroByDamageFromMobs(mobs: EntityLike[]): AggroByDamage {
  const out: AggroByDamage = { physical: 0, magical: 0, pure: 0 };
  for (let i = 0; i < mobs.length; i++) {
    const dt = monsterDamageType(mobs[i]);
    if (dt === "magical") out.magical++;
    else if (dt === "pure") out.pure++;
    else out.physical++;
  }
  return out;
}

/**
 * Simulated fear for self, party, and soft-synced players.
 * Packet `fear` is connect-time only (not on entities) — never trust it.
 * Courage from gear/class estimate + typed aggro on this player.
 * Ctype enrichment lives in `estimateCouragePools` (not here).
 */
export function estimatePlayerFear(
  player: EntityLike,
  aggroMobs: EntityLike[],
): number | undefined {
  const pools = estimateCouragePoolsCached(player);
  if (!pools) return undefined;
  return estimateFearFromAggro(pools, aggroByDamageFromMobs(aggroMobs));
}
