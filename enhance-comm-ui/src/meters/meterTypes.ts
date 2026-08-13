/**
 * Shared meter contracts — query × presentation over CombatSegment trees.
 */

import type { CombatChannel } from "./combatChannels";
import type { PartyFocus } from "../lib/settingsFocus";
import type { PanelPos } from "../lib/layout";
import type { EdgeSnapMap } from "../lib/panelEdgeGroup";
import { canonicalAbilityId } from "../lib/abilityIds";

export type AbilityKey = string;

export type SegmentRef = "current" | "total" | { pastId: string };

export type MeterPresentation =
  | "bars"
  | "table"
  | "pie"
  | "line"
  | "realtime"
  | "details"
  | "summary"
  | "death_log"
  | "timeline"
  | "encounter"
  | "compare"
  | "series";

export type PlayersMetric =
  "damage" | "heal" | "taken" | "healing_required" | "avoidance";

/** Rank by totals (Damage Done) or by rate (DPS / HPS). */
export type PlayersPrimary = "total" | "rate";

export type MeterQuery =
  | {
      kind: "players";
      metric: PlayersMetric;
      /** Default `"total"`. `"rate"` = Details DPS/HPS display. */
      primary?: PlayersPrimary;
    }
  | { kind: "abilities"; actorId: string; metric?: PlayersMetric }
  | {
      kind: "ability_targets";
      actorId: string;
      ability: AbilityKey;
      metric?: PlayersMetric;
    }
  | { kind: "targets"; actorId: string; metric?: PlayersMetric }
  | {
      kind: "details";
      actorId: string;
      ability?: AbilityKey;
      /** Attribute lens from the rank meter that opened Inspector (Details). */
      metric?: PlayersMetric;
      primary?: PlayersPrimary;
    }
  | { kind: "summary" }
  | { kind: "avoidance" }
  | { kind: "encounter_summary" }
  /** Segment-wide damage taken rolled up by incoming ability key. */
  | { kind: "taken_by_spell" }
  /** Damage dealt to non-player targets (Adds / enemy damage taken). */
  | { kind: "enemy_damage" }
  | { kind: "channel"; channel: CombatChannel }
  | { kind: "rolling"; windowMs?: number }
  | { kind: "realtime"; windowMs?: number }
  | { kind: "compare"; metric?: PlayersMetric }
  | { kind: "snapshot"; mode: "pdps" | "coop_v1" | "coop_v2" }
  | { kind: "pie"; actorId?: string; metric?: PlayersMetric }
  | { kind: "death_log" }
  | { kind: "history"; channel?: CombatChannel }
  | { kind: "timeline" }
  | { kind: "conditions"; actorId?: string }
  | {
      kind: "misc";
      metric: "interrupts" | "dispels" | "deaths" | "cc_breaks";
    };

export type OutcomeCounts = {
  hits: number;
  crits: number;
  miss: number;
  evade: number;
  avoid: number;
  kills: number;
};

/**
 * Per-bucket landed amount stats (Details n_amt/n_total/n_min/n_max).
 * Built from hub hit `damage`/`heal` + `crit` multiplier — not CLEU.
 */
export type HitAmountStats = {
  count: number;
  total: number;
  min: number;
  max: number;
};

/** Misc counters for Details Miscellaneous displays. */
export type MiscCounts = {
  interrupts: number;
  dispels: number;
  deaths: number;
};

export type TargetAgg = {
  id: string;
  name: string;
  /** Monster type key when known (for sprite icons after despawn). */
  mtype?: string;
  /** Player class when target is a player. */
  ctype?: string;
  damage: number;
  heal: number;
  splashDamage: number;
  outcomes: OutcomeCounts;
  normal: HitAmountStats;
  crit: HitAmountStats;
};

export type AbilityAgg = {
  key: AbilityKey;
  damage: number;
  heal: number;
  splashDamage: number;
  taken: number;
  outcomes: OutcomeCounts;
  /** Non-crit landed amounts (damage or heal on this ability key). */
  normal: HitAmountStats;
  /** Crit landed amounts (`hit.crit` > 1). */
  crit: HitAmountStats;
  /**
   * AL `damage_type` totals (physical / magical / pure) — not WoW spell school.
   * Keyed by lowercase type string from the packet.
   */
  damageTypes: Record<string, number>;
  targets: Record<string, TargetAgg>;
};

export type ActorAgg = {
  id: string;
  name: string;
  ctype?: string;
  partyKey: string;
  damage: number;
  heal: number;
  taken: number;
  healingRequired: number;
  mana: number;
  dr: number;
  reflect: number;
  base: number;
  blast: number;
  burn: number;
  cleave: number;
  outcomes: OutcomeCounts;
  misc: MiscCounts;
  abilities: Record<string, AbilityAgg>;
};

export type ConditionInterval = {
  actorId: string;
  key: string;
  startedAt: number;
  endedAt?: number;
};

export type CastMarker = {
  at: number;
  actorId: string;
  source: string;
  targetId?: string;
  pid?: string | number;
};

/**
 * One equipped-slot change (not a per-tick snapshot).
 * Diffed from entity/`character`.slots after the server `resend(u+cid)`
 * that follows equip/unequip — there is no client `equip` packet.
 */
export type GearSwapEvent = {
  at: number;
  actorId: string;
  slot: string;
  oldName?: string;
  newName?: string;
  oldLevel?: number;
  newLevel?: number;
  /** Slot skin, else G.items[name].skin for GameIcon. */
  skin?: string;
};

export type DeathSnapshot = {
  id: string;
  name: string;
  at: number;
  killerId?: string;
  hpLog: Array<{ at: number; hp: number; maxHp: number }>;
  recentHits: Array<{
    at: number;
    actor?: string;
    damage: number;
    source?: string;
  }>;
};

export type CombatSegment = {
  id: string;
  startedAt: number;
  endedAt?: number;
  label?: string;
  /** kill = success, wipe = party deaths, timeout = idle break. */
  outcome?: "kill" | "wipe" | "timeout";
  seq?: number;
  actors: Record<string, ActorAgg>;
  deaths: DeathSnapshot[];
  conditions: ConditionInterval[];
  casts: CastMarker[];
  gearSwaps: GearSwapEvent[];
};

export type RankedRow = {
  id: string;
  name: string;
  ctype?: string;
  value: number;
  rate: number | null;
  pct: number;
  barMax: number;
  /**
   * Amount used for bar width + sort (Details `instance.top` units).
   * Total displays: segment total. Rate displays (DPS/HPS): per-second rate.
   */
  barValue: number;
  /** Which quantity `barValue` represents — drives label order + ranking. */
  primary: PlayersPrimary;
  label: string;
  kind?: "player" | "ability" | "target" | "channel";
  you?: boolean;
  /** Monster type for kind="target" icons (G.monsters / sprite). */
  mtype?: string;
  /** True 1-based rank when Always-show-me pins below the fold. */
  rank?: number;
  /** Explosion/splash damage on this ability (Inspector spell list). */
  splashDamage?: number;
  /** Inspector spell list — currently selected ability. */
  selected?: boolean;
};

export type UptimeRow = {
  id: string;
  name: string;
  /** Fraction of segment duration the condition was active (0–1). */
  uptime: number;
  apps: number;
  activeMs: number;
};

export type MeterResult =
  | {
      kind: "ranked";
      rows: RankedRow[];
      title?: string;
    }
  | {
      kind: "details";
      actorId: string;
      actorName: string;
      ctype?: string;
      ability?: AbilityKey;
      /** Attribute lens (damage / heal / taken) driving spell list + blocks. */
      metric: PlayersMetric;
      primary: PlayersPrimary;
      /** Splash on the selected ability (0 if none selected). */
      abilitySplash: number;
      /** Selected ability total in metric units (damage/heal/taken). */
      abilityTotal: number;
      /** Approximate cast count from action timeline (AL — not CLEU). */
      abilityCasts: number;
      outcomes: OutcomeCounts;
      /** Selected ability normal-hit amount stats (empty if none / legacy segment). */
      hitNormal: HitAmountStats;
      /** Selected ability crit-hit amount stats. */
      hitCrit: HitAmountStats;
      /**
       * Dominant AL `damage_type` for the selected ability
       * (physical / magical / pure), if any damage was typed.
       */
      damageType?: string;
      /** Always actor-level overview totals. */
      totals: {
        damage: number;
        heal: number;
        taken: number;
        healingRequired: number;
      };
      durationMs: number;
      abilityRows: RankedRow[];
      /** Buff / condition uptime for this actor. */
      uptimeRows: UptimeRow[];
      targetRows: RankedRow[];
      deaths: number;
    }
  | {
      kind: "summary";
      matrix: Array<{
        id: string;
        name: string;
        damage: number;
        heal: number;
        taken: number;
      }>;
    }
  | {
      kind: "encounter";
      durationMs: number;
      totalDamage: number;
      totalHeal: number;
      deaths: number;
      topDps?: RankedRow;
    }
  | {
      kind: "death_log";
      deaths: DeathSnapshot[];
    }
  | {
      kind: "history";
      points: Array<{ at: number; values: Record<string, number> }>;
      seriesKeys: string[];
    }
  | {
      kind: "timeline";
      casts: CastMarker[];
      conditions: ConditionInterval[];
      gearSwaps: GearSwapEvent[];
      durationMs: number;
    }
  | {
      kind: "pie";
      slices: Array<{
        id: string;
        name: string;
        value: number;
        color?: string;
      }>;
    }
  | { kind: "empty"; reason?: string };

/** Details-style edge snap: 1 left · 2 bottom · 3 right · 4 top → neighbor id. */
export type MeterSnapMap = EdgeSnapMap;

export type MeterPanelConfig = {
  id: string;
  label?: string;
  query: MeterQuery;
  presentation?: MeterPresentation;
  /** Skada per-window segment selection. */
  selectedset?: SegmentRef;
  partyFocus?: PartyFocus;
  fadeWhenIdle?: boolean;
  seriesMode?: "realtime" | "compare";
  stack?: boolean;
  integrate?: boolean;
  normalize?: boolean;
  /** Realtime series chrome (paint-only tick mutates canvas). */
  rtMetric?: "dps" | "hps" | "taken";
  rtWindow?: 15 | 30 | 60;
  rtPaused?: boolean;
  seriesEnabled?: Record<string, boolean>;
  /** Hide frame when query has no contributors (coop / PDPS). */
  hideWhenEmpty?: boolean;
  /**
   * When true, pin self on the ranked list if off the visible window
   * (Details “Always show me”). Default follows global setting.
   */
  alwaysShowSelf?: boolean;
};

/** Persisted panel instance — pos lives here (not PanelId). */
export type MeterInstance = MeterPanelConfig & {
  pos: PanelPos;
  visible?: boolean;
  opacity?: number;
  /** Outer frame size in px (layout resize). */
  frameW?: number;
  frameH?: number;
  /**
   * Per-panel lock. `undefined` follows global `windowsLocked`.
   * `false` = unlocked (drag/resize without Alt). `true` = locked.
   * New windows set `false` explicitly so they open arrange-ready.
   */
  locked?: boolean;
  /**
   * Paint order among meters (and above HUD panels). Higher = in front.
   * Assigned on open/create via meterWindowStack; not required for legacy rows.
   */
  zIndex?: number;
  /** Details window_scale (1 = 100%). Shared across edge-snap group when set. */
  scale?: number;
  /** Edge-snap group links (Details window groups). */
  snap?: MeterSnapMap;
  /** Side-by-side group — share height on resize/stretch. */
  horizontalSnap?: boolean;
  /** Stacked group — share width on resize. */
  verticalSnap?: boolean;
};

/** Saved Display×Scope×Segment bookmark (Details-like). */
export type MeterBookmark = {
  id: string;
  label: string;
  query: MeterQuery;
  presentation?: MeterPresentation;
  partyFocus?: PartyFocus;
  selectedset?: SegmentRef;
};

export function emptyMisc(): MiscCounts {
  return { interrupts: 0, dispels: 0, deaths: 0 };
}

export function emptyOutcomes(): OutcomeCounts {
  return {
    hits: 0,
    crits: 0,
    miss: 0,
    evade: 0,
    avoid: 0,
    kills: 0,
  };
}

export function emptyHitAmountStats(): HitAmountStats {
  return { count: 0, total: 0, min: 0, max: 0 };
}

/** Merge one landed amount into a normal/crit bucket. */
export function bumpHitAmount(stats: HitAmountStats, amount: number): void {
  if (!(amount > 0)) return;
  if (stats.count === 0) {
    stats.min = amount;
    stats.max = amount;
  } else {
    if (amount < stats.min) stats.min = amount;
    if (amount > stats.max) stats.max = amount;
  }
  stats.count += 1;
  stats.total += amount;
}

/** Merge source hit stats into dest (segment merge / Total). */
export function mergeHitAmountStats(
  dest: HitAmountStats,
  src: HitAmountStats | undefined,
): void {
  if (!src || src.count <= 0) return;
  if (dest.count === 0) {
    dest.count = src.count;
    dest.total = src.total;
    dest.min = src.min;
    dest.max = src.max;
    return;
  }
  dest.count += src.count;
  dest.total += src.total;
  if (src.min < dest.min) dest.min = src.min;
  if (src.max > dest.max) dest.max = src.max;
}

/** Pick AL damage_type with the largest amount (not a WoW school). */
export function dominantDamageType(
  types: Record<string, number> | undefined,
): string | undefined {
  if (!types) return undefined;
  const keys = Object.keys(types);
  let best: string | undefined;
  let bestV = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = types[k] || 0;
    if (v > bestV) {
      bestV = v;
      best = k;
    }
  }
  return best;
}

export function damageAbilityKey(source?: string): AbilityKey {
  if (!source || source === "attack") return "attack";
  return canonicalAbilityId(source);
}

/**
 * Ability bucket for healing. Never reuse the damage attack key for
 * lifesteal — otherwise Healing drill-down looks like a damage meter.
 */
export function healAbilityKey(
  source?: string,
  heal?: number,
  lifesteal?: number,
): AbilityKey {
  if (heal && heal > 0) {
    if (!source || source === "attack") return "heal";
    return canonicalAbilityId(source);
  }
  if (lifesteal && lifesteal > 0) return "lifesteal";
  if (!source || source === "attack") return "heal";
  return canonicalAbilityId(source);
}

/** @deprecated Prefer damageAbilityKey / healAbilityKey — do not mix buckets. */
export function abilityKeyFromEvent(
  source?: string,
  heal?: number,
): AbilityKey {
  if (heal && heal > 0 && (!source || source === "attack")) return "heal";
  return damageAbilityKey(source);
}

export function segmentDurationMs(
  seg: CombatSegment,
  now = Date.now(),
): number {
  const end = seg.endedAt != null ? seg.endedAt : now;
  return Math.max(end - seg.startedAt, 1);
}
