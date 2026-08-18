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

const FALLBACK_CASTERS: AbilityPreviewCaster[] = [
  {
    mtype: "a2",
    name: "Bill",
    abilities: [{ id: "anger", name: "Anger", cooldown: 8000, phaseMs: 2000 }],
  },
  {
    mtype: "a3",
    name: "Lestat",
    abilities: [{ id: "anger", name: "Anger", cooldown: 8000, phaseMs: 1600 }],
  },
  {
    mtype: "a5",
    name: "Elena",
    abilities: [
      { id: "healing", name: "Healing", cooldown: 800, phaseMs: 0 },
    ],
  },
  {
    mtype: "a7",
    name: "Lucinda",
    abilities: [{ id: "mlight", name: "Light", cooldown: 3000, phaseMs: 800 }],
  },
  {
    mtype: "gpurplepro",
    name: "Protector of Darkness",
    abilities: [
      { id: "anger", name: "Anger", cooldown: 12000, phaseMs: 0 },
      { id: "warpstomp", name: "Warpstomp", cooldown: 8000, phaseMs: 2500 },
    ],
  },
  {
    mtype: "ggreenpro",
    name: "Protector of Nature",
    abilities: [
      { id: "tangle", name: "Tangle", cooldown: 1600, phaseMs: 400 },
      { id: "self_healing", name: "Healing", cooldown: 2000, phaseMs: 900 },
    ],
  },
  {
    mtype: "gbluepro",
    name: "Protector of Frost",
    abilities: [
      { id: "multi_freeze", name: "Multi Freeze", cooldown: 4000, phaseMs: 1200 },
    ],
  },
  {
    mtype: "icegolem",
    name: "Ice Golem",
    abilities: [
      { id: "multi_freeze", name: "Multi Freeze", cooldown: 4000, phaseMs: 600 },
    ],
  },
  {
    mtype: "xmagefz",
    name: "Mage · Frozen",
    abilities: [
      { id: "deepfreeze", name: "Deepfreeze", cooldown: 6000, phaseMs: 0 },
    ],
  },
  {
    mtype: "xmagefi",
    name: "Mage · Fire",
    abilities: [
      { id: "anger", name: "Anger", cooldown: 8000, phaseMs: 0 },
      { id: "multi_burn", name: "Multi Burn", cooldown: 4000, phaseMs: 1800 },
    ],
  },
  {
    mtype: "xmagen",
    name: "Mage · Nature",
    abilities: [
      { id: "self_healing", name: "Healing", cooldown: 2000, phaseMs: 400 },
      { id: "mtangle", name: "Tangle", cooldown: 1600, phaseMs: 1100 },
    ],
  },
  {
    mtype: "xmagex",
    name: "Dark Mage",
    abilities: [
      { id: "anger", name: "Anger", cooldown: 8000, phaseMs: 500 },
      { id: "warpstomp", name: "Warpstomp", cooldown: 4000, phaseMs: 2200 },
    ],
  },
];

export const DEFAULT_PREVIEW_MTYPES = ["gpurplepro", "a2"];

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
 * Curated Settings preview roster. Live G fills CDs/names when present;
 * scanning every G.monsters entry would flood the picker.
 */
export function listAbilityPreviewCasters(): AbilityPreviewCaster[] {
  let monsters: Record<string, any> | undefined;
  try {
    monsters = getG()?.monsters;
  } catch {
    monsters = undefined;
  }
  const out: AbilityPreviewCaster[] = [];
  for (let i = 0; i < FALLBACK_CASTERS.length; i++) {
    const seed = FALLBACK_CASTERS[i];
    const def = monsters?.[seed.mtype];
    const live = def ? trackableFromDef(seed.mtype, def) : null;
    out.push(
      live || {
        ...seed,
        name: getInstanceMobLabel(seed.mtype) || seed.name,
      },
    );
  }
  return out;
}

export function defaultAbilityPreviewMtypes(): string[] {
  const all = listAbilityPreviewCasters();
  const out: string[] = [];
  for (let i = 0; i < DEFAULT_PREVIEW_MTYPES.length; i++) {
    const mtype = DEFAULT_PREVIEW_MTYPES[i];
    for (let j = 0; j < all.length; j++) {
      if (all[j].mtype === mtype) {
        out.push(mtype);
        break;
      }
    }
  }
  if (out.length) return out;
  if (all[0]) return [all[0].mtype];
  return [];
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
  const want = mtypes === undefined ? DEFAULT_PREVIEW_MTYPES : mtypes;
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
      let ms = ab.cooldown;
      let endsAt = 0;
      let castGen = 0;
      if (epoch != null) {
        const looped = loopPreviewRemaining(ab.cooldown, ab.phaseMs, now, epoch);
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
