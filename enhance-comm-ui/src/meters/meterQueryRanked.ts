/**
 * Ranked / pie MeterQuery case bodies. Dispatch stays in meterQuery.ts.
 */

import { getPlayerMeta } from "./meterEngine";
import { classColors } from "../lib/colors";
import { skillDisplayName } from "../lib/gameIcon";
import { INTERRUPT_ABILITY_KEYS } from "./meterAppearance";
import type { PartyFocus } from "../lib/settingsFocus";
import {
  abilityMetric,
  actorMetric,
  aggregateActorTargets,
  channelValue,
  rankedPlayers,
  scopedActors,
  toRanked,
} from "./meterQuery";
import type { CombatSegment, MeterQuery, MeterResult } from "./meterTypes";

export function queryPlayers(
  query: Extract<MeterQuery, { kind: "players" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
  now: number,
): MeterResult {
  return rankedPlayers(seg, query.metric, focus, now, query.primary || "total");
}

export function queryAbilities(
  query: Extract<MeterQuery, { kind: "abilities" }>,
  seg: CombatSegment,
  durationMs: number,
): MeterResult {
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

export function queryAbilityTargets(
  query: Extract<MeterQuery, { kind: "ability_targets" }>,
  seg: CombatSegment,
  durationMs: number,
): MeterResult {
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

export function queryTargets(
  query: Extract<MeterQuery, { kind: "targets" }>,
  seg: CombatSegment,
  durationMs: number,
): MeterResult {
  const actor = seg.actors[query.actorId];
  if (!actor) return { kind: "empty", reason: "no actor" };
  const metric = query.metric || "damage";
  return {
    kind: "ranked",
    rows: toRanked(aggregateActorTargets(actor, metric), durationMs, false),
    title: `${actor.name} · targets`,
  };
}

export function queryTakenBySpell(
  _query: Extract<MeterQuery, { kind: "taken_by_spell" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
  durationMs: number,
): MeterResult {
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

export function queryEnemyDamage(
  _query: Extract<MeterQuery, { kind: "enemy_damage" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
  durationMs: number,
): MeterResult {
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
  const skipPlayers = (tg: { id: string; damage: number }) => {
    if (!(tg.damage > 0)) return false;
    if (meta[tg.id] || seg.actors[tg.id]) return false;
    return true;
  };
  for (let i = 0; i < actors.length; i++) {
    const rows = aggregateActorTargets(actors[i], "damage", skipPlayers);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!byTarget[row.id]) {
        byTarget[row.id] = {
          id: row.id,
          name: row.name || row.id,
          value: 0,
          kind: "target",
          mtype: row.mtype,
          ctype: row.ctype,
        };
      }
      byTarget[row.id].value += row.value;
      if (row.mtype) byTarget[row.id].mtype = row.mtype;
      if (row.ctype) byTarget[row.id].ctype = row.ctype;
      if (row.name) byTarget[row.id].name = row.name;
    }
  }
  const items = Object.keys(byTarget).map((id) => byTarget[id]);
  return {
    kind: "ranked",
    rows: toRanked(items, durationMs, false),
    title: "Adds",
  };
}

export function queryChannel(
  query: Extract<MeterQuery, { kind: "channel" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
  durationMs: number,
): MeterResult {
  const actors = scopedActors(seg, focus);
  const items = actors.map((a) => ({
    id: a.id,
    name: a.name,
    ctype: a.ctype,
    value: channelValue(a, query.channel),
    kind: "player" as const,
  }));
  return {
    kind: "ranked",
    rows: toRanked(items, durationMs, false),
  };
}

export function queryPie(
  query: Extract<MeterQuery, { kind: "pie" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
): MeterResult {
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

export function queryMisc(
  query: Extract<MeterQuery, { kind: "misc" }>,
  seg: CombatSegment,
  focus: PartyFocus | undefined,
  durationMs: number,
): MeterResult {
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
