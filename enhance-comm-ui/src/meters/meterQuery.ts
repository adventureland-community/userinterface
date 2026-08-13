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
import { effectivePartyFocus, resolvePartyFocus } from "../lib/settingsFocus";
import { classColors } from "../lib/colors";
import { skillDisplayName } from "../lib/gameIcon";
import { playersList } from "../queries/entities";
import type { CombatChannel } from "./combatChannels";
import { CHANNEL_LABELS } from "./combatChannels";
import { INTERRUPT_ABILITY_KEYS } from "./meterAppearance";
import {
  getActorDamage,
  getActorHeal,
  getRollingWindowMs,
} from "./rollingWindow";
import {
  getHistoryPoints,
  getLiveSegment,
  getPlayerMeta,
  getWatchedPartyKey,
  getYouId,
  isMeterInCombat,
  isVisiblePlayer,
  isWatchedPartyMember,
  resolveSegment,
} from "./meterEngine";
import {
  dominantDamageType,
  emptyHitAmountStats,
  segmentDurationMs,
  type AbilityAgg,
  type ActorAgg,
  type CombatSegment,
  type ConditionInterval,
  type GearSwapEvent,
  type MeterQuery,
  type MeterResult,
  type PlayersMetric,
  type PlayersPrimary,
  type RankedRow,
  type SegmentRef,
  type UptimeRow,
} from "./meterTypes";

export type PartyScopeKind = "party" | "visible" | "you" | "all";

export type QueryContext = {
  segmentRef?: SegmentRef;
  partyFocus?: PartyFocus;
  now?: number;
  entities?: EntityLike[];
};

function focusToScope(focus: PartyFocus | undefined): PartyScopeKind {
  const hasObserver = !!getYouId();
  const eff = effectivePartyFocus(focus || "watched", hasObserver);
  if (eff === "all") return "all";
  if (eff === "visible") return "visible";
  if (eff === "you") return "you";
  if (eff === "watched") return "party";
  // specific party key → treat as party filter via partyKey match
  return "party";
}

export function playerInScope(
  actor: ActorAgg,
  focus: PartyFocus | undefined,
): boolean {
  const scope = focusToScope(focus);
  const you = getYouId();
  switch (scope) {
    case "all":
      return true;
    case "visible":
      return isVisiblePlayer(actor.id);
    case "you":
      return !!you && actor.id === you;
    case "party": {
      const resolved = resolvePartyFocus(
        effectivePartyFocus(focus || "watched", !!you),
        getWatchedPartyKey(),
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

function scopedActors(
  seg: CombatSegment,
  focus: PartyFocus | undefined,
): ActorAgg[] {
  const ids = Object.keys(seg.actors);
  const out: ActorAgg[] = [];
  for (let i = 0; i < ids.length; i++) {
    const a = seg.actors[ids[i]];
    if (playerInScope(a, focus)) out.push(a);
  }
  return out;
}

/** Scope check for timeline/death ids that may lack a full ActorAgg. */
export function actorIdInScope(
  actorId: string,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
): boolean {
  const actor = seg.actors[actorId];
  if (actor) return playerInScope(actor, focus);
  const scope = focusToScope(focus);
  switch (scope) {
    case "all":
      return true;
    case "visible":
      return isVisiblePlayer(actorId);
    case "you": {
      const you = getYouId();
      return !!you && actorId === you;
    }
    case "party": {
      const you = getYouId();
      const resolved = resolvePartyFocus(
        effectivePartyFocus(focus || "watched", !!you),
        getWatchedPartyKey(),
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

function actorMetric(a: ActorAgg, metric: PlayersMetric): number {
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

function abilityMetric(ab: AbilityAgg, metric: PlayersMetric): number {
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

function channelValue(a: ActorAgg, ch: CombatChannel): number {
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

function toRanked(
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

function rankedPlayers(
  seg: CombatSegment,
  metric: PlayersMetric,
  focus: PartyFocus | undefined,
  now: number,
  primary: "total" | "rate" = "total",
): MeterResult {
  const actors = scopedActors(seg, focus);
  const you = getYouId();
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
      });
    }
    return { kind: "ranked", rows };
  }

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

  let max = 0;
  let total = 0;
  for (let i = 0; i < coop.length; i++) {
    const p = coop[i].s?.coop?.p || 0;
    max = Math.max(max, p);
    total += p;
  }
  const rows: RankedRow[] = [];
  for (let i = 0; i < coop.length; i++) {
    const player = coop[i];
    const value = player.s?.coop?.p || 0;
    const label =
      mode === "coop_v2"
        ? value.toFixed(2)
        : `${getPercent(total > 0 ? value / total : 0, 3)} | ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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
      return rankedPlayers(
        seg,
        query.metric,
        focus,
        now,
        query.primary || "total",
      );

    case "abilities": {
      const actor = seg.actors[query.actorId];
      if (!actor) return { kind: "empty", reason: "no actor" };
      const metric = query.metric || "damage";
      const keys = Object.keys(actor.abilities);
      const items = keys.map((k) => {
        const ab = actor.abilities[k];
        return {
          id: k,
          name: skillDisplayName(k),
          value: abilityMetric(ab, metric),
          kind: "ability" as const,
          splashDamage: ab.splashDamage,
        };
      });
      return {
        kind: "ranked",
        rows: toRanked(items, durationMs, metric === "avoidance"),
        title: actor.name,
      };
    }

    case "ability_targets": {
      const actor = seg.actors[query.actorId];
      const ab = actor?.abilities[query.ability];
      if (!ab) return { kind: "empty", reason: "no ability" };
      const metric = query.metric || "damage";
      const tKeys = Object.keys(ab.targets);
      const items = tKeys.map((tid) => {
        const t = ab.targets[tid];
        let value = 0;
        if (metric === "heal") value = t.heal;
        else if (metric === "avoidance") {
          const o = t.outcomes;
          const total = o.hits + o.miss + o.evade + o.avoid;
          value = total ? (o.miss + o.evade + o.avoid) / total : 0;
        } else value = t.damage;
        return {
          id: tid,
          name: t.name,
          value,
          kind: "target" as const,
          mtype: t.mtype,
          ctype: t.ctype,
        };
      });
      return {
        kind: "ranked",
        rows: toRanked(items, durationMs, metric === "avoidance"),
        title: `${actor!.name} · ${skillDisplayName(query.ability)}`,
      };
    }

    case "targets": {
      const actor = seg.actors[query.actorId];
      if (!actor) return { kind: "empty", reason: "no actor" };
      const metric = query.metric || "damage";
      const byTarget: Record<
        string,
        {
          id: string;
          name: string;
          value: number;
          kind: "target";
          mtype?: string;
          ctype?: string;
        }
      > = {};
      const abKeys = Object.keys(actor.abilities);
      for (let i = 0; i < abKeys.length; i++) {
        const ab = actor.abilities[abKeys[i]];
        const tKeys = Object.keys(ab.targets);
        for (let t = 0; t < tKeys.length; t++) {
          const tg = ab.targets[tKeys[t]];
          if (!byTarget[tg.id]) {
            byTarget[tg.id] = {
              id: tg.id,
              name: tg.name,
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
      return {
        kind: "ranked",
        rows: toRanked(Object.values(byTarget), durationMs, false),
        title: `${actor.name} · targets`,
      };
    }

    case "details": {
      const actor = seg.actors[query.actorId];
      if (!actor) return { kind: "empty", reason: "no actor" };
      const metric: PlayersMetric =
        query.metric === "heal" ||
        query.metric === "taken" ||
        query.metric === "healing_required" ||
        query.metric === "avoidance"
          ? query.metric
          : "damage";
      const primary: PlayersPrimary =
        query.primary === "rate" ? "rate" : "total";
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
          ? (() => {
              const byTarget: Record<
                string,
                {
                  id: string;
                  name: string;
                  value: number;
                  kind: "target";
                  mtype?: string;
                  ctype?: string;
                }
              > = {};
              const keys = Object.keys(actor.abilities);
              for (let i = 0; i < keys.length; i++) {
                const ability = actor.abilities[keys[i]];
                const tKeys = Object.keys(ability.targets);
                for (let t = 0; t < tKeys.length; t++) {
                  const tg = ability.targets[tKeys[t]];
                  if (!byTarget[tg.id]) {
                    byTarget[tg.id] = {
                      id: tg.id,
                      name: tg.name,
                      value: 0,
                      kind: "target",
                      mtype: tg.mtype,
                      ctype: tg.ctype,
                    };
                  }
                  byTarget[tg.id].value +=
                    listMetric === "heal" ? tg.heal : tg.damage;
                  if (tg.mtype) byTarget[tg.id].mtype = tg.mtype;
                  if (tg.ctype) byTarget[tg.id].ctype = tg.ctype;
                }
              }
              return Object.values(byTarget);
            })()
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

    case "summary": {
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

    case "avoidance":
      return rankedPlayers(seg, "avoidance", focus, now);

    case "encounter_summary": {
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

    case "taken_by_spell": {
      const actors = scopedActors(seg, focus);
      const bySpell: Record<string, number> = {};
      for (let i = 0; i < actors.length; i++) {
        const abKeys = Object.keys(actors[i].abilities);
        for (let k = 0; k < abKeys.length; k++) {
          const ab = actors[i].abilities[abKeys[k]];
          if (!(ab.taken > 0)) continue;
          bySpell[ab.key] = (bySpell[ab.key] || 0) + ab.taken;
        }
      }
      const items = Object.keys(bySpell).map((key) => ({
        id: key,
        name: skillDisplayName(key),
        value: bySpell[key],
        kind: "ability" as const,
      }));
      return {
        kind: "ranked",
        rows: toRanked(items, durationMs, false),
        title: "Damage Taken by Spell",
      };
    }

    case "enemy_damage": {
      const actors = scopedActors(seg, focus);
      const meta = getPlayerMeta();
      const byTarget: Record<
        string,
        {
          id: string;
          name: string;
          value: number;
          kind: "target";
          mtype?: string;
          ctype?: string;
        }
      > = {};
      for (let i = 0; i < actors.length; i++) {
        const abKeys = Object.keys(actors[i].abilities);
        for (let k = 0; k < abKeys.length; k++) {
          const ab = actors[i].abilities[abKeys[k]];
          const tKeys = Object.keys(ab.targets);
          for (let t = 0; t < tKeys.length; t++) {
            const tg = ab.targets[tKeys[t]];
            if (!(tg.damage > 0)) continue;
            // Skip player targets — Adds pane is enemy/environment damage taken.
            if (meta[tg.id] || seg.actors[tg.id]) continue;
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
            byTarget[tg.id].value += tg.damage;
            if (tg.mtype) byTarget[tg.id].mtype = tg.mtype;
          }
        }
      }
      const items = Object.keys(byTarget).map((id) => byTarget[id]);
      return {
        kind: "ranked",
        rows: toRanked(items, durationMs, false),
        title: "Adds",
      };
    }

    case "channel": {
      const actors = scopedActors(seg, focus);
      const items = actors.map((a) => ({
        id: a.id,
        name: a.name,
        ctype: a.ctype,
        value: channelValue(a, query.channel),
      }));
      return {
        kind: "ranked",
        rows: toRanked(items, durationMs, false),
      };
    }

    case "compare":
    case "history": {
      const points = getHistoryPoints();
      const seriesKeys = new Set<string>();
      const outPoints: Array<{ at: number; values: Record<string, number> }> =
        [];
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

    case "pie": {
      if (query.actorId) {
        const actor = seg.actors[query.actorId];
        if (!actor) return { kind: "empty", reason: "no actor" };
        const metric = query.metric || "damage";
        const keys = Object.keys(actor.abilities);
        const slices = keys.map((k) => {
          const ab = actor.abilities[k];
          return {
            id: k,
            name: skillDisplayName(k),
            value: abilityMetric(ab, metric),
            color: classColors[actor.ctype || ""] || "#666",
          };
        });
        return { kind: "pie", slices: slices.filter((s) => s.value > 0) };
      }
      const actors = scopedActors(seg, focus);
      const metric = query.metric || "damage";
      return {
        kind: "pie",
        slices: actors
          .map((a) => ({
            id: a.id,
            name: a.name,
            value: actorMetric(a, metric),
            color: classColors[a.ctype || ""] || "#666",
          }))
          .filter((s) => s.value > 0),
      };
    }

    case "death_log":
      return { kind: "death_log", deaths: seg.deaths.slice() };

    case "timeline": {
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

    case "conditions":
      return {
        kind: "timeline",
        casts: [],
        conditions: query.actorId
          ? seg.conditions.filter((c) => c.actorId === query.actorId)
          : seg.conditions.filter((c) => actorIdInScope(c.actorId, seg, focus)),
        gearSwaps: [],
        durationMs,
      };

    case "misc": {
      const actors = scopedActors(seg, focus);
      const items = actors.map((a) => {
        const m = a.misc || { interrupts: 0, dispels: 0, deaths: 0 };
        let value = 0;
        if (query.metric === "interrupts") value = m.interrupts;
        else if (query.metric === "dispels") value = m.dispels;
        else if (query.metric === "deaths") value = m.deaths;
        else if (query.metric === "cc_breaks") {
          value = Object.keys(a.abilities).reduce((sum, k) => {
            if (INTERRUPT_ABILITY_KEYS.has(k)) return sum + 1;
            return sum;
          }, 0);
        }
        return {
          id: a.id,
          name: a.name,
          value,
          ctype: a.ctype,
          kind: "player" as const,
        };
      });
      const labels: Record<string, string> = {
        interrupts: "Interrupts",
        dispels: "Dispels",
        deaths: "Deaths",
        cc_breaks: "CC Breaks",
      };
      return {
        kind: "ranked",
        rows: toRanked(
          items.filter((it) => it.value > 0),
          durationMs,
          true,
        ),
        title: labels[query.metric] || query.metric,
      };
    }

    default: {
      const _exhaustive: never = query;
      return { kind: "empty", reason: String(_exhaustive) };
    }
  }
}

export function segmentTitle(ref: SegmentRef | undefined): string {
  const r = ref || "current";
  if (r === "total") return "Overall";
  if (typeof r === "object") {
    const seg = resolveSegment(r);
    return seg?.label || seg?.id || "Past";
  }
  // Always label Current even when resolved to last (Skada)
  void isMeterInCombat();
  return "Current";
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
