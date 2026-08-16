/**
 * Sole hub subscriber for combat meters — segments, rolling, death, casts,
 * conditions, gear-slot diffs.
 * UI must not subscribe to hub; paint via meterUiTick after dirty.
 */

import {
  findEntityById,
  getCharacter,
  getEntitiesRecord,
  getObserving,
  getObservingId,
  resolvePlayerCtype,
} from "../host/al";
import type { EntityLike, SlotLike } from "../host/globals";
import { CHARACTER_SLOTS } from "../lib/equippedProps";
import { itemSkin } from "../lib/gameIcon";
import { attackMsFromFrequency } from "../lib/abilityIds";
import {
  onActionSubscribe,
  onDamage,
  onEvalSubscribe,
  onGameResponseSubscribe,
  onKill,
  onUiSubscribe,
  type ActionEvent,
  type DamageEvent,
  type EvalEvent,
  type GameResponseEvent,
  type KillEvent,
  type UiEvent,
} from "../sockets/hub";
import {
  applyDamageToShadow,
  buildDeathSnapshot,
  clearDeathRings,
  effectiveGain,
  noteIncomingHit,
  syncShadowFromEntity,
} from "./deathLog";
import {
  attachRollingToEngine,
  clearRollingWindow,
  ingestRollingSample,
} from "./rollingWindow";
import { applyDamageToSegment, ensureActor } from "./sessionSegment";
import { DISPEL_ABILITY_KEYS, INTERRUPT_ABILITY_KEYS } from "./meterAppearance";
import type {
  CastMarker,
  CombatSegment,
  ConditionInterval,
  GearSwapEvent,
} from "./meterTypes";
import { emptyMisc } from "./meterTypes";
import { markMeterDirty } from "./meterUiTick";
import {
  acceptIncomingCast,
  castFromEval,
  castFromGameResponse,
  castFromUi,
  conditionMs,
  SYNTHETIC_CAST_DEBOUNCE_MS,
} from "./syntheticCast";
import {
  castsFromConditionSample,
  clearConditionCastWatch,
} from "./conditionCastWatch";
import {
  ensureLive,
  getLiveSegment,
  noteLiveDraft,
  partyKeyFor,
  resetSessionAll,
  resetSessionCurrent,
  resetSessionOverall,
  sampleHistory,
  soloKey,
  startSession,
  syncSession,
} from "./meterSession";

const CONDITION_SAMPLE_MS = 100;
const MAX_GEAR_SWAPS = 4000;

let playerMeta: Record<
  string,
  { name: string; ctype?: string; partyKey: string }
> = {};
/** Sticky class by actor id — hit events often arrive before / without a live entity. */
let ctypeById: Record<string, string> = {};
let watchedPartyIds = new Set<string>();
let watchedPartyKey = "";
let visiblePlayerIds = new Set<string>();
let youId = "";

function rememberCtype(
  id: string,
  ctype: string | undefined,
): string | undefined {
  if (ctype) {
    ctypeById[id] = ctype;
    return ctype;
  }
  return ctypeById[id];
}

function ctypeFor(id: string, ent?: EntityLike | null): string | undefined {
  return rememberCtype(id, resolvePlayerCtype(id, ent) || ctypeById[id]);
}

let lastConditionSample = 0;
/** Open aura intervals — same objects as in seg.conditions (endedAt updates). */
const openConditions: Record<string, ConditionInterval> = {};
/** actorId → slot → name|level|skin. First sight is a snapshot, not an event. */
const lastGearByActor: Record<string, Record<string, string>> = {};

let engineUnsubs: Array<() => void> = [];
let stopSession: (() => void) | null = null;

function isPlayerEntity(ent: EntityLike | null | undefined): boolean {
  return !!(ent && (ent.player || ent.type === "character"));
}

function isPlayerId(id: string | undefined): boolean {
  if (!id) return false;
  if (playerMeta[id]) return true;
  const rec = getEntitiesRecord();
  if (isPlayerEntity(rec[id])) return true;
  const ent = findEntityById(id);
  if (isPlayerEntity(ent)) return true;
  return !/^\d+$/.test(id);
}

/** Packet hid / map key / display name all count as the same player. */
function rememberIdentity(
  set: Set<string>,
  ent: EntityLike | null | undefined,
  extra?: string,
): void {
  if (extra) set.add(String(extra));
  if (!ent) return;
  if (ent.id != null && String(ent.id) !== "") set.add(String(ent.id));
  if (ent.name) set.add(String(ent.name));
}

function mtypeForId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const ent = getEntitiesRecord()[id] || findEntityById(id);
  return ent?.mtype;
}

function metaFor(id: string | undefined) {
  if (!id) return undefined;
  const m = playerMeta[id];
  if (m) {
    const ctype = ctypeFor(id) || m.ctype;
    if (ctype && m.ctype !== ctype) m.ctype = ctype;
    return m;
  }
  const ent = findEntityById(id) || getEntitiesRecord()[id];
  if (!ent) {
    return {
      name: id,
      ctype: ctypeFor(id),
      partyKey: soloKey(id),
    };
  }
  return {
    name: ent.name || id,
    ctype: ctypeFor(id, ent),
    mtype: ent.mtype,
    partyKey: partyKeyFor(ent, id),
  };
}

function sampleConditions(now: number): void {
  if (now - lastConditionSample < CONDITION_SAMPLE_MS) return;
  lastConditionSample = now;
  const ents = getEntitiesRecord();
  const ids = Object.keys(playerMeta);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const ent =
      findEntityById(id) ||
      ents[id] ||
      (playerMeta[id]?.name ? ents[playerMeta[id].name] : undefined);
    const s =
      (ent && (ent as { s?: Record<string, Record<string, unknown>> }).s) ||
      null;
    // Always sample the watch (empty bag prunes); tape only while live.
    const castEvents = castsFromConditionSample(id, s, now);
    for (let c = 0; c < castEvents.length; c++) {
      recordPlayerCast(castEvents[c]);
    }

    const seg = getLiveSegment();
    if (!seg || !s) continue;

    const keys = Object.keys(s);
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      const openKey = `${id}:${key}`;
      const ms = conditionMs(s[key]);
      const predictedEnd = ms != null ? now + ms : undefined;
      if (!openConditions[openKey]) {
        const iv: ConditionInterval = {
          actorId: id,
          key,
          startedAt: now,
          expectedEndAt: predictedEnd,
        };
        openConditions[openKey] = iv;
        seg.conditions.push(iv);
        markMeterDirty();
      } else if (predictedEnd != null) {
        const iv = openConditions[openKey];
        // Refresh / first ms sight: extend prediction. Soft-track otherwise
        // so absolute end stays ~stable as remaining ms counts down.
        if (iv.expectedEndAt == null || predictedEnd > iv.expectedEndAt + 250) {
          iv.expectedEndAt = predictedEnd;
          markMeterDirty();
        } else {
          iv.expectedEndAt = predictedEnd;
        }
      }
    }
    const openKeys = Object.keys(openConditions);
    for (let o = 0; o < openKeys.length; o++) {
      const ok = openKeys[o];
      if (ok.indexOf(id + ":") !== 0) continue;
      const condKey = ok.slice(id.length + 1);
      if (s[condKey]) continue;
      const iv = openConditions[ok];
      if (iv && iv.endedAt == null) {
        iv.endedAt = now;
        markMeterDirty();
      }
      delete openConditions[ok];
    }
  }
}

/** Drop tape opens only — keep cast-watch warm across fights. */
function clearConditionTape(): void {
  const oks = Object.keys(openConditions);
  for (let i = 0; i < oks.length; i++) delete openConditions[oks[i]];
}

function clearConditionTracking(): void {
  clearConditionTape();
  clearConditionCastWatch();
}

function onLiveClosed(): void {
  clearGearSnapshots();
  clearConditionTape();
}

function clearGearSnapshots(): void {
  const ids = Object.keys(lastGearByActor);
  for (let i = 0; i < ids.length; i++) delete lastGearByActor[ids[i]];
}

function gearFingerprint(slot: SlotLike | null | undefined): string {
  if (!slot || !slot.name) return "";
  return `${slot.name}|${slot.level ?? ""}|${slot.skin ?? ""}`;
}

function parseGearFp(fp: string): {
  name?: string;
  level?: number;
  skin?: string;
} {
  if (!fp) return {};
  const parts = fp.split("|");
  const name = parts[0] || undefined;
  const levelRaw = parts[1] ? Number(parts[1]) : NaN;
  const skin = parts[2] || undefined;
  return {
    name,
    level: Number.isFinite(levelRaw) ? levelRaw : undefined,
    skin: skin || undefined,
  };
}

/**
 * Live slots for a player. Local `character` is not updated from entities
 * packets (`process_entities` skips self) — `player` resend is the source.
 * Nearby party/strangers get `cslots` on the entities broadcast after `u`.
 */
function slotsForActor(
  id: string,
): Record<string, SlotLike | null | undefined> | undefined {
  const character = getCharacter();
  if (character && String(character.id) === id && character.slots) {
    return character.slots;
  }
  const liveEnt = findEntityById(id) || getEntitiesRecord()[id];
  if (liveEnt && liveEnt.slots) return liveEnt.slots;
  const observing = getObserving();
  if (observing && String(observing.id) === id && observing.slots) {
    return observing.slots;
  }
  return undefined;
}

function pushGearSwap(
  seg: CombatSegment,
  actorId: string,
  slot: string,
  oldFp: string,
  newFp: string,
  now: number,
): void {
  const oldS = parseGearFp(oldFp);
  const newS = parseGearFp(newFp);
  const itemName = newS.name || oldS.name;
  if (!itemName) return;
  const ev: GearSwapEvent = {
    at: now,
    actorId,
    slot,
    oldName: oldS.name,
    newName: newS.name,
    oldLevel: oldS.level,
    newLevel: newS.level,
    skin: newS.skin || oldS.skin || itemSkin(itemName),
  };
  if (!seg.gearSwaps) seg.gearSwaps = [];
  seg.gearSwaps.push(ev);
  while (seg.gearSwaps.length > MAX_GEAR_SWAPS) seg.gearSwaps.shift();
}

/**
 * Diff equipped body slots vs last snapshot. First sight / fight start is
 * snapshot-only so current loadout does not flood the Time Line.
 */
function sampleGearSwaps(now: number): void {
  const seg = getLiveSegment();
  if (!seg) return;
  const ids = Object.keys(playerMeta);
  let dirty = false;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const slots = slotsForActor(id);
    if (!slots) continue;
    let prev = lastGearByActor[id];
    const first = !prev;
    if (!prev) {
      prev = {};
      lastGearByActor[id] = prev;
    }
    for (let s = 0; s < CHARACTER_SLOTS.length; s++) {
      const slot = CHARACTER_SLOTS[s];
      const nextFp = gearFingerprint(slots[slot]);
      const oldFp = prev[slot] || "";
      if (first) {
        prev[slot] = nextFp;
        continue;
      }
      if (oldFp === nextFp) continue;
      prev[slot] = nextFp;
      pushGearSwap(seg, id, slot, oldFp, nextFp, now);
      dirty = true;
    }
  }
  if (dirty) markMeterDirty();
}

function onDamageEvent(ev: DamageEvent): void {
  ingestRollingSample(ev);
  noteIncomingHit(ev);

  const actorIsPlayer = isPlayerId(ev.actor);
  const targetIsPlayer = isPlayerId(ev.target);
  const hasCombatSignal =
    !!(ev.damage && ev.damage > 0) ||
    !!(ev.heal && ev.heal > 0) ||
    !!(ev.lifesteal && ev.lifesteal > 0) ||
    !!(ev.manasteal && ev.manasteal > 0) ||
    !!(ev.dreturn && ev.dreturn > 0) ||
    !!(ev.reflect && ev.reflect > 0) ||
    !!ev.miss ||
    !!ev.evade ||
    !!ev.avoid;

  if (!hasCombatSignal) return;

  const relevant =
    (actorIsPlayer && !!ev.actor) ||
    (targetIsPlayer && (!!ev.dreturn || !!ev.reflect || !!ev.damage));
  syncSession(ev.at, mtypeForId(ev.target), relevant);

  if (ev.damage && ev.damage > 0 && ev.target && targetIsPlayer) {
    applyDamageToShadow(ev.target, ev.damage);
  }

  const liveEnts = getEntitiesRecord();
  let effectiveHeal = 0;
  let effectiveMana = 0;
  if (ev.heal && ev.heal > 0 && ev.target) {
    effectiveHeal += effectiveGain(
      ev.target,
      ev.heal,
      "hp",
      liveEnts[ev.target],
    );
  }
  if (ev.lifesteal && ev.lifesteal > 0 && ev.actor) {
    effectiveHeal += effectiveGain(
      ev.actor,
      ev.lifesteal,
      "hp",
      liveEnts[ev.actor],
    );
  }
  if (ev.manasteal && ev.manasteal > 0 && ev.actor) {
    effectiveMana += effectiveGain(
      ev.actor,
      ev.manasteal,
      "mp",
      liveEnts[ev.actor],
    );
  }

  const seg = ensureLive(ev.at);
  applyDamageToSegment(seg, ev, {
    actorMeta: metaFor(ev.actor),
    targetMeta: metaFor(ev.target),
    effectiveHeal,
    effectiveMana,
    actorIsPlayer,
    targetIsPlayer,
  });

  sampleHistory(ev.at);
  markMeterDirty();
}

function onKillEvent(ev: KillEvent): void {
  const now = ev.at;
  const playerDeath = isPlayerId(ev.id) || !!playerMeta[ev.id];
  const seg = syncSession(now, mtypeForId(ev.id), playerDeath);
  if (playerDeath && seg) {
    seg.deaths.push(buildDeathSnapshot(ev.id, now));
    const actor = seg.actors[ev.id];
    if (actor) {
      if (!actor.misc) actor.misc = emptyMisc();
      actor.misc.deaths += 1;
    }
    markMeterDirty();
  }
}

function onActionEvent(ev: ActionEvent): void {
  recordPlayerCast(ev);
}

function recordPlayerCast(ev: ActionEvent): void {
  if (!ev.actor || !isPlayerId(ev.actor)) return;
  const src = (ev.source || "attack").toLowerCase();
  const seg = syncSession(ev.at, undefined, true);
  if (!seg) return;
  if (
    !acceptIncomingCast(
      seg.casts,
      {
        actorId: ev.actor,
        source: src,
        at: ev.at,
        pid: ev.pid,
      },
      SYNTHETIC_CAST_DEBOUNCE_MS,
    )
  ) {
    return;
  }
  const attackMs = attackMsFromFrequency(findEntityById(ev.actor)?.frequency);
  const row: CastMarker = {
    at: ev.at,
    actorId: ev.actor,
    source: ev.source || "attack",
    targetId: ev.target,
    pid: ev.pid,
  };
  if (attackMs != null) row.attackMs = attackMs;
  seg.casts.push(row);
  // Keep a long fight’s cast history for Time Line scroll-back (was 200 —
  // at party cast rates that only covered ~10–30s and erased early icons).
  while (seg.casts.length > 8000) seg.casts.shift();
  const actor = ensureActor(seg, ev.actor, metaFor(ev.actor));
  if (!actor.misc) actor.misc = emptyMisc();
  if (INTERRUPT_ABILITY_KEYS.has(src)) actor.misc.interrupts += 1;
  if (DISPEL_ABILITY_KEYS.has(src)) actor.misc.dispels += 1;
  markMeterDirty();
}

function onEvalEvent(ev: EvalEvent): void {
  const cast = castFromEval(ev);
  if (cast) recordPlayerCast(cast);
}

function onGameResponseEvent(ev: GameResponseEvent): void {
  const cast = castFromGameResponse(ev);
  if (cast) recordPlayerCast(cast);
}

function onUiEvent(ev: UiEvent): void {
  const cast = castFromUi(ev);
  if (cast) recordPlayerCast(cast);
}

export function getWatchedPartyKey(): string {
  return watchedPartyKey;
}

export function getYouId(): string {
  return youId;
}

export function isVisiblePlayer(id: string): boolean {
  if (!id) return false;
  if (visiblePlayerIds.has(id)) return true;
  const rec = getEntitiesRecord();
  if (isPlayerEntity(rec[id])) return true;
  const ent = findEntityById(id);
  if (!isPlayerEntity(ent)) return false;
  if (ent.id != null && visiblePlayerIds.has(String(ent.id))) return true;
  if (ent.name && visiblePlayerIds.has(String(ent.name))) return true;
  // In the live entity snapshot ⇒ Visible, even when hid ≠ ent.id.
  return true;
}

export function isWatchedPartyMember(id: string): boolean {
  if (!id) return false;
  if (watchedPartyIds.has(id)) return true;
  const rec = getEntitiesRecord();
  const ent = rec[id] || findEntityById(id);
  if (!ent) return false;
  if (ent.id != null && watchedPartyIds.has(String(ent.id))) return true;
  if (ent.name && watchedPartyIds.has(String(ent.name))) return true;
  return false;
}

export type VisiblePartyRow = {
  /** Party focus id (AL party id or solo:name). */
  id: string;
  /** Menu / status label. */
  label: string;
  /** Visible member display names. */
  members: string[];
};

function accumulatePartyMember(
  byKey: Record<string, string[]>,
  key: string,
  name: string,
): void {
  if (!byKey[key]) byKey[key] = [];
  if (byKey[key].indexOf(name) < 0) byKey[key].push(name);
}

/** Parties that currently have at least one player in vision. */
export function listVisibleParties(): VisiblePartyRow[] {
  const byKey: Record<string, string[]> = {};
  const ids = Object.keys(playerMeta);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!isVisiblePlayer(id)) continue;
    const meta = playerMeta[id];
    accumulatePartyMember(
      byKey,
      meta?.partyKey || soloKey(id, meta?.name),
      meta?.name || id,
    );
  }
  return partyRowsFromMembers(byKey);
}

/** Parties that appear on a stored fight — never the live vision roster. */
export function listSegmentParties(seg: CombatSegment): VisiblePartyRow[] {
  const byKey: Record<string, string[]> = {};
  const ids = Object.keys(seg.actors);
  for (let i = 0; i < ids.length; i++) {
    const a = seg.actors[ids[i]];
    if (!a.ctype && a.id && /^\d+$/.test(a.id)) continue;
    accumulatePartyMember(
      byKey,
      a.partyKey || soloKey(a.id, a.name),
      a.name || a.id,
    );
  }
  return partyRowsFromMembers(byKey);
}

function partyRowsFromMembers(
  byKey: Record<string, string[]>,
): VisiblePartyRow[] {
  const keys = Object.keys(byKey);
  const out: VisiblePartyRow[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const members = byKey[key].slice().sort();
    const label =
      key.indexOf("solo:") === 0
        ? members[0] || key.slice(5)
        : members.length
          ? `Party · ${members.join(", ")}`
          : `Party · ${key}`;
    out.push({ id: key, label, members });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

export function getPlayerMeta(): typeof playerMeta {
  return playerMeta;
}

/** Refresh names/party keys + vitals; call each tick from CommUI. */
export function updateMeterContext(entities: EntityLike[]): void {
  const observing = getObserving();
  const observingId = getObservingId();
  const nextMeta: typeof playerMeta = {};
  const nextWatched = new Set<string>();
  const now = Date.now();
  syncSession(now);
  const live = getLiveSegment();

  youId = observingId ? String(observingId) : "";

  if (observingId && observing) {
    rememberIdentity(nextWatched, observing, String(observingId));
    watchedPartyKey =
      observing.party || soloKey(String(observingId), observing.name);
    if (observing.party) {
      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (isPlayerEntity(ent) && ent.party === observing.party) {
          rememberIdentity(nextWatched, ent);
        }
      }
    }
  } else {
    watchedPartyKey = "";
  }
  watchedPartyIds = nextWatched;

  const nextVisible = new Set<string>();
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!isPlayerEntity(ent)) continue;
    const id =
      ent.id != null && String(ent.id) !== ""
        ? String(ent.id)
        : ent.name
          ? String(ent.name)
          : "";
    if (!id) continue;
    rememberIdentity(nextVisible, ent, id);
    const ctype = ctypeFor(id, ent);
    nextMeta[id] = {
      name: ent.name || id,
      ctype,
      partyKey: partyKeyFor(ent, id),
    };
    syncShadowFromEntity(id, ent);
    if (live && live.actors[id]) {
      live.actors[id].name = nextMeta[id].name;
      // Never wipe a known class with undefined from a thin entity packet.
      if (ctype) live.actors[id].ctype = ctype;
      else if (!live.actors[id].ctype && ctypeById[id]) {
        live.actors[id].ctype = ctypeById[id];
      }
      live.actors[id].partyKey = nextMeta[id].partyKey;
    }
  }

  // Observing / self may be absent from entities (bag borrow skip, vision gap).
  if (observingId && observing) {
    const id = String(observingId);
    rememberIdentity(nextVisible, observing, id);
    const ctype = ctypeFor(id, observing);
    const prev = nextMeta[id];
    nextMeta[id] = {
      name: observing.name || prev?.name || id,
      ctype: ctype || prev?.ctype,
      partyKey: partyKeyFor(observing, id),
    };
    if (live && live.actors[id] && nextMeta[id].ctype) {
      live.actors[id].ctype = nextMeta[id].ctype;
      live.actors[id].name = nextMeta[id].name;
      live.actors[id].partyKey = nextMeta[id].partyKey;
    }
  }

  // Backfill live actors still missing ctype (hit before vision / own roster).
  if (live) {
    const actorIds = Object.keys(live.actors);
    for (let i = 0; i < actorIds.length; i++) {
      const id = actorIds[i];
      const actor = live.actors[id];
      if (actor.ctype) {
        rememberCtype(id, actor.ctype);
        continue;
      }
      const ctype = ctypeFor(id);
      if (ctype) actor.ctype = ctype;
    }
  }

  // Map-key aliases (entities["Name"] vs ent.id) so Visible matches hid packets.
  const rec = getEntitiesRecord();
  const recKeys = Object.keys(rec);
  for (let i = 0; i < recKeys.length; i++) {
    const key = recKeys[i];
    const ent = rec[key];
    if (isPlayerEntity(ent)) rememberIdentity(nextVisible, ent, key);
  }

  visiblePlayerIds = nextVisible;
  playerMeta = nextMeta;
  sampleConditions(now);
  sampleGearSwaps(now);
  noteLiveDraft();
}

export function resetAllMeters(): void {
  resetSessionAll();
  clearRollingWindow();
  clearDeathRings();
  clearConditionTracking();
  clearGearSnapshots();
  markMeterDirty();
}

/** Clear the live/current fight only (Details reset current). */
export function resetCurrentMeterSegment(): void {
  resetSessionCurrent();
  clearRollingWindow();
  markMeterDirty();
}

/**
 * Clear finished fights that feed Overall (`total` merge).
 * Live current fight is kept.
 */
export function resetOverallMeterSegments(): void {
  resetSessionOverall();
  markMeterDirty();
}

export function startMeterEngine(): () => void {
  attachRollingToEngine();
  if (!engineUnsubs.length) {
    engineUnsubs = [
      onDamage(onDamageEvent),
      onKill(onKillEvent),
      onActionSubscribe(onActionEvent),
      onEvalSubscribe(onEvalEvent),
      onGameResponseSubscribe(onGameResponseEvent),
      onUiSubscribe(onUiEvent),
    ];
  }
  if (!stopSession) {
    stopSession = startSession({ onLiveClosed });
  }
  return () => {
    if (stopSession) {
      stopSession();
      stopSession = null;
    }
    for (let i = 0; i < engineUnsubs.length; i++) engineUnsubs[i]();
    engineUnsubs = [];
  };
}
