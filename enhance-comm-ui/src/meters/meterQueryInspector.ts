/**
 * Inspector MeterQuery case bodies. Dispatch stays in meterQuery.ts.
 */

import { skillDisplayName } from "../lib/gameIcon";
import type { PartyFocus } from "../lib/settingsFocus";
import {
  getHistoryPoints,
  getLiveSegment,
  isWatchedPartyMember,
} from "./meterEngine";
import {
  abilityMetric,
  actorIdInScope,
  aggregateActorTargets,
  playerInScope,
  rankedPlayers,
  scopedActors,
  toRanked,
} from "./meterQuery";
import {
  dominantDamageType,
  emptyHitAmountStats,
  type CombatSegment,
  type ConditionInterval,
  type GearSwapEvent,
  type MeterQuery,
  type MeterResult,
  type PlayersMetric,
  type PlayersPrimary,
  type UptimeRow,
} from "./meterTypes";

function actorUptimeRows(
  conditions: ConditionInterval[],
  actorId: string,
  durationMs: number,
  now: number,
): UptimeRow[] {
  const byKey: Record<string, { ms: number; apps: number }> = {};
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    if (c.actorId !== actorId) continue;
    const end = c.endedAt != null ? c.endedAt : now;
    const ms = Math.max(0, end - c.startedAt);
    if (!byKey[c.key]) byKey[c.key] = { ms: 0, apps: 0 };
    byKey[c.key].ms += ms;
    byKey[c.key].apps += 1;
  }
  const dur = Math.max(durationMs, 1);
  const keys = Object.keys(byKey);
  const rows: UptimeRow[] = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const rec = byKey[k];
    rows.push({
      id: k,
      name: k,
      uptime: Math.min(1, rec.ms / dur),
      apps: rec.apps,
      activeMs: rec.ms,
    });
  }
  rows.sort((a, b) => b.uptime - a.uptime || b.apps - a.apps);
  return rows;
}

export function queryDetails(
  query: Extract<MeterQuery, { kind: "details" }>,
  seg: CombatSegment,
  durationMs: number,
  now: number,
): MeterResult {
  const actor = seg.actors[query.actorId];
  if (!actor) return { kind: "empty", reason: "no actor" };
  const metric: PlayersMetric =
    query.metric === "heal" ||
    query.metric === "taken" ||
    query.metric === "healing_required" ||
    query.metric === "avoidance"
      ? query.metric
      : "damage";
  const primary: PlayersPrimary = query.primary === "rate" ? "rate" : "total";
  const listMetric: PlayersMetric =
    metric === "heal" ? "heal" : metric === "taken" ? "taken" : "damage";
  const abKeys = Object.keys(actor.abilities);
  const abilityItems = abKeys
    .map((k) => {
      const ab = actor.abilities[k];
      return {
        id: k,
        name: skillDisplayName(k),
        value: abilityMetric(ab, listMetric),
        kind: "ability" as const,
        splashDamage: ab.splashDamage,
      };
    })
    .filter((it) => it.value > 0 || abKeys.length <= 1);
  const abilityRows = toRanked(abilityItems, durationMs, false, primary);
  // Keep selection for Outcomes/Targets; overview totals stay actor-level.
  let abilityKey = query.ability;
  if (!abilityKey && abilityRows[0]) abilityKey = abilityRows[0].id;
  const ab = abilityKey ? actor.abilities[abilityKey] : undefined;
  const outcomes = ab ? ab.outcomes : actor.outcomes;
  const abilityTotal = ab ? abilityMetric(ab, listMetric) : 0;
  let abilityCasts = 0;
  if (abilityKey) {
    const keyLower = abilityKey.toLowerCase();
    for (let i = 0; i < seg.casts.length; i++) {
      const c = seg.casts[i];
      if (c.actorId !== actor.id) continue;
      if ((c.source || "").toLowerCase() === keyLower) abilityCasts += 1;
    }
  }
  const targetItems = ab
    ? Object.keys(ab.targets).map((tid) => {
        const t = ab.targets[tid];
        let value = 0;
        if (listMetric === "heal") value = t.heal;
        else if (listMetric === "taken") value = t.damage;
        else value = t.damage;
        return {
          id: tid,
          name: t.name,
          value,
          kind: "target" as const,
          mtype: t.mtype,
          ctype: t.ctype,
        };
      })
    : Object.keys(actor.abilities).length
      ? aggregateActorTargets(actor, listMetric)
      : [];
  let deathCount = 0;
  for (let i = 0; i < seg.deaths.length; i++) {
    if (seg.deaths[i].id === actor.id) deathCount += 1;
  }
  return {
    kind: "details",
    actorId: actor.id,
    actorName: actor.name,
    ctype: actor.ctype,
    ability: abilityKey,
    metric,
    primary,
    abilitySplash: ab ? ab.splashDamage : 0,
    abilityTotal,
    abilityCasts,
    outcomes,
    hitNormal: ab?.normal ? { ...ab.normal } : emptyHitAmountStats(),
    hitCrit: ab?.crit ? { ...ab.crit } : emptyHitAmountStats(),
    damageType: ab ? dominantDamageType(ab.damageTypes) : undefined,
    totals: {
      damage: actor.damage,
      heal: actor.heal,
      taken: actor.taken,
      healingRequired: actor.healingRequired,
    },
    durationMs,
    abilityRows,
    uptimeRows: actorUptimeRows(seg.conditions, actor.id, durationMs, now),
    targetRows: toRanked(targetItems, durationMs, false, primary),
    deaths: deathCount,
  };
}

export function querySummary(
  _query: Extract<MeterQuery, { kind: "summary" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
): MeterResult {
  const actors = scopedActors(seg, focus);
  return {
    kind: "summary",
    matrix: actors.map((a) => ({
      id: a.id,
      name: a.name,
      damage: a.damage,
      heal: a.heal,
      taken: a.taken,
    })),
  };
}

export function queryEncounterSummary(
  _query: Extract<MeterQuery, { kind: "encounter_summary" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
  now: number,
  durationMs: number,
): MeterResult {
  const actors = scopedActors(seg, focus);
  let totalDamage = 0;
  let totalHeal = 0;
  for (let i = 0; i < actors.length; i++) {
    totalDamage += actors[i].damage;
    totalHeal += actors[i].heal;
  }
  const dpsRows = rankedPlayers(seg, "damage", focus, now);
  return {
    kind: "encounter",
    durationMs,
    totalDamage,
    totalHeal,
    deaths: seg.deaths.length,
    topDps:
      dpsRows.kind === "ranked" && dpsRows.rows[0]
        ? dpsRows.rows[0]
        : undefined,
  };
}

export function queryHistory(
  _query: Extract<MeterQuery, { kind: "compare" | "history" }>,
  focus: PartyFocus | undefined,
): MeterResult {
  const points = getHistoryPoints();
  const seriesKeys = new Set<string>();
  const outPoints: Array<{ at: number; values: Record<string, number> }> = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const values: Record<string, number> = {};
    const keys = Object.keys(p.values);
    for (let k = 0; k < keys.length; k++) {
      const id = keys[k];
      if (focus) {
        const live = getLiveSegment();
        const actor = live?.actors[id];
        if (actor && !playerInScope(actor, focus)) continue;
        if (!actor && focus !== "all" && focus !== "visible") {
          // keep if visible/all only when we have meta
          if (focus === "watched" && !isWatchedPartyMember(id)) continue;
        }
      }
      values[id] = p.values[id];
      seriesKeys.add(id);
    }
    outPoints.push({ at: p.at, values });
  }
  return {
    kind: "history",
    points: outPoints,
    seriesKeys: Array.from(seriesKeys),
  };
}

export function queryDeathLog(
  _query: Extract<MeterQuery, { kind: "death_log" }>,
  seg: CombatSegment,
): MeterResult {
  return { kind: "death_log", deaths: seg.deaths.slice() };
}

export function queryTimeline(
  _query: Extract<MeterQuery, { kind: "timeline" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
  durationMs: number,
): MeterResult {
  const casts = [];
  for (let i = 0; i < seg.casts.length; i++) {
    if (actorIdInScope(seg.casts[i].actorId, seg, focus)) {
      casts.push(seg.casts[i]);
    }
  }
  const conditions = [];
  for (let i = 0; i < seg.conditions.length; i++) {
    if (actorIdInScope(seg.conditions[i].actorId, seg, focus)) {
      conditions.push(seg.conditions[i]);
    }
  }
  const gearSwaps: GearSwapEvent[] = [];
  const swaps = seg.gearSwaps || [];
  for (let i = 0; i < swaps.length; i++) {
    if (actorIdInScope(swaps[i].actorId, seg, focus)) {
      gearSwaps.push(swaps[i]);
    }
  }
  return {
    kind: "timeline",
    casts,
    conditions,
    gearSwaps,
    durationMs,
  };
}

export function queryConditions(
  query: Extract<MeterQuery, { kind: "conditions" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
  durationMs: number,
): MeterResult {
  return {
    kind: "timeline",
    casts: [],
    conditions: query.actorId
      ? seg.conditions.filter((c) => c.actorId === query.actorId)
      : seg.conditions.filter((c) => actorIdInScope(c.actorId, seg, focus)),
    gearSwaps: [],
    durationMs,
  };
}
