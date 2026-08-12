/** Shared combat panel / contextual-tour predicates. */

import type { EntityLike } from "../host/globals";
import { aggroByTarget, aggroedMonsters, activeBosses } from "./entities";

export type CombatSignals = {
  hasEnemies: boolean;
  hasThreat: boolean;
  hasBosses: boolean;
  inCombat: boolean;
};

export function combatSignals(entities: EntityLike[]): CombatSignals {
  const hasEnemies = aggroedMonsters(entities).length > 0;
  const hasThreat = Object.keys(aggroByTarget(entities)).length > 0;
  const hasBosses = activeBosses(entities).length > 0;
  return {
    hasEnemies,
    hasThreat,
    hasBosses,
    inCombat: hasEnemies || hasThreat || hasBosses,
  };
}
