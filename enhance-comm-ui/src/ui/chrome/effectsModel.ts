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
  /** Stack count (`entity.s[id].s`) — woven, stack, … */
  stacks?: number;
  /**
   * Burn intensity (`entity.s.burned.intensity`) — DPS-relevant; shown on-icon.
   * Stock only puts this in the condition card, not the `.iqui` badge.
   */
  intensity?: number;
  /** Monsterhunt kills left (`entity.s.monsterhunt.c`). */
  charges?: number;
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
          intensity:
            typeof actual.intensity === "number" ? actual.intensity : undefined,
          charges: typeof actual.c === "number" ? actual.c : undefined,
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
      intensity:
        typeof actual.intensity === "number" ? actual.intensity : undefined,
      charges: typeof actual.c === "number" ? actual.c : undefined,
      debuff: !!(prop && prop.debuff) || promoted,
      type: "condition",
      // Citizen auras live in entity.s only (no G.conditions) — use live.name.
      name:
        (typeof prop?.name === "string" && prop.name) ||
        (typeof actual.name === "string" && actual.name) ||
        undefined,
    });
  }
  return out;
}

/**
 * On-icon badge text. Prefer stacks (stock `.iqui`), else burn intensity,
 * else hunt kills left. Compact large intensities so they fit 22px tiles.
 */
export function effectBadgeText(effect: BuiltEffect): string | null {
  if (effect.stacks != null && effect.stacks > 0) {
    return String(effect.stacks);
  }
  if (effect.intensity != null && effect.intensity > 0) {
    return formatCompactBadge(effect.intensity);
  }
  if (effect.charges != null && effect.charges > 0) {
    return String(effect.charges);
  }
  return null;
}

/** Compact qty for HUD badges — `999` / `1.2k` / `12k`. */
export function formatCompactBadge(n: number): string {
  const v = Math.round(n);
  if (v < 1000) return String(v);
  if (v < 10000) {
    const k = Math.round(v / 100) / 10;
    return `${k}k`;
  }
  return `${Math.round(v / 1000)}k`;
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
