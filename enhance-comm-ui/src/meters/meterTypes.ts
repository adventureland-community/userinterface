/**
 * Shared meter contracts — query × presentation over CombatSegment trees.
 */

import type { CombatChannel } from "./combatChannels";
import type { PartyFocus } from "../lib/settingsFocus";
import type { PanelPos } from "../lib/layout";

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
  | { kind: "details"; actorId: string; ability?: AbilityKey }
  | { kind: "summary" }
  | { kind: "avoidance" }
  | { kind: "encounter_summary" }
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

/** Misc counters for Details Miscellaneous displays. */
export type MiscCounts = {
  interrupts: number;
  dispels: number;
  deaths: number;
};

export type TargetAgg = {
  id: string;
  name: string;
  damage: number;
  heal: number;
  splashDamage: number;
  outcomes: OutcomeCounts;
};

export type AbilityAgg = {
  key: AbilityKey;
  damage: number;
  heal: number;
  splashDamage: number;
  taken: number;
  outcomes: OutcomeCounts;
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
};

export type RankedRow = {
  id: string;
  name: string;
  ctype?: string;
  value: number;
  rate: number | null;
  pct: number;
  barMax: number;
  /** When set (DPS/HPS displays), bar width uses this instead of `value`. */
  barValue?: number;
  label: string;
  kind?: "player" | "ability" | "target" | "channel";
  you?: boolean;
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
      /** Splash on the selected ability (0 if none selected). */
      abilitySplash: number;
      outcomes: OutcomeCounts;
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
export type MeterSnapMap = {
  1?: string;
  2?: string;
  3?: string;
  4?: string;
};

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
   * Per-panel lock. `undefined` follows global `metersLocked`.
   * `false` = unlocked (drag/resize without Alt). `true` = locked.
   */
  locked?: boolean;
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

export function damageAbilityKey(source?: string): AbilityKey {
  if (!source || source === "attack") return "attack";
  return source;
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
    return source;
  }
  if (lifesteal && lifesteal > 0) return "lifesteal";
  if (!source || source === "attack") return "heal";
  return source;
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
