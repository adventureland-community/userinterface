/** Shared combat panel / contextual-tour predicates + aggro index. */

import type { EntityLike } from "../host/globals";
import { aggroByTarget, aggroedMonsters, activeBosses } from "./entities";

export type CombatSignals = {
  /** One aggro map per tick — pass to Players / Threat / unit frames. */
  byTarget: Record<string, EntityLike[]>;
  hasEnemies: boolean;
  hasThreat: boolean;
  hasBosses: boolean;
  inCombat: boolean;
};

export function combatSignals(entities: EntityLike[]): CombatSignals {
  const byTarget = aggroByTarget(entities);
  const hasEnemies = aggroedMonsters(entities).length > 0;
  const hasThreat = Object.keys(byTarget).length > 0;
  const hasBosses = activeBosses(entities).length > 0;
  return {
    byTarget,
    hasEnemies,
    hasThreat,
    hasBosses,
    inCombat: hasEnemies || hasThreat || hasBosses,
  };
}
