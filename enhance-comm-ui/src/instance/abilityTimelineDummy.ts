/**
 * Layout-edit / Settings dummy casters.
 * Settings passes an epoch so remaining loops (CD + ready hold).
 */

import { getG } from "../host/al";
import { getInstanceMobLabel } from "./labels";
import {
  type AbilityTimelinePanelModel,
  type AbilityTimelineSection,
  decorateAbilityRow,
} from "./abilityTimelineModel";
import type { AbilityTimelinePrefs } from "./abilityTimelinePrefs";

export type AbilityPreviewAbility = {
  id: string;
  name: string;
  cooldown: number;
  phaseMs: number;
};

export type AbilityPreviewCaster = {
  mtype: string;
  name: string;
  abilities: AbilityPreviewAbility[];
};

/** Sit at NOW between looping preview CDs (matches overlay sim). */
export const PREVIEW_READY_HOLD_MS = 2800;

/** Preferred default mtypes when G is available. First two found are shown. */
const PREFERRED_DEFAULTS = ["gpurplepro", "xmagefi", "a2"];

function skillName(id: string): string {
  try {
    const g = getG()?.skills?.[id]?.name;
    if (typeof g === "string" && g) return g;
  } catch {
    /* no window.G in node tests */
  }
  return id.replace(/_/g, " ");
}

function trackableFromDef(
  mtype: string,
  def: { name?: string; abilities?: Record<string, any> },
): AbilityPreviewCaster | null {
  const abilities = def.abilities;
  if (!abilities || typeof abilities !== "object") return null;
  const ids = Object.keys(abilities);
  const rows: AbilityPreviewAbility[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const ab = abilities[id] || {};
    if (ab.aura || ab.unlimited) continue;
    if (typeof ab.cooldown !== "number" || !(ab.cooldown > 0)) continue;
    rows.push({
      id,
      name: skillName(id),
      cooldown: ab.cooldown,
      phaseMs: i * 1400,
    });
  }
  if (!rows.length) return null;
  return {
    mtype,
    name: getInstanceMobLabel(mtype) || def.name || mtype,
    abilities: rows,
  };
}

/**
 * Settings preview roster — every monster in G.monsters with at least one
 * trackable cooldown ability, sorted by name.
 */
export function listAbilityPreviewCasters(): AbilityPreviewCaster[] {
  let monsters: Record<string, any> | undefined;
  try {
    monsters = getG()?.monsters;
  } catch {
    monsters = undefined;
  }
  if (!monsters) return [];
  const out: AbilityPreviewCaster[] = [];
  const mtypes = Object.keys(monsters);
  for (let i = 0; i < mtypes.length; i++) {
    const caster = trackableFromDef(mtypes[i], monsters[mtypes[i]]);
    if (caster) out.push(caster);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function defaultAbilityPreviewMtypes(): string[] {
  const all = listAbilityPreviewCasters();
  if (!all.length) return [];
  const out: string[] = [];
  for (let i = 0; i < PREFERRED_DEFAULTS.length; i++) {
    const mtype = PREFERRED_DEFAULTS[i];
    for (let j = 0; j < all.length; j++) {
      if (all[j].mtype === mtype) {
        out.push(mtype);
        if (out.length >= 2) return out;
        break;
      }
    }
  }
  if (out.length) return out;
  return [all[0].mtype];
}

export function loopPreviewRemaining(
  cooldown: number,
  phaseMs: number,
  now: number,
  epoch: number,
): { ms: number; cycle: number } {
  if (!(cooldown > 0)) return { ms: 0, cycle: 0 };
  const period = cooldown + PREVIEW_READY_HOLD_MS;
  const t = Math.max(0, now - epoch + phaseMs);
  const cycle = Math.floor(t / period);
  const elapsed = t % period;
  if (elapsed >= cooldown) return { ms: 0, cycle };
  const ms = elapsed === 0 ? cooldown : cooldown - elapsed;
  return { ms, cycle };
}

function pickCasters(mtypes?: string[]): AbilityPreviewCaster[] {
  const all = listAbilityPreviewCasters();
  const want = mtypes === undefined ? PREFERRED_DEFAULTS : mtypes;
  const out: AbilityPreviewCaster[] = [];
  for (let i = 0; i < want.length; i++) {
    const mtype = want[i];
    let found: AbilityPreviewCaster | null = null;
    for (let j = 0; j < all.length; j++) {
      if (all[j].mtype === mtype) {
        found = all[j];
        break;
      }
    }
    if (found) out.push(found);
  }
  return out;
}

/**
 * @param epoch Frozen start so Settings CDs tick and loop.
 * Layout-edit HUD can omit epoch (static remaining for placement).
 */
export function dummyAbilityTimelineModel(
  prefs: AbilityTimelinePrefs,
  now: number = Date.now(),
  epoch?: number,
  mtypes?: string[],
): AbilityTimelinePanelModel {
  const casters = pickCasters(mtypes);
  const sections: AbilityTimelineSection[] = [];
  for (let i = 0; i < casters.length; i++) {
    const caster = casters[i];
    const rows: AbilityTimelineSection["rows"] = [];
    for (let j = 0; j < caster.abilities.length; j++) {
      const ab = caster.abilities[j];
      if (prefs.minCooldownMs > 0 && ab.cooldown < prefs.minCooldownMs)
        continue;
      let ms = ab.cooldown;
      let endsAt = 0;
      let castGen = 0;
      if (epoch != null) {
        const looped = loopPreviewRemaining(
          ab.cooldown,
          ab.phaseMs,
          now,
          epoch,
        );
        ms = looped.ms;
        castGen = looped.cycle;
        endsAt = ms > 0 ? now + ms : 0;
      }
      const row = decorateAbilityRow(
        ab.id,
        ab.name,
        ms,
        ab.cooldown,
        prefs,
        castGen,
        endsAt,
      );
      if (row) rows.push(row);
    }
    if (!rows.length) continue;
    sections.push({
      targetId: "dummy-" + caster.mtype,
      targetName: caster.name,
      targetMtype: caster.mtype,
      rows,
    });
  }
  return { sections };
}
