/**
 * Better Timeline HUD chrome that maps onto AL CDs.
 * Ticks every 5s, last-N BigIcons, 5s/3s countdown colors.
 * Not: audio, pull/readycheck, DBM/BW, Encounter Journal reminders.
 */

import type {
  AbilityTimelineRow,
  AbilityTimelineSection,
} from "./abilityTimelineModel";
import {
  abilityVisibleOnBigIcon,
  DEFAULT_ABILITY_TIMELINE_PREFS,
  type AbilityGrowDir,
  type AbilityTimelinePrefs,
} from "./abilityTimelinePrefs";

/** BT TIMELINE_TICKS default — one mark per 5s inside the window. */
export const ABILITY_TICK_EVERY_MS = 5000;
/** BT cooldown_highlight 3s (red). */
export const ABILITY_CD_CRIT_MS = 3000;
/** BT BigIcon size default, scaled down for the AL overlay. */
export const ABILITY_BIGICON_MIN = 64;

export type AbilityCdHighlight = "crit" | "warn" | "none";

export function timelineTickMs(
  windowMs: number,
  everyMs: number = ABILITY_TICK_EVERY_MS,
): number[] {
  const out: number[] = [];
  if (!(windowMs > 0) || !(everyMs > 0)) return out;
  for (let t = everyMs; t < windowMs; t += everyMs) {
    out.push(t);
  }
  return out;
}

export function cdHighlightKind(
  ms: number,
  ready: boolean,
  imminentMs: number = DEFAULT_ABILITY_TIMELINE_PREFS.imminentMs,
): AbilityCdHighlight {
  if (ready || ms <= 0) return "none";
  const critMs = Math.min(ABILITY_CD_CRIT_MS, imminentMs);
  if (ms <= critMs) return "crit";
  if (ms <= imminentMs) return "warn";
  return "none";
}

/** BT HandleCooldown: ceil seconds under 60, Nm above. Empty when ready. */
export function formatAbilityCountdown(ms: number): string {
  if (ms <= 0) return "";
  const sec = ms / 1000;
  if (sec > 60) {
    const minutes = sec % 60 > 30 ? Math.ceil(sec / 60) : Math.floor(sec / 60);
    return minutes + "m";
  }
  return String(Math.ceil(sec));
}

export function nearTimelineTick(
  ms: number,
  windowMs: number,
  everyMs: number = ABILITY_TICK_EVERY_MS,
  slopMs: number = 200,
): boolean {
  if (ms <= 0) return false;
  const ticks = timelineTickMs(windowMs, everyMs);
  for (let i = 0; i < ticks.length; i++) {
    if (Math.abs(ms - ticks[i]) <= slopMs) return true;
  }
  return false;
}

export function bigIconSize(iconSize: number): number {
  return Math.max(ABILITY_BIGICON_MIN, Math.round(iconSize * 1.8));
}

export type AbilityBigIcon = {
  key: string;
  id: string;
  name: string;
  skillName: string;
  caster: string;
  ms: number;
  cooldown: number;
  mtype?: string;
  highlight: AbilityCdHighlight;
};

/** Remaining in (0, imminentMs], soonest first — BigIcon + highlight share this. */
export function collectBigIcons(
  sections: AbilityTimelineSection[],
  prefs: AbilityTimelinePrefs,
): AbilityBigIcon[] {
  const out: AbilityBigIcon[] = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const multi = sections.length > 1;
    for (let j = 0; j < section.rows.length; j++) {
      const row = section.rows[j];
      if (row.ready || row.ms <= 0 || row.ms > prefs.imminentMs) continue;
      if (!abilityVisibleOnBigIcon(row.id, prefs)) continue;
      out.push({
        key: `${section.targetId}:${row.id}`,
        id: row.id,
        name: multi ? `${section.targetName} · ${row.name}` : row.name,
        skillName: row.name,
        caster: section.targetName,
        ms: row.ms,
        cooldown: row.cooldown,
        mtype: section.targetMtype,
        highlight: cdHighlightKind(row.ms, false, prefs.imminentMs),
      });
    }
  }
  out.sort((a, b) => a.ms - b.ms || a.id.localeCompare(b.id));
  return out;
}

export function growFlexDirection(
  dir: AbilityGrowDir,
): "row" | "row-reverse" | "column" | "column-reverse" {
  switch (dir) {
    case "right":
      return "row";
    case "left":
      return "row-reverse";
    case "down":
      return "column";
    case "up":
      return "column-reverse";
    default: {
      const _exhaustive: never = dir;
      return _exhaustive;
    }
  }
}

export function rowCdClass(
  row: AbilityTimelineRow,
  prefs: AbilityTimelinePrefs,
): string {
  const kind = cdHighlightKind(row.ms, row.ready, prefs.imminentMs);
  if (kind === "crit") return "is-crit";
  if (kind === "warn") return "is-warn";
  if (row.ready) return "is-ready";
  return "";
}
