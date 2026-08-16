import { getG } from "../../host/al";
import type { EntityLike } from "../../host/globals";
import {
  hardCcFallbackSkin,
  PROMOTED_HARD_CC_IDS,
} from "../../lib/controlState";

export type BuiltEffect = {
  id: string;
  skin: string;
  ms?: number;
  stacks?: number;
  debuff?: boolean;
  type: "skill" | "condition";
  name?: string;
};

export function buildEntityEffects(entity: EntityLike): BuiltEffect[] {
  const G = getG();
  const state = entity.s || {};
  const out: BuiltEffect[] = [];
  const keys = Object.keys(state);
  for (let i = 0; i < keys.length; i++) {
    const condition = keys[i];
    const actual = state[condition];
    if (!actual) continue;

    if (G?.skills?.[condition]?.ui) {
      const def = G.skills[condition];
      if (def?.skin) {
        out.push({
          id: condition,
          skin: def.skin,
          ms: actual.ms,
          stacks: typeof actual.s === "number" ? actual.s : undefined,
          debuff: false,
          type: "skill",
          name: typeof def.name === "string" ? def.name : undefined,
        });
      }
      continue;
    }

    const prop = G?.conditions?.[condition];
    const promoted = PROMOTED_HARD_CC_IDS.indexOf(condition) !== -1;
    // Duration debuffs (cursed, poisoned, …) have prop.skin but no ui flag — show on unit frames.
    const debuffIcon = !!(prop && prop.debuff && prop.skin);
    if (
      !actual.skin &&
      !promoted &&
      !debuffIcon &&
      (!prop || (!prop.ui && (!actual.s || actual.s < 20)))
    ) {
      continue;
    }
    if (entity.type === "monster" && condition === "poisonous") continue;
    const skin = actual.skin || prop?.skin || hardCcFallbackSkin(condition);
    if (!skin) continue;
    out.push({
      id: condition,
      skin,
      ms: actual.ms,
      stacks: typeof actual.s === "number" ? actual.s : undefined,
      debuff: !!(prop && prop.debuff) || promoted,
      type: "condition",
      name: typeof prop?.name === "string" ? prop.name : undefined,
    });
  }
  return out;
}

export function effectsKey(effects: BuiltEffect[]): string {
  return effects
    .map((ef) => ef.id)
    .slice()
    .sort()
    .join("|");
}

/**
 * Keep previously seen effect ids in place; append newcomers at the end.
 * Survives Object.keys(entity.s) reshuffles without inserting mid-row.
 */
export function stabilizeEffectOrder<T extends { id: string }>(
  effects: T[],
  orderIds: string[],
): { effects: T[]; orderIds: string[] } {
  const byId: Record<string, T> = {};
  for (let i = 0; i < effects.length; i++) {
    byId[effects[i].id] = effects[i];
  }
  const nextOrder: string[] = [];
  const placed: Record<string, true> = {};
  for (let i = 0; i < orderIds.length; i++) {
    const id = orderIds[i];
    if (byId[id] && !placed[id]) {
      nextOrder.push(id);
      placed[id] = true;
    }
  }
  for (let i = 0; i < effects.length; i++) {
    const id = effects[i].id;
    if (!placed[id]) {
      nextOrder.push(id);
      placed[id] = true;
    }
  }
  const ordered: T[] = [];
  for (let i = 0; i < nextOrder.length; i++) {
    ordered.push(byId[nextOrder[i]]);
  }
  return { effects: ordered, orderIds: nextOrder };
}
