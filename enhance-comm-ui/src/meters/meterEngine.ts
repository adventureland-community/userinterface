/**
 * Sole hub subscriber for combat meters — segments, rolling, death, casts.
 * UI must not subscribe to hub; paint via meterUiTick after dirty.
 */

import { getEntitiesRecord, getObserving, getObservingId } from "../host/al";
import type { EntityLike } from "../host/globals";
import {
  onActionSubscribe,
  onDamage,
  onKill,
  type ActionEvent,
  type DamageEvent,
  type KillEvent,
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
import {
  applyDamageToSegment,
  emptySegment,
  ensureActor,
  mergeSegments,
} from "./sessionSegment";
import {
  DISPEL_ABILITY_KEYS,
  INTERRUPT_ABILITY_KEYS,
} from "./meterAppearance";
import {
  autoSegmentLabel,
  inferSegmentOutcome,
} from "./meterSegmentMeta";
import type {
  CombatSegment,
  ConditionInterval,
  SegmentRef,
} from "./meterTypes";
import { emptyMisc } from "./meterTypes";
import { markMeterDirty } from "./meterUiTick";

const COMBAT_BREAK_MS = 12_000;
const MAX_PAST = 12;
const HISTORY_MS = 5_000;
const MAX_HISTORY = 60;
const CONDITION_SAMPLE_MS = 500;

export type HistoryPoint = {
  at: number;
  /** actorId -> dps-ish rate for compare/realtime charts */
  values: Record<string, number>;
};

let live: CombatSegment | null = null;
let past: CombatSegment[] = [];
let history: HistoryPoint[] = [];
let lastHistoryAt = 0;
let lastCombatAt = 0;
let inCombat = false;
let segSeq = 0;

let playerMeta: Record<
  string,
  { name: string; ctype?: string; partyKey: string }
> = {};
let watchedPartyIds = new Set<string>();
let watchedPartyKey = "";
let visiblePlayerIds = new Set<string>();
let youId = "";

let lastConditionSample = 0;
const openConditions: Record<string, ConditionInterval> = {};

let unsubDamage: (() => void) | null = null;
let unsubKill: (() => void) | null = null;
let unsubAction: (() => void) | null = null;

function soloKey(id: string, name?: string): string {
  return `solo:${name || id}`;
}

function partyKeyFor(ent: EntityLike | undefined, id: string): string {
  if (!ent) return soloKey(id);
  if (ent.party) return ent.party;
  return soloKey(id, ent.name);
}

function isPlayerId(id: string | undefined): boolean {
  if (!id) return false;
  if (playerMeta[id]) return true;
  const ent = getEntitiesRecord()[id];
  if (ent) {
    return !!(ent.player || ent.type === "character");
  }
  return !/^\d+$/.test(id);
}

function nextSegId(): string {
  segSeq += 1;
  return `fight-${segSeq}-${Date.now()}`;
}

function ensureLive(now: number): CombatSegment {
  if (!live) {
    live = emptySegment(nextSegId(), now);
    inCombat = true;
  }
  return live;
}

function endLive(now: number): void {
  if (!live) return;
  live.endedAt = now;
  const partyIds: string[] = [];
  const ids = Object.keys(live.actors);
  for (let i = 0; i < ids.length; i++) {
    if (playerMeta[ids[i]]) partyIds.push(ids[i]);
  }
  live.seq = segSeq;
  live.outcome = inferSegmentOutcome(live, partyIds);
  live.label = autoSegmentLabel(live, segSeq);
  past.unshift(live);
  while (past.length > MAX_PAST) past.pop();
  live = null;
  inCombat = false;
  markMeterDirty();
}

function noteCombatActivity(now: number): void {
  if (inCombat && lastCombatAt && now - lastCombatAt > COMBAT_BREAK_MS) {
    endLive(now);
  }
  lastCombatAt = now;
  if (!live) ensureLive(now);
  else inCombat = true;
}

function metaFor(id: string | undefined) {
  if (!id) return undefined;
  const m = playerMeta[id];
  if (m) return m;
  const ent = getEntitiesRecord()[id];
  if (!ent) return { name: id, partyKey: soloKey(id) };
  return {
    name: ent.name || id,
    ctype: ent.ctype,
    partyKey: partyKeyFor(ent, id),
  };
}

function sampleHistory(now: number): void {
  if (now - lastHistoryAt < HISTORY_MS) return;
  lastHistoryAt = now;
  const seg = live;
  if (!seg || !seg.startedAt) return;
  const elapsed = Math.max(now - seg.startedAt, 1000);
  const values: Record<string, number> = {};
  const ids = Object.keys(seg.actors);
  for (let i = 0; i < ids.length; i++) {
    const a = seg.actors[ids[i]];
    values[a.id] = (a.damage * 1000) / elapsed;
  }
  history.push({ at: now, values });
  while (history.length > MAX_HISTORY) history.shift();
}

function sampleConditions(now: number): void {
  if (now - lastConditionSample < CONDITION_SAMPLE_MS) return;
  lastConditionSample = now;
  const seg = live;
  if (!seg) return;
  const ents = getEntitiesRecord();
  const ids = Object.keys(playerMeta);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const ent = ents[id];
    const s = ent && (ent as any).s;
    if (!s || typeof s !== "object") continue;
    const keys = Object.keys(s);
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      const openKey = `${id}:${key}`;
      if (!openConditions[openKey]) {
        const iv: ConditionInterval = {
          actorId: id,
          key,
          startedAt: now,
        };
        openConditions[openKey] = iv;
        seg.conditions.push(iv);
      }
    }
    // Close conditions no longer present
    const openKeys = Object.keys(openConditions);
    for (let o = 0; o < openKeys.length; o++) {
      const ok = openKeys[o];
      if (ok.indexOf(id + ":") !== 0) continue;
      const condKey = ok.slice(id.length + 1);
      if (s[condKey]) continue;
      const iv = openConditions[ok];
      if (iv && iv.endedAt == null) iv.endedAt = now;
      delete openConditions[ok];
    }
  }
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
  if (relevant) noteCombatActivity(ev.at);

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
  if (isPlayerId(ev.id) || playerMeta[ev.id]) {
    noteCombatActivity(now);
    const seg = ensureLive(now);
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
  if (!ev.actor || !isPlayerId(ev.actor)) return;
  noteCombatActivity(ev.at);
  const seg = ensureLive(ev.at);
  const src = (ev.source || "attack").toLowerCase();
  seg.casts.push({
    at: ev.at,
    actorId: ev.actor,
    source: ev.source || "attack",
    targetId: ev.target,
    pid: ev.pid,
  });
  while (seg.casts.length > 200) seg.casts.shift();
  const actor = ensureActor(seg, ev.actor, metaFor(ev.actor));
  if (!actor.misc) actor.misc = emptyMisc();
  if (INTERRUPT_ABILITY_KEYS.has(src)) actor.misc.interrupts += 1;
  if (DISPEL_ABILITY_KEYS.has(src)) actor.misc.dispels += 1;
  markMeterDirty();
}

/**
 * Skada find_set: Current → live if in combat, else last archived.
 * Title stays "Current" in the UI even when resolved to last.
 */
export function resolveSegment(
  ref: SegmentRef | undefined,
): CombatSegment | null {
  const r = ref || "current";
  if (r === "total") {
    const parts: CombatSegment[] = [];
    if (live) parts.push(live);
    for (let i = 0; i < past.length; i++) parts.push(past[i]);
    if (!parts.length) return null;
    return mergeSegments("total", parts, Date.now());
  }
  if (typeof r === "object" && r.pastId) {
    for (let i = 0; i < past.length; i++) {
      if (past[i].id === r.pastId) return past[i];
    }
    return null;
  }
  // current
  if (inCombat && live) return live;
  if (past.length) return past[0];
  return live;
}

export function listPastSegments(): CombatSegment[] {
  return past.slice();
}

export function getLiveSegment(): CombatSegment | null {
  return live;
}

export function isMeterInCombat(): boolean {
  return inCombat;
}

export function getHistoryPoints(): HistoryPoint[] {
  return history;
}

export function getWatchedPartyKey(): string {
  return watchedPartyKey;
}

export function getYouId(): string {
  return youId;
}

export function isVisiblePlayer(id: string): boolean {
  return visiblePlayerIds.has(id);
}

export function isWatchedPartyMember(id: string): boolean {
  return watchedPartyIds.has(id);
}

export type VisiblePartyRow = {
  /** Party focus id (AL party id or solo:name). */
  id: string;
  /** Menu / status label. */
  label: string;
  /** Visible member display names. */
  members: string[];
};

/** Parties that currently have at least one player in vision. */
export function listVisibleParties(): VisiblePartyRow[] {
  const byKey: Record<string, string[]> = {};
  const ids = Array.from(visiblePlayerIds);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const meta = playerMeta[id];
    const key = meta?.partyKey || soloKey(id, meta?.name);
    const name = meta?.name || id;
    if (!byKey[key]) byKey[key] = [];
    if (byKey[key].indexOf(name) < 0) byKey[key].push(name);
  }
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

  if (inCombat && lastCombatAt && now - lastCombatAt > COMBAT_BREAK_MS) {
    endLive(now);
  }

  youId = observingId ? String(observingId) : "";

  if (observingId && observing) {
    nextWatched.add(String(observingId));
    watchedPartyKey =
      observing.party || soloKey(String(observingId), observing.name);
    if (observing.party) {
      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (ent.player && ent.party === observing.party) {
          nextWatched.add(String(ent.id));
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
    if (!ent.player || !ent.id) continue;
    const id = String(ent.id);
    nextVisible.add(id);
    nextMeta[id] = {
      name: ent.name || id,
      ctype: ent.ctype,
      partyKey: partyKeyFor(ent, id),
    };
    syncShadowFromEntity(id, ent);
    if (live && live.actors[id]) {
      live.actors[id].name = nextMeta[id].name;
      live.actors[id].ctype = nextMeta[id].ctype;
      live.actors[id].partyKey = nextMeta[id].partyKey;
    }
  }
  visiblePlayerIds = nextVisible;
  playerMeta = nextMeta;
  sampleConditions(now);
}

export function resetAllMeters(): void {
  live = null;
  past = [];
  history = [];
  lastHistoryAt = 0;
  lastCombatAt = 0;
  inCombat = false;
  clearRollingWindow();
  clearDeathRings();
  const oks = Object.keys(openConditions);
  for (let i = 0; i < oks.length; i++) delete openConditions[oks[i]];
  markMeterDirty();
}

/** Clear the live/current fight only (Details reset current). */
export function resetCurrentMeterSegment(): void {
  live = null;
  lastCombatAt = 0;
  inCombat = false;
  clearRollingWindow();
  markMeterDirty();
}

/**
 * Clear finished fights that feed Overall (`total` merge).
 * Live current fight is kept.
 */
export function resetOverallMeterSegments(): void {
  past = [];
  history = [];
  lastHistoryAt = 0;
  markMeterDirty();
}

export function startMeterEngine(): () => void {
  attachRollingToEngine();
  if (!unsubDamage) unsubDamage = onDamage(onDamageEvent);
  if (!unsubKill) unsubKill = onKill(onKillEvent);
  if (!unsubAction) unsubAction = onActionSubscribe(onActionEvent);
  return () => {
    if (unsubDamage) {
      unsubDamage();
      unsubDamage = null;
    }
    if (unsubKill) {
      unsubKill();
      unsubKill = null;
    }
    if (unsubAction) {
      unsubAction();
      unsubAction = null;
    }
  };
}
