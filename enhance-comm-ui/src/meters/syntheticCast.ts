/**
 * Skills that do not go through commence_attack (`action` + pid).
 *
 * Server (`node/server.js` use_skill):
 * - Most of those emit `xy_emit(..., "ui", { type: skill, name|from, to|id })`.
 * - Temporal Surge emits eval icecrack + caster `game_response` instead.
 * - Cleave/shadowstrike emit both `action` and `ui` — recorder collapses the
 *   pid-less duplicate (order-invariant: pid row upgrades a pid-less twin).
 * - Warcry/darkblessing ui is `{ type }` only; cast attribution comes from
 *   condition onset (`s[cond].f` = caster). Self-buffs without ui
 *   (hardshell, charge, blink, power) use onset on the buffed player.
 * - Skills with a named ui (mluck, energize, …) and combat debuffs are not
 *   synthesized from conditions — that would double-count or blame the victim.
 */

import {
  findEntityById,
  getCharacter,
  getEntitiesList,
  getG,
} from "../host/al";
import { isFocusablePlayer } from "../queries/entities";
import type {
  ActionEvent,
  EvalEvent,
  GameResponseEvent,
  UiEvent,
} from "../sockets/hub";
import {
  gameResponseIsTemporalSurge,
  parseIcecrackSmoke,
  resolveTemporalSurgeCaster,
  TEMPORAL_SURGE_ID,
} from "./temporalSurge";

export const SYNTHETIC_CAST_DEBOUNCE_MS = 500;

/** Ms rose by at least this → treat as a re-cast while the buff stayed open. */
export const CONDITION_REFRESH_MS = 250;

const CONDITION_SKILL_ALIASES: Record<string, string> = {
  charging: "charge",
};

/**
 * Condition onset is the cast signal only for these skills.
 * - caster_f: nameless ui (warcry/darkblessing); need status.f
 * - self: no ui (hardshell/charge/blink/power); recipient is caster
 * Everything else with a G.skills condition (mluck, energize, stunned→stomp,
 * poisoned, …) is announced by ui/action or is a debuff — do not invent casts.
 */
type ConditionOnsetMode = "caster_f" | "self";

const CONDITION_ONSET_SKILLS: Record<string, ConditionOnsetMode> = {
  warcry: "caster_f",
  darkblessing: "caster_f",
  hardshell: "self",
  charge: "self",
  blink: "self",
  power: "self",
  xpower: "self",
};

/** condition key → skill id from G.skills[].condition */
let conditionFieldMap: Record<string, string> | null = null;

function conditionFieldLookup(): Record<string, string> {
  if (conditionFieldMap) return conditionFieldMap;
  const skills = getG()?.skills;
  // Do not cache a miss — G may not be loaded on the first call.
  if (!skills) return {};
  const out: Record<string, string> = {};
  const ids = Object.keys(skills);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const cond = skills[id]?.condition;
    if (typeof cond === "string" && cond) out[cond] = id;
  }
  conditionFieldMap = out;
  return out;
}

/** Condition key → G.skills id. */
export function skillIdForCondition(conditionKey: string): string | undefined {
  if (!conditionKey) return undefined;
  const skills = getG()?.skills;
  if (!skills) return undefined;
  const alias = CONDITION_SKILL_ALIASES[conditionKey];
  if (alias && skills[alias]) return alias;
  const fromField = conditionFieldLookup()[conditionKey];
  if (fromField && skills[fromField]) return fromField;
  // blink / warcry / hardshell — status key matches the skill id
  if (skills[conditionKey]) return conditionKey;
  return undefined;
}

/** Test helper — drop the G.skills[].condition cache. */
export function resetConditionSkillMapCache(): void {
  conditionFieldMap = null;
}

function resolveEntityId(
  hint: string | undefined,
  playersOnly: boolean,
): string | undefined {
  if (!hint) return undefined;
  const byId = findEntityById(hint);
  if (byId && byId.id != null && (!playersOnly || isFocusablePlayer(byId))) {
    return String(byId.id);
  }
  const list = getEntitiesList();
  for (let i = 0; i < list.length; i++) {
    const ent = list[i];
    if (ent.id == null) continue;
    if (playersOnly && !isFocusablePlayer(ent)) continue;
    if (ent.name === hint || String(ent.id) === hint) return String(ent.id);
  }
  // AL player ids are names; keep the hint so debounce matches a later action.
  return hint;
}

export function uiTypeIsSkill(type: string): boolean {
  if (!type) return false;
  const skills = getG()?.skills;
  return !!(skills && skills[type]);
}

/**
 * Caster is `name` when present (stomp, absorb, alchemy), else `from`
 * (mluck, energize, throw). Absorb's `from` is the ally, not the caster.
 * Warcry/darkblessing `{ type }` with no caster → null (use condition onset).
 */
export function castFromUi(ev: UiEvent): ActionEvent | null {
  if (!uiTypeIsSkill(ev.type)) return null;
  const actor = resolveEntityId(ev.name || ev.from, true);
  if (!actor) return null;
  const targetHint =
    ev.to ||
    ev.id ||
    (ev.name && ev.from && ev.from !== ev.name ? ev.from : undefined);
  const row: ActionEvent = {
    actor,
    source: ev.type,
    at: ev.at,
  };
  const target = resolveEntityId(targetHint, false);
  if (target) row.target = target;
  return row;
}

export function castFromEval(ev: EvalEvent): ActionEvent | null {
  const xy = parseIcecrackSmoke(ev.code);
  if (!xy) return null;
  const caster = resolveTemporalSurgeCaster(xy.x, xy.y, getEntitiesList());
  if (!caster || caster.id == null) return null;
  return { actor: String(caster.id), source: TEMPORAL_SURGE_ID, at: ev.at };
}

export function castFromGameResponse(ev: GameResponseEvent): ActionEvent | null {
  if (!gameResponseIsTemporalSurge(ev.response)) return null;
  const self = getCharacter();
  if (!self || self.id == null) return null;
  return { actor: String(self.id), source: TEMPORAL_SURGE_ID, at: ev.at };
}

/**
 * New / refreshed allowlisted skill condition → Time Line cast.
 * Warcry/darkblessing need `status.f`. Self skills use the buffed player.
 * Skills with a named ui (mluck, energize, …) and combat debuffs are skipped.
 */
export function castFromConditionOnset(
  recipientId: string,
  conditionKey: string,
  status: Record<string, unknown> | null | undefined,
  at: number,
): ActionEvent | null {
  if (!recipientId) return null;
  const skill = skillIdForCondition(conditionKey);
  if (!skill) return null;
  const mode = CONDITION_ONSET_SKILLS[skill];
  if (!mode) return null;

  if (mode === "caster_f") {
    const f = status && typeof status.f === "string" ? status.f : "";
    if (!f) return null;
    const caster = resolveEntityId(f, true);
    if (!caster) return null;
    const row: ActionEvent = { actor: caster, source: skill, at };
    if (caster !== recipientId) row.target = recipientId;
    return row;
  }

  return { actor: recipientId, source: skill, at };
}

export function conditionMs(
  status: Record<string, unknown> | null | undefined,
): number | undefined {
  if (!status) return undefined;
  const ms = status.ms;
  return typeof ms === "number" && Number.isFinite(ms) ? ms : undefined;
}

/** True when an open buff's remaining ms jumped up (re-cast). */
export function conditionMsRefreshed(
  prevMs: number | undefined,
  nextMs: number | undefined,
  minJump: number = CONDITION_REFRESH_MS,
): boolean {
  if (prevMs == null || nextMs == null) return false;
  return nextMs > prevMs + minJump;
}

export type CastTwin = {
  actorId: string;
  source?: string;
  at: number;
  pid?: string | number;
};

/**
 * One (actor, source) identity inside the debounce window.
 * Pid-less (ui/eval/game_response) skips if any twin exists.
 * Pid (commence_attack) drops a recent pid-less twin so ui-before-action
 * does not double-count; extra pid rows (3shot) stay.
 */
export function acceptIncomingCast(
  casts: CastTwin[],
  incoming: CastTwin,
  debounceMs: number = SYNTHETIC_CAST_DEBOUNCE_MS,
): boolean {
  const src = (incoming.source || "attack").toLowerCase();
  const pidless = incoming.pid == null;
  for (let i = casts.length - 1; i >= 0; i--) {
    const c = casts[i];
    if (incoming.at - c.at > debounceMs) break;
    if (c.actorId !== incoming.actorId) continue;
    if ((c.source || "").toLowerCase() !== src) continue;
    if (pidless) return false;
    if (c.pid == null) casts.splice(i, 1);
  }
  return true;
}
