/**
 * Meter query dispatch — config → MeterResult. Party scope is a read filter.
 */

import { getEntitiesRecord, resolvePlayerCtype } from "../host/al";
import type { EntityLike } from "../host/globals";
import {
  formatCompactNumber,
  formatCompactRate,
  getPercent,
} from "../lib/format";
import type { PartyFocus } from "../lib/settingsFocus";
import {
  effectivePartyFocus,
  namedPartyKey,
  resolvePartyFocus,
} from "../lib/settingsFocus";
import { playersList } from "../queries/entities";
import type { CombatChannel } from "./combatChannels";
import {
  getActorDamage,
  getActorHeal,
  getRollingWindowMs,
} from "./rollingWindow";
import {
  getPlayerMeta,
  isVisiblePlayer,
  isWatchedPartyMember,
} from "./meterEngine";
import { isLiveCombatSegment, listSegmentChoices, resolveSegment } from "./meterSession";
import { runTitle, titleForRef } from "./meterSegmentCatalog";
import {
  segmentDurationMs,
  type AbilityAgg,
  type ActorAgg,
  type CombatSegment,
  type MeterQuery,
  type MeterResult,
  type PlayersMetric,
  type RankedRow,
  type SegmentRef,
  type TargetAgg,
} from "./meterTypes";
import {
  queryAbilities,
  queryAbilityTargets,
  queryChannel,
  queryEnemyDamage,
  queryMisc,
  queryPie,
  queryPlayers,
  queryTakenBySpell,
  queryTargets,
} from "./meterQueryRanked";
import {
  queryConditions,
  queryDeathLog,
  queryDetails,
  queryEncounterSummary,
  queryHistory,
  querySummary,
  queryTimeline,
} from "./meterQueryInspector";

export type PartyScopeKind = "party" | "visible" | "you" | "all";

export type QueryContext = {
  segmentRef?: SegmentRef;
  partyFocus?: PartyFocus;
  now?: number;
  entities?: EntityLike[];
};

function partyKeyOnSegment(seg: CombatSegment, key: string): boolean {
  if (!key) return false;
  const ids = Object.keys(seg.actors);
  for (let i = 0; i < ids.length; i++) {
    if (seg.actors[ids[i]].partyKey === key) return true;
  }
  return false;
}

function storedPartyKey(
  focus: PartyFocus | undefined,
  seg: CombatSegment,
): string {
  return namedPartyKey(focus) || seg.partyKey || "";
}

function focusToScope(
  focus: PartyFocus | undefined,
  seg: CombatSegment,
): PartyScopeKind {
  const liveRoster = isLiveCombatSegment(seg);
  const hasObserver = !!seg.observingId;
  const eff = effectivePartyFocus(focus || "watched", hasObserver);
  if (!liveRoster && eff === "visible") return "all";
  if (eff === "all") return "all";
  if (eff === "visible") return "visible";
  if (eff === "you") return "you";
  if (eff === "watched") return "party";
  if (!liveRoster && !partyKeyOnSegment(seg, eff)) {
    return "all";
  }
  return "party";
}

export function playerInScope(
  actor: ActorAgg,
  focus: PartyFocus | undefined,
  seg: CombatSegment,
): boolean {
  const scope = focusToScope(focus, seg);
  const liveRoster = isLiveCombatSegment(seg);
  const you = seg.observingId || "";
  switch (scope) {
    case "all":
      return true;
    case "visible":
      return isVisiblePlayer(actor.id);
    case "you":
      return (
        !!you &&
        (actor.id === you ||
          (!!seg.observingName && actor.name === seg.observingName))
      );
    case "party": {
      if (!liveRoster) {
        const key = storedPartyKey(focus, seg);
        if (key) return actor.partyKey === key;
        return true;
      }
      const resolved = resolvePartyFocus(
        effectivePartyFocus(focus || "watched", !!you),
        seg.partyKey || "",
      );
      if (resolved.partyFilter) {
        return actor.partyKey === resolved.partyFilter;
      }
      return isWatchedPartyMember(actor.id);
    }
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

export function scopedActors(
  seg: CombatSegment,
  focus: PartyFocus | undefined,
): ActorAgg[] {
  const ids = Object.keys(seg.actors);
  const out: ActorAgg[] = [];
  for (let i = 0; i < ids.length; i++) {
    const a = seg.actors[ids[i]];
    if (playerInScope(a, focus, seg)) out.push(a);
  }
  return out;
}

export type ActorTargetItem = {
  id: string;
  name: string;
  value: number;
  kind: "target";
  mtype?: string;
  ctype?: string;
};

/** Fold one actor’s ability targets. Optional predicate (enemy_damage skip-players). */
export function aggregateActorTargets(
  actor: ActorAgg,
  metric: PlayersMetric,
  includeTarget?: (tg: TargetAgg) => boolean,
): ActorTargetItem[] {
  const byTarget: Record<string, ActorTargetItem> = {};
  const abKeys = Object.keys(actor.abilities);
  for (let i = 0; i < abKeys.length; i++) {
    const ab = actor.abilities[abKeys[i]];
    const tKeys = Object.keys(ab.targets);
    for (let t = 0; t < tKeys.length; t++) {
      const tg = ab.targets[tKeys[t]];
      if (includeTarget && !includeTarget(tg)) continue;
      if (!byTarget[tg.id]) {
        byTarget[tg.id] = {
          id: tg.id,
          name: tg.name || tg.id,
          value: 0,
          kind: "target",
          mtype: tg.mtype,
          ctype: tg.ctype,
        };
      }
      byTarget[tg.id].value += metric === "heal" ? tg.heal : tg.damage;
      if (tg.mtype) byTarget[tg.id].mtype = tg.mtype;
      if (tg.ctype) byTarget[tg.id].ctype = tg.ctype;
      if (tg.name) byTarget[tg.id].name = tg.name;
    }
  }
  const ids = Object.keys(byTarget);
  const rows: ActorTargetItem[] = [];
  for (let i = 0; i < ids.length; i++) {
    rows.push(byTarget[ids[i]]);
  }
  return rows;
}

/** Scope check for timeline/death ids that may lack a full ActorAgg. */
export function actorIdInScope(
  actorId: string,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
): boolean {
  const actor = seg.actors[actorId];
  if (actor) return playerInScope(actor, focus, seg);
  const scope = focusToScope(focus, seg);
  const liveRoster = isLiveCombatSegment(seg);
  switch (scope) {
    case "all":
      return true;
    case "visible":
      return isVisiblePlayer(actorId);
    case "you": {
      const you = seg.observingId || "";
      return !!you && actorId === you;
    }
    case "party": {
      if (!liveRoster) {
        const key = storedPartyKey(focus, seg);
        if (key) return false;
        return true;
      }
      const you = seg.observingId || "";
      const resolved = resolvePartyFocus(
        effectivePartyFocus(focus || "watched", !!you),
        seg.partyKey || "",
      );
      if (resolved.partyFilter) return false;
      return isWatchedPartyMember(actorId);
    }
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

export function actorMetric(a: ActorAgg, metric: PlayersMetric): number {
  switch (metric) {
    case "damage":
      return a.damage;
    case "heal":
      return a.heal;
    case "taken":
      return a.taken;
    case "healing_required":
      return a.healingRequired;
    case "avoidance": {
      const o = a.outcomes;
      const total = o.hits + o.miss + o.evade + o.avoid;
      return total ? (o.miss + o.evade + o.avoid) / total : 0;
    }
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

export function abilityMetric(ab: AbilityAgg, metric: PlayersMetric): number {
  switch (metric) {
    case "damage":
      return ab.damage;
    case "heal":
      return ab.heal;
    case "taken":
      return ab.taken;
    case "healing_required":
      return ab.taken;
    case "avoidance": {
      const o = ab.outcomes;
      const total = o.hits + o.miss + o.evade + o.avoid;
      return total ? (o.miss + o.evade + o.avoid) / total : 0;
    }
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

export function channelValue(a: ActorAgg, ch: CombatChannel): number {
  switch (ch) {
    case "dps":
      return a.damage;
    case "base":
      return a.base;
    case "blast":
      return a.blast;
    case "burn":
      return a.burn;
    case "cleave":
      return a.cleave;
    case "hps":
      return a.heal;
    case "mps":
      return a.mana;
    case "dr":
      return a.dr;
    case "reflect":
      return a.reflect;
    default: {
      const _exhaustive: never = ch;
      return _exhaustive;
    }
  }
}

export function toRanked(
  items: Array<{
    id: string;
    name: string;
    ctype?: string;
    mtype?: string;
    value: number;
    kind?: RankedRow["kind"];
    you?: boolean;
    splashDamage?: number;
  }>,
  durationMs: number,
  absolute: boolean,
  primary: "total" | "rate" = "total",
): RankedRow[] {
  let max = 0;
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    max = Math.max(max, items[i].value);
    sum += items[i].value;
  }
  if (!items.length || !(max > 0 || absolute)) return [];
  const sec = Math.max(durationMs / 1000, 1);
  const withRate = items.map((it) => ({
    ...it,
    rate: absolute ? (null as number | null) : it.value / sec,
  }));
  const sorted =
    primary === "rate" && !absolute
      ? withRate.slice().sort((a, b) => (b.rate || 0) - (a.rate || 0))
      : withRate.slice().sort((a, b) => b.value - a.value);
  let barMax = max;
  if (primary === "rate" && !absolute) {
    barMax = 0;
    for (let i = 0; i < sorted.length; i++) {
      barMax = Math.max(barMax, sorted[i].rate || 0);
    }
  }
  const rows: RankedRow[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i];
    if (!(it.value > 0) && !absolute) continue;
    const rate = it.rate;
    const pct = sum > 0 ? it.value / sum : 0;
    let label: string;
    if (absolute) {
      label = `${(it.value * 100).toFixed(1)}%`;
    } else if (primary === "rate") {
      // Details DPS/HPS: rate first, total + share in parens
      label = `${formatCompactRate(rate || 0)} (${formatCompactNumber(it.value)}, ${getPercent(pct, 3)})`;
    } else {
      // Details Damage/Healing Done: total first, rate + share in parens
      label = `${formatCompactNumber(it.value)} (${formatCompactRate(rate || 0)}, ${getPercent(pct, 3)})`;
    }
    const useRate = primary === "rate" && !absolute;
    const barValue = useRate ? rate || 0 : it.value;
    rows.push({
      id: it.id,
      name: it.name,
      ctype: it.ctype,
      mtype: it.mtype,
      value: it.value,
      rate,
      pct,
      barMax: barMax || 1,
      barValue,
      primary: useRate ? "rate" : "total",
      label,
      kind: it.kind,
      you: it.you,
      splashDamage: it.splashDamage,
    });
  }
  return rows;
}

export function rankedPlayers(
  seg: CombatSegment,
  metric: PlayersMetric,
  focus: PartyFocus | undefined,
  now: number,
  primary: "total" | "rate" = "total",
): MeterResult {
  const actors = scopedActors(seg, focus);
  const you = seg.observingId || "";
  const items = actors.map((a) => ({
    id: a.id,
    name: a.name,
    ctype: a.ctype,
    value: actorMetric(a, metric),
    kind: "player" as const,
    you: !!you && a.id === you,
  }));
  const absolute = metric === "avoidance";
  return {
    kind: "ranked",
    rows: toRanked(
      items,
      segmentDurationMs(seg, now),
      absolute,
      absolute ? "total" : primary,
    ),
  };
}

/** Pre-enhance-comm Coop V2 panel / server `issue_monster_awards` curve. */
function coopPointsPow065(rawPoints: number): number {
  return Math.pow(Math.max(0, rawPoints), 0.65);
}

function snapshotRows(
  mode: "pdps" | "coop_v1" | "coop_v2",
  entities: EntityLike[],
): MeterResult {
  if (mode === "pdps") {
    const players = playersList(entities)
      .filter((p) => (p.pdps || 0) > 0)
      .sort((a, b) => (b.pdps || 0) - (a.pdps || 0));
    let max = 0;
    for (let i = 0; i < players.length; i++) {
      max = Math.max(max, players[i].pdps || 0);
    }
    const rows: RankedRow[] = [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const value = p.pdps || 0;
      rows.push({
        id: String(p.id),
        name: p.name || String(p.id),
        ctype: p.ctype,
        value,
        rate: null,
        pct: max > 0 ? value / max : 0,
        barMax: max || 1,
        barValue: value,
        primary: "total",
        label: value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        kind: "player",
      });
    }
    return { kind: "ranked", rows };
  }

  // Same eligibility as the old CoopContributionMeterV1/V2 panels.
  const ids = new Set(entities.map((e) => String(e.id)));
  const coop = entities
    .filter(
      (e) =>
        e.player &&
        e.type === "character" &&
        (e.s?.coop?.p || 0) > 0 &&
        e.s?.coop?.id != null &&
        ids.has(String(e.s.coop.id)),
    )
    .sort((a, b) => (b.s?.coop?.p || 0) - (a.s?.coop?.p || 0));

  // V1: linear share of raw s.coop.p (old CoopContributionMeterV1).
  // V2: server award curve — pow(p, 0.65) / (0.1 + sum(pow(p_i, 0.65)))
  //     (old CoopContributionMeterV2 / issue_monster_awards).
  const useV2 = mode === "coop_v2";
  let max = 0;
  // Server starts total at 0.1; V1 panel used a plain sum (no base).
  let total = useV2 ? 0.1 : 0;
  const displayValues: number[] = [];
  for (let i = 0; i < coop.length; i++) {
    const raw = coop[i].s?.coop?.p || 0;
    const value = useV2 ? coopPointsPow065(raw) : raw;
    displayValues.push(value);
    max = Math.max(max, value);
    total += value;
  }
  const rows: RankedRow[] = [];
  for (let i = 0; i < coop.length; i++) {
    const player = coop[i];
    const value = displayValues[i];
    const label = `${getPercent(total > 0 ? value / total : 0, 3)} | ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    rows.push({
      id: String(player.id),
      name: player.name || String(player.id),
      ctype: player.ctype,
      value,
      rate: null,
      pct: total > 0 ? value / total : 0,
      barMax: max || 1,
      barValue: value,
      primary: "total",
      label,
      kind: "player",
    });
  }
  return { kind: "ranked", rows };
}

function rollingRanked(now: number): MeterResult {
  const dmg = getActorDamage(now);
  const ids = Object.keys(dmg);
  const windowSec = getRollingWindowMs() / 1000;
  const items: Array<{
    id: string;
    name: string;
    ctype?: string;
    value: number;
  }> = [];
  const meta = getEntitiesRecord();
  const playerMeta = getPlayerMeta();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const ent = meta[id];
    items.push({
      id,
      name: playerMeta[id]?.name || ent?.name || id,
      ctype: playerMeta[id]?.ctype || resolvePlayerCtype(id, ent) || ent?.ctype,
      value: dmg[id] / windowSec,
    });
  }
  // Fake duration so toRanked treats rate oddly — use absolute-style labels
  let max = 0;
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    max = Math.max(max, items[i].value);
    sum += items[i].value;
  }
  const sorted = items.slice().sort((a, b) => b.value - a.value);
  const rows: RankedRow[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i];
    if (!(it.value > 0)) continue;
    const pct = sum > 0 ? it.value / sum : 0;
    rows.push({
      id: it.id,
      name: it.name,
      ctype: it.ctype,
      value: it.value,
      rate: it.value,
      pct,
      barMax: max || 1,
      barValue: it.value,
      primary: "rate",
      label: `${formatCompactRate(it.value)}/s ${getPercent(pct, 3)}`,
      kind: "player",
    });
  }
  return { kind: "ranked", rows, title: "Hit DPS (10s)" };
}

/** Run a MeterQuery against the resolved segment + party filter. */
export function runMeterQuery(
  query: MeterQuery,
  ctx: QueryContext = {},
): MeterResult {
  const now = ctx.now || Date.now();
  const focus = ctx.partyFocus;

  if (query.kind === "snapshot") {
    return snapshotRows(
      query.mode,
      ctx.entities || Object.values(getEntitiesRecord()),
    );
  }

  if (query.kind === "rolling" || query.kind === "realtime") {
    return rollingRanked(now);
  }

  const seg = resolveSegment(ctx.segmentRef);
  if (!seg) return { kind: "empty", reason: "no segment" };

  const durationMs = segmentDurationMs(seg, now);

  switch (query.kind) {
    case "players":
      return queryPlayers(query, seg, focus, now);

    case "abilities":
      return queryAbilities(query, seg, durationMs);

    case "ability_targets":
      return queryAbilityTargets(query, seg, durationMs);

    case "targets":
      return queryTargets(query, seg, durationMs);

    case "details":
      return queryDetails(query, seg, durationMs, now);

    case "summary":
      return querySummary(query, seg, focus);

    case "avoidance":
      return rankedPlayers(seg, "avoidance", focus, now);

    case "encounter_summary":
      return queryEncounterSummary(query, seg, focus, now, durationMs);

    case "taken_by_spell":
      return queryTakenBySpell(query, seg, focus, durationMs);

    case "enemy_damage":
      return queryEnemyDamage(query, seg, focus, durationMs);

    case "channel":
      return queryChannel(query, seg, focus, durationMs);

    case "compare":
    case "history":
      return queryHistory(query, focus);

    case "pie":
      return queryPie(query, seg, focus);

    case "death_log":
      return queryDeathLog(query, seg);

    case "timeline":
      return queryTimeline(query, seg, focus, durationMs);

    case "conditions":
      return queryConditions(query, seg, focus, durationMs);

    case "misc":
      return queryMisc(query, seg, focus, durationMs);

    default: {
      const _exhaustive: never = query;
      return { kind: "empty", reason: String(_exhaustive) };
    }
  }
}

export function segmentTitle(ref: SegmentRef | undefined): string {
  const r = ref || "current";
  if (r === "current" || r === "total") return runTitle(r);
  const fromList = titleForRef(r, listSegmentChoices());
  if (fromList) return fromList;
  if ("pastId" in r) {
    const seg = resolveSegment(r);
    return seg?.label || seg?.id || "Past";
  }
  return runTitle(r);
}

/** Heal rolling helper for dual meters. */
export function rollingHealRanked(now = Date.now()): MeterResult {
  const heal = getActorHeal(now);
  const ids = Object.keys(heal);
  const windowSec = getRollingWindowMs() / 1000;
  const items: Array<{
    id: string;
    name: string;
    ctype?: string;
    value: number;
    kind: "player";
  }> = [];
  const meta = getEntitiesRecord();
  const playerMeta = getPlayerMeta();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const ent = meta[id];
    items.push({
      id,
      name: playerMeta[id]?.name || ent?.name || id,
      ctype: playerMeta[id]?.ctype || resolvePlayerCtype(id, ent) || ent?.ctype,
      value: heal[id] / windowSec,
      kind: "player",
    });
  }
  return {
    kind: "ranked",
    rows: toRanked(
      items.map((it) => ({ ...it, value: it.value * windowSec })),
      getRollingWindowMs(),
      false,
    ),
  };
}
