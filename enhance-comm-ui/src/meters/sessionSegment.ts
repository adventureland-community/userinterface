/**
 * Ability-keyed CombatSegment mutations (actor → abilities → targets).
 */

import type { DamageEvent } from "../sockets/hub";
import { deriveChannel } from "./channelDerive";
import {
  bumpHitAmount,
  damageAbilityKey,
  emptyHitAmountStats,
  emptyOutcomes,
  emptyMisc,
  healAbilityKey,
  mergeHitAmountStats,
  type AbilityAgg,
  type ActorAgg,
  type CombatSegment,
  type OutcomeCounts,
  type TargetAgg,
} from "./meterTypes";

export function ensureActor(
  seg: CombatSegment,
  id: string,
  meta?: { name?: string; ctype?: string; partyKey?: string },
): ActorAgg {
  let a = seg.actors[id];
  if (!a) {
    a = {
      id,
      name: meta?.name || id,
      ctype: meta?.ctype,
      partyKey: meta?.partyKey || `solo:${id}`,
      damage: 0,
      heal: 0,
      taken: 0,
      healingRequired: 0,
      mana: 0,
      dr: 0,
      reflect: 0,
      base: 0,
      blast: 0,
      burn: 0,
      cleave: 0,
      outcomes: emptyOutcomes(),
      misc: emptyMisc(),
      abilities: {},
    };
    seg.actors[id] = a;
  } else if (meta) {
    if (meta.name) a.name = meta.name;
    if (meta.ctype) a.ctype = meta.ctype;
    if (meta.partyKey) a.partyKey = meta.partyKey;
  }
  return a;
}

function ensureAbility(actor: ActorAgg, key: string): AbilityAgg {
  let ab = actor.abilities[key];
  if (!ab) {
    ab = {
      key,
      damage: 0,
      heal: 0,
      splashDamage: 0,
      taken: 0,
      outcomes: emptyOutcomes(),
      normal: emptyHitAmountStats(),
      crit: emptyHitAmountStats(),
      damageTypes: {},
      targets: {},
    };
    actor.abilities[key] = ab;
  } else {
    // Hot-reload / older in-memory abilities before hit-stat fields existed.
    if (!ab.normal) ab.normal = emptyHitAmountStats();
    if (!ab.crit) ab.crit = emptyHitAmountStats();
    if (!ab.damageTypes) ab.damageTypes = {};
  }
  return ab;
}

function ensureTarget(
  ab: AbilityAgg,
  id: string,
  name?: string,
  meta?: { mtype?: string; ctype?: string },
): TargetAgg {
  let t = ab.targets[id];
  if (!t) {
    t = {
      id,
      name: name || id,
      mtype: meta?.mtype,
      ctype: meta?.ctype,
      damage: 0,
      heal: 0,
      splashDamage: 0,
      outcomes: emptyOutcomes(),
      normal: emptyHitAmountStats(),
      crit: emptyHitAmountStats(),
    };
    ab.targets[id] = t;
  } else {
    if (name) t.name = name;
    if (meta?.mtype) t.mtype = meta.mtype;
    if (meta?.ctype) t.ctype = meta.ctype;
    if (!t.normal) t.normal = emptyHitAmountStats();
    if (!t.crit) t.crit = emptyHitAmountStats();
  }
  return t;
}

function bumpOutcome(o: OutcomeCounts, ev: DamageEvent): void {
  if (ev.miss) {
    o.miss += 1;
    return;
  }
  if (ev.evade) {
    o.evade += 1;
    return;
  }
  if (ev.avoid) {
    o.avoid += 1;
    return;
  }
  if ((ev.damage && ev.damage > 0) || (ev.heal && ev.heal > 0)) {
    o.hits += 1;
    if (ev.crit && ev.crit > 1) o.crits += 1;
    if (ev.kill) o.kills += 1;
  }
}

function isCritHit(ev: DamageEvent): boolean {
  return !!(ev.crit && ev.crit > 1);
}

function bumpLandedAmount(
  ab: AbilityAgg,
  tgt: TargetAgg,
  amount: number,
  crit: boolean,
): void {
  if (!(amount > 0)) return;
  if (crit) {
    bumpHitAmount(ab.crit, amount);
    bumpHitAmount(tgt.crit, amount);
  } else {
    bumpHitAmount(ab.normal, amount);
    bumpHitAmount(tgt.normal, amount);
  }
}

function bumpDamageType(
  ab: AbilityAgg,
  damageType: string | undefined,
  amount: number,
): void {
  if (!damageType || !(amount > 0)) return;
  const key = damageType.toLowerCase();
  ab.damageTypes[key] = (ab.damageTypes[key] || 0) + amount;
}

export type ActorMeta = {
  name?: string;
  ctype?: string;
  partyKey?: string;
  mtype?: string;
};

/**
 * Apply one hub damage event into a live segment.
 * `effectiveHeal` / `effectiveMana` are pre-clamped by the engine.
 */
export function applyDamageToSegment(
  seg: CombatSegment,
  ev: DamageEvent,
  opts: {
    actorMeta?: ActorMeta;
    targetMeta?: ActorMeta;
    effectiveHeal?: number;
    effectiveMana?: number;
    actorIsPlayer: boolean;
    targetIsPlayer: boolean;
  },
): void {
  const { actorIsPlayer, targetIsPlayer } = opts;

  if (ev.dreturn && ev.dreturn > 0 && targetIsPlayer && ev.target) {
    ensureActor(seg, ev.target, opts.targetMeta).dr += ev.dreturn;
  }
  if (ev.reflect && ev.reflect > 0 && targetIsPlayer && ev.target) {
    ensureActor(seg, ev.target, opts.targetMeta).reflect += ev.reflect;
  }

  if (ev.damage && ev.damage > 0 && ev.target && targetIsPlayer) {
    const tgt = ensureActor(seg, ev.target, opts.targetMeta);
    tgt.taken += ev.damage;
    tgt.healingRequired += ev.damage;
    // Incoming spell bucket — Details "Damage Taken by Spell" aggregates these.
    const takenAb = ensureAbility(tgt, damageAbilityKey(ev.source));
    takenAb.taken += ev.damage;
  }

  if (!ev.actor || !actorIsPlayer) return;

  const actor = ensureActor(seg, ev.actor, opts.actorMeta);
  const targetId = ev.target || "_";
  const targetName = opts.targetMeta?.name;
  const targetIconMeta = {
    mtype: opts.targetMeta?.mtype,
    ctype: opts.targetMeta?.ctype,
  };
  const hasDamage = !!(ev.damage && ev.damage > 0);
  const healAmt = opts.effectiveHeal || 0;
  const manaAmt = opts.effectiveMana || 0;
  const crit = isCritHit(ev);

  bumpOutcome(actor.outcomes, ev);

  if (hasDamage) {
    const dmgKey = damageAbilityKey(ev.source);
    const ab = ensureAbility(actor, dmgKey);
    const tgt = ensureTarget(ab, targetId, targetName, targetIconMeta);
    bumpOutcome(ab.outcomes, ev);
    bumpOutcome(tgt.outcomes, ev);
    actor.damage += ev.damage!;
    ab.damage += ev.damage!;
    tgt.damage += ev.damage!;
    if (ev.splash) {
      ab.splashDamage += ev.damage!;
      tgt.splashDamage += ev.damage!;
    }
    bumpLandedAmount(ab, tgt, ev.damage!, crit);
    bumpDamageType(ab, ev.damageType, ev.damage!);
    const ch = deriveChannel(ev);
    if (ch === "burn") actor.burn += ev.damage!;
    else if (ch === "blast") actor.blast += ev.damage!;
    else if (ch === "cleave") actor.cleave += ev.damage!;
    else if (ch === "base") actor.base += ev.damage!;
  }

  if (healAmt > 0) {
    const hKey = healAbilityKey(ev.source, ev.heal, ev.lifesteal);
    const ab = ensureAbility(actor, hKey);
    const tgt = ensureTarget(ab, targetId, targetName, targetIconMeta);
    // Heal-only packets still need outcome counts on the heal ability.
    if (!hasDamage) {
      bumpOutcome(ab.outcomes, ev);
      bumpOutcome(tgt.outcomes, ev);
    }
    actor.heal += healAmt;
    ab.heal += healAmt;
    tgt.heal += healAmt;
    // Crit on a heal packet is rare in AL; still bucket honestly when present.
    bumpLandedAmount(ab, tgt, healAmt, !hasDamage && crit);
  }

  if (manaAmt > 0) {
    actor.mana += manaAmt;
  }
}

export function emptySegment(
  id: string,
  at: number,
  label?: string,
): CombatSegment {
  return {
    id,
    startedAt: at,
    label,
    actors: {},
    deaths: [],
    conditions: [],
    casts: [],
    gearSwaps: [],
  };
}

function mergeDamageTypes(
  dest: Record<string, number>,
  src: Record<string, number> | undefined,
): void {
  if (!src) return;
  const keys = Object.keys(src);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    dest[k] = (dest[k] || 0) + (src[k] || 0);
  }
}

/** Merge past segments into a session total (shallow totals + abilities). */
export function mergeSegments(
  id: string,
  parts: CombatSegment[],
  now: number,
): CombatSegment {
  const out = emptySegment(id, parts[0]?.startedAt || now, "Total");
  out.endedAt = now;
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!out.startedAt || seg.startedAt < out.startedAt) {
      out.startedAt = seg.startedAt;
    }
    const ids = Object.keys(seg.actors);
    for (let a = 0; a < ids.length; a++) {
      const src = seg.actors[ids[a]];
      const dst = ensureActor(out, src.id, {
        name: src.name,
        ctype: src.ctype,
        partyKey: src.partyKey,
      });
      dst.damage += src.damage;
      dst.heal += src.heal;
      dst.taken += src.taken;
      dst.healingRequired += src.healingRequired;
      dst.mana += src.mana;
      dst.dr += src.dr;
      dst.reflect += src.reflect;
      dst.base += src.base;
      dst.blast += src.blast;
      dst.burn += src.burn;
      dst.cleave += src.cleave;
      dst.outcomes.hits += src.outcomes.hits;
      dst.outcomes.crits += src.outcomes.crits;
      dst.outcomes.miss += src.outcomes.miss;
      dst.outcomes.evade += src.outcomes.evade;
      dst.outcomes.avoid += src.outcomes.avoid;
      dst.outcomes.kills += src.outcomes.kills;
      if (src.misc) {
        if (!dst.misc) dst.misc = emptyMisc();
        dst.misc.interrupts += src.misc.interrupts;
        dst.misc.dispels += src.misc.dispels;
        dst.misc.deaths += src.misc.deaths;
      }
      const abKeys = Object.keys(src.abilities);
      for (let k = 0; k < abKeys.length; k++) {
        const sab = src.abilities[abKeys[k]];
        const dab = ensureAbility(dst, sab.key);
        dab.damage += sab.damage;
        dab.heal += sab.heal;
        dab.splashDamage += sab.splashDamage;
        dab.taken += sab.taken;
        dab.outcomes.hits += sab.outcomes.hits;
        dab.outcomes.crits += sab.outcomes.crits;
        dab.outcomes.miss += sab.outcomes.miss;
        dab.outcomes.evade += sab.outcomes.evade;
        dab.outcomes.avoid += sab.outcomes.avoid;
        dab.outcomes.kills += sab.outcomes.kills;
        mergeHitAmountStats(dab.normal, sab.normal);
        mergeHitAmountStats(dab.crit, sab.crit);
        mergeDamageTypes(dab.damageTypes, sab.damageTypes);
        const tKeys = Object.keys(sab.targets);
        for (let t = 0; t < tKeys.length; t++) {
          const st = sab.targets[tKeys[t]];
          const dt = ensureTarget(dab, st.id, st.name, {
            mtype: st.mtype,
            ctype: st.ctype,
          });
          dt.damage += st.damage;
          dt.heal += st.heal;
          dt.splashDamage += st.splashDamage;
          dt.outcomes.hits += st.outcomes.hits;
          dt.outcomes.crits += st.outcomes.crits;
          dt.outcomes.miss += st.outcomes.miss;
          dt.outcomes.evade += st.outcomes.evade;
          dt.outcomes.avoid += st.outcomes.avoid;
          dt.outcomes.kills += st.outcomes.kills;
          mergeHitAmountStats(dt.normal, st.normal);
          mergeHitAmountStats(dt.crit, st.crit);
        }
      }
    }
    for (let d = 0; d < seg.deaths.length; d++) {
      out.deaths.push(seg.deaths[d]);
    }
  }
  return out;
}
