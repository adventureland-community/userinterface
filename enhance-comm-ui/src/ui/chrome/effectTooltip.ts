/**
 * Buff/debuff tip content — plain text + structured model for the Comm cooltip.
 * Mirrors stock `render_condition` → `render_item` fields from G.conditions
 * (adventureland_mongodb design/conditions.js + js/html.js), plus live
 * entity.s fields the dialog merges in (caster `f`, `strong`, stacks).
 */
import { getCharacter, getG } from "../../host/al";
import type { EntityLike, GConditionDef, StatusLike } from "../../host/globals";
import { formatTime } from "../../lib/format";
import type { BuiltEffect } from "./effectsModel";

/** Keys that are meta / not shown as stat lines (stock skips these too). */
const META_KEYS: Record<string, true> = {
  name: true,
  skin: true,
  explanation: true,
  buff: true,
  debuff: true,
  ui: true,
  persistent: true,
  technical: true,
  aura: true,
  duration: true,
  duration_min: true,
  channel: true,
  blocked: true,
  can_move: true,
  special: true,
  attr0: true,
  encouragement: true,
  phases: true,
  // Live status keys — handled explicitly.
  ms: true,
  f: true,
  fid: true,
  s: true,
  strong: true,
  c: true,
  id: true,
  sn: true,
  dl: true,
  last: true,
  map: true,
  in: true,
  x: true,
  y: true,
  p: true,
  /** Citizen NPC auras (`player.s.citizen0aura.citizens`). */
  citizens: true,
  /** Hunt / kill-quest live keys (`monsterhunt`, `quest_beekeeper`, …). */
  tc: true,
  reward: true,
  d: true,
  t: true,
};

export type EffectTipStatLine = { label: string; value: string };

export type HuntTargetInfo = {
  mtype: string;
  name: string;
};

export type EffectTipModel = {
  id: string;
  name: string;
  kind: "Skill" | "Debuff" | "Buff" | "Aura";
  explanation?: string;
  stats: EffectTipStatLine[];
  from?: string;
  /** Monsterhunt / kill-quest target (`entity.s.*.id` → G.monsters). */
  target?: HuntTargetInfo;
  /** mluck from same-owner merchant — other casters cannot replace. */
  strong?: boolean;
  /**
   * Strong mluck that `character` cannot refresh (server: strong && f ≠ you).
   * True when locked for the local character / observer.
   */
  locked?: boolean;
  stacks?: number;
  intensity?: number;
  charges?: number;
  remainingMs?: number;
};

/**
 * Server mluck: replace only if !strong || f === caster.name.
 * Same-account other chars still cannot override someone else's strong luck.
 */
export function canOverrideStrongStatus(
  live: StatusLike | null | undefined,
  self?: EntityLike | null,
): boolean {
  if (!live || !live.strong) return true;
  const me = self === undefined ? getCharacter() : self;
  if (!me || me.name == null || me.name === "") return false;
  return String(live.f || "") === String(me.name);
}

/** Citizen aura ids are `citizen0aura` … — not in G.conditions; live + G.npcs. */
const CITIZEN_AURA_RE = /^citizen\d+aura$/i;

export type CitizenAuraInfo = {
  isCitizen: boolean;
  npcKey?: string;
  npcName?: string;
};

/**
 * Resolve Kane / Angel / … from a citizen*aura status id + G.npcs.
 * Server writes `player.s[npc.ntype+"aura"]` with `citizens: true` and aura stats.
 */
export function resolveCitizenAura(
  effectId: string,
  live?: StatusLike | null,
): CitizenAuraInfo {
  const flagged = !!(live && live.citizens);
  const byId = CITIZEN_AURA_RE.test(effectId);
  if (!flagged && !byId) return { isCitizen: false };
  const npcKey = effectId.replace(/aura$/i, "");
  const npc = getG()?.npcs?.[npcKey];
  const npcName =
    npc && typeof npc.name === "string" && npc.name ? npc.name : undefined;
  return { isCitizen: true, npcKey, npcName };
}

function isAuraEffect(
  effectId: string,
  def: GConditionDef | undefined,
  live: StatusLike | undefined,
  citizen: CitizenAuraInfo,
): boolean {
  if (citizen.isCitizen) return true;
  if (def && def.aura) return true;
  if (/aura$/i.test(effectId)) return true;
  if (live && live.citizens) return true;
  return false;
}

function citizenAuraExplanation(citizen: CitizenAuraInfo): string {
  if (citizen.npcName) {
    return `${citizen.npcName}'s town aura — stay nearby to keep it.`;
  }
  return "A town citizen's aura — stay nearby to keep it.";
}

/**
 * Monsterhunt / kill quests store the target mtype on live `id` and kills on `c`.
 * Daisy: "go defeat N {G.monsters[id].name}".
 */
export function resolveHuntTarget(
  effectId: string,
  live?: StatusLike | null,
): HuntTargetInfo | undefined {
  if (!live || typeof live.id !== "string" || !live.id) return undefined;
  const mtype = live.id;
  const mon = getG()?.monsters?.[mtype];
  if (!mon) return undefined;
  const huntLike =
    effectId === "monsterhunt" ||
    effectId === "quest_beekeeper" ||
    live.t === "quest_kill" ||
    /^quest_/.test(effectId);
  if (!huntLike) return undefined;
  const name =
    typeof mon.name === "string" && mon.name ? mon.name : mtype;
  return { mtype, name };
}

function huntExplanation(
  target: HuntTargetInfo,
  killsLeft: number | undefined,
): string {
  if (killsLeft == null || killsLeft <= 0) {
    return `Hunt complete — return with your ${target.name} kill.`;
  }
  if (killsLeft === 1) {
    return `Defeat ${target.name} and return.`;
  }
  return `Defeat ${killsLeft} ${target.name}s and return.`;
}

function signedPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n}%`;
}

function signedNum(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}

function prettyFloat(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const t = Math.round(n * 100) / 100;
  return String(t);
}

/**
 * Format one G.conditions / merged-status prop the way stock `render_item` does.
 * Returns null when the key is meta or not a displayable number/string.
 */
export function formatConditionStatLine(
  key: string,
  raw: unknown,
): EffectTipStatLine | null {
  if (META_KEYS[key]) return null;
  if (raw == null || raw === false) return null;

  if (key === "luck" && typeof raw === "number") {
    return { label: "Luck", value: signedPct(raw) };
  }
  if (key === "gold" && typeof raw === "number") {
    return { label: "Gold", value: signedPct(raw) };
  }
  if (key === "xp" && typeof raw === "number") {
    return { label: "XP", value: signedPct(raw) };
  }
  if (key === "lifesteal" && typeof raw === "number") {
    return { label: "Lifesteal", value: `${prettyFloat(raw)}%` };
  }
  if (key === "manasteal" && typeof raw === "number") {
    return { label: "Manasteal", value: `${prettyFloat(raw)}%` };
  }
  if (key === "evasion" && typeof raw === "number") {
    return { label: "Evasion", value: `${prettyFloat(raw)}%` };
  }
  if (key === "miss" && typeof raw === "number") {
    return { label: "Miss", value: `${raw}%` };
  }
  if (key === "reflection" && typeof raw === "number") {
    return { label: "Reflection", value: `${prettyFloat(raw)}%` };
  }
  if (key === "cap_reflection" && typeof raw === "number") {
    return { label: "Reflection Cap", value: `${prettyFloat(raw)}%` };
  }
  if (key === "output" && typeof raw === "number") {
    return { label: "Damage Output", value: signedPct(raw) };
  }
  if (key === "incdmgamp" && typeof raw === "number") {
    return { label: "Incoming Damage", value: `${raw}%` };
  }
  if (key === "frequency" && typeof raw === "number") {
    return { label: "A.Speed", value: String(raw) };
  }
  if (key === "frequencym" && typeof raw === "number") {
    return { label: "A.Speed", value: `×${prettyFloat(raw)}` };
  }
  if (key === "speed" && typeof raw === "number") {
    return { label: "Speed", value: signedNum(raw) };
  }
  if (key === "set_speed" && typeof raw === "number") {
    return { label: "Max Speed", value: String(raw) };
  }
  if (key === "armor" && typeof raw === "number") {
    return { label: "Armor", value: String(raw) };
  }
  if (key === "resistance" && typeof raw === "number") {
    return { label: "Resistance", value: String(raw) };
  }
  if (key === "str" && typeof raw === "number") {
    return { label: "Strength", value: String(raw) };
  }
  if (key === "int" && typeof raw === "number") {
    return { label: "Intelligence", value: String(raw) };
  }
  if (key === "dex" && typeof raw === "number") {
    return { label: "Dexterity", value: String(raw) };
  }
  if (key === "vit" && typeof raw === "number") {
    return { label: "Vitality", value: String(raw) };
  }
  if (key === "for" && typeof raw === "number") {
    return { label: "Fortitude", value: String(raw) };
  }
  if (key === "hp" && typeof raw === "number") {
    return { label: "HP", value: String(raw) };
  }
  if (key === "mp" && typeof raw === "number") {
    return { label: "MP", value: String(raw) };
  }
  if (key === "mp_cost" && typeof raw === "number") {
    return {
      label: "Attack MP Cost",
      value: raw > 0 ? `+${raw}` : String(raw),
    };
  }
  if (key === "courage" && typeof raw === "number") {
    return { label: "Courage", value: String(raw) };
  }
  if (key === "mcourage" && typeof raw === "number") {
    return { label: "M.Courage", value: String(raw) };
  }
  if (key === "pcourage" && typeof raw === "number") {
    return { label: "P.Courage", value: String(raw) };
  }
  if (key === "heal" && typeof raw === "number") {
    return { label: "Heal", value: String(raw) };
  }
  if (key === "healm" && typeof raw === "number") {
    return { label: "Heal", value: `×${prettyFloat(raw)}` };
  }
  if (key === "damage" && typeof raw === "number") {
    return { label: "Damage", value: String(raw) };
  }
  if (key === "interval" && typeof raw === "number") {
    return { label: "Interval", value: `${raw}ms` };
  }
  if (key === "intensity" && typeof raw === "number") {
    return { label: "Intensity", value: String(Math.round(raw)) };
  }
  if (key === "potionsm" && typeof raw === "number") {
    return { label: "Potion Effect", value: `×${prettyFloat(raw)}` };
  }
  // Unknown numeric / short string — skip opaque blobs (objects, long strings).
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { label: key, value: String(raw) };
  }
  return null;
}

function mergeConditionProp(
  def: GConditionDef | undefined,
  live: StatusLike | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (def) {
    const keys = Object.keys(def);
    for (let i = 0; i < keys.length; i++) {
      out[keys[i]] = (def as Record<string, unknown>)[keys[i]];
    }
  }
  if (live) {
    const keys = Object.keys(live);
    for (let i = 0; i < keys.length; i++) {
      out[keys[i]] = live[keys[i]];
    }
  }
  return out;
}

function propHasIntensityLine(prop: Record<string, unknown>): boolean {
  return typeof prop.intensity === "number" && prop.intensity > 0;
}

/** Structured tip fields for plain text or HTML cooltip. */
export function buildEffectTipModel(
  effect: BuiltEffect,
  entity?: EntityLike | null,
  remainingMs?: number,
): EffectTipModel {
  const G = getG();
  const def =
    effect.type === "condition"
      ? G?.conditions?.[effect.id]
      : G?.skills?.[effect.id];
  const live = entity?.s?.[effect.id];
  const citizen = resolveCitizenAura(effect.id, live);
  const aura = isAuraEffect(
    effect.id,
    effect.type === "condition" ? def : undefined,
    live,
    citizen,
  );

  const liveName =
    live && typeof live.name === "string" && live.name ? live.name : undefined;
  const defName =
    def && typeof (def as GConditionDef).name === "string"
      ? (def as GConditionDef).name
      : undefined;
  // Prefer "Kane's Aura" over generic "Citizen's Aura" / raw id.
  const name = citizen.isCitizen && citizen.npcName
    ? `${citizen.npcName}'s Aura`
    : effect.name || liveName || defName || effect.id;

  let kind: EffectTipModel["kind"];
  if (effect.type === "skill") kind = "Skill";
  else if (effect.debuff) kind = "Debuff";
  else if (aura) kind = "Aura";
  else kind = "Buff";

  // For citizen auras, fold G.npcs[citizenN].aura stats when live omitted them.
  let npcAura: Record<string, unknown> | undefined;
  if (citizen.isCitizen && citizen.npcKey) {
    const npc = G?.npcs?.[citizen.npcKey];
    if (npc && npc.aura && typeof npc.aura === "object") {
      npcAura = npc.aura as Record<string, unknown>;
    }
  }

  const prop = mergeConditionProp(
    effect.type === "condition" ? def : undefined,
    live,
  );
  if (npcAura) {
    const auraKeys = Object.keys(npcAura);
    for (let i = 0; i < auraKeys.length; i++) {
      const k = auraKeys[i];
      if (prop[k] == null) prop[k] = npcAura[k];
    }
  }

  const target = resolveHuntTarget(effect.id, live);

  const charges =
    effect.charges != null && effect.charges > 0
      ? effect.charges
      : live && typeof live.c === "number" && live.c > 0
        ? live.c
        : undefined;

  const killsForCopy =
    charges != null
      ? charges
      : live && typeof live.c === "number"
        ? live.c
        : undefined;

  const explanation =
    (target ? huntExplanation(target, killsForCopy) : undefined) ||
    (def && typeof (def as GConditionDef).explanation === "string"
      ? (def as GConditionDef).explanation
      : undefined) ||
    (typeof prop.explanation === "string" ? prop.explanation : undefined) ||
    (citizen.isCitizen ? citizenAuraExplanation(citizen) : undefined);

  const stats: EffectTipStatLine[] = [];
  const propKeys = Object.keys(prop);
  for (let i = 0; i < propKeys.length; i++) {
    const line = formatConditionStatLine(propKeys[i], prop[propKeys[i]]);
    if (line) stats.push(line);
  }

  const fromCaster =
    live && typeof live.f === "string" && live.f ? live.f : undefined;
  const from =
    fromCaster ||
    (citizen.isCitizen && citizen.npcName ? citizen.npcName : undefined);
  const strong = !!(live && live.strong);
  const locked = strong && !canOverrideStrongStatus(live) ? true : undefined;

  const stacks =
    effect.stacks != null && effect.stacks > 0
      ? effect.stacks
      : live && typeof live.s === "number" && live.s > 0
        ? live.s
        : undefined;

  const intensityRaw =
    effect.intensity != null && effect.intensity > 0
      ? effect.intensity
      : live && typeof live.intensity === "number" && live.intensity > 0
        ? live.intensity
        : undefined;
  const intensity =
    intensityRaw != null && intensityRaw > 0 && !propHasIntensityLine(prop)
      ? intensityRaw
      : undefined;

  const remain =
    remainingMs != null && remainingMs > 0 ? remainingMs : undefined;

  return {
    id: effect.id,
    name,
    kind,
    explanation,
    stats,
    from,
    target,
    strong: strong || undefined,
    locked,
    stacks,
    intensity,
    charges,
    remainingMs: remain,
  };
}

/**
 * Plain-text tip (overflow chips / tests). Prefer the Comm cooltip on icons.
 * Order: From → Strong/Locked → explanation → stats → …
 */
export function effectTooltip(
  effect: BuiltEffect,
  entity?: EntityLike | null,
  remainingMs?: number,
): string {
  const m = buildEffectTipModel(effect, entity, remainingMs);
  const parts: string[] = [`${m.name} (${m.kind})`];
  if (m.from) parts.push(`From: ${m.from}`);
  if (m.strong) {
    parts.push(m.locked ? "Strong: Yes (locked)" : "Strong: Yes");
  }
  if (m.explanation) parts.push(m.explanation);
  for (let i = 0; i < m.stats.length; i++) {
    parts.push(`${m.stats[i].label}: ${m.stats[i].value}`);
  }
  if (m.target) parts.push(`Target: ${m.target.name}`);
  if (m.stacks != null && m.stacks > 0) parts.push(`Stacks: ${m.stacks}`);
  if (m.intensity != null && m.intensity > 0) {
    parts.push(`Intensity: ${Math.round(m.intensity)}`);
  }
  if (m.charges != null && m.charges > 0) {
    parts.push(`Kills left: ${m.charges}`);
  }
  if (m.remainingMs != null && m.remainingMs > 0) {
    parts.push(`Remaining: ${formatTime(m.remainingMs / 1000)}`);
  }
  return parts.join("\n");
}
