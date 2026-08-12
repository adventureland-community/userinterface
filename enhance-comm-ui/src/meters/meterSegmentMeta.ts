/**
 * Segment labels and wipe/kill outcome (Details red/green segments).
 */

import type { CombatSegment } from "./meterTypes";

export type SegmentOutcome = "kill" | "wipe" | "timeout";

export function formatSegmentDuration(seg: CombatSegment): string {
  const end = seg.endedAt || Date.now();
  const sec = Math.max((end - seg.startedAt) / 1000, 1);
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)}h`;
  if (sec >= 60) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec)}s`;
}

export function autoSegmentLabel(
  seg: CombatSegment,
  seq: number,
): string {
  if (seg.label) return seg.label;
  const dur = formatSegmentDuration(seg);
  const deaths = seg.deaths.length;
  if (deaths > 0) {
    return `Fight #${seq} · ${dur} · ${deaths} death${deaths === 1 ? "" : "s"}`;
  }
  return `Fight #${seq} · ${dur}`;
}

/** Wipe if every tracked player actor died in this segment. */
export function inferSegmentOutcome(
  seg: CombatSegment,
  partyActorIds: string[],
): SegmentOutcome {
  if (seg.outcome) return seg.outcome;
  if (!partyActorIds.length) return "timeout";
  let dead = 0;
  for (let i = 0; i < partyActorIds.length; i++) {
    const id = partyActorIds[i];
    let wasDead = false;
    for (let d = 0; d < seg.deaths.length; d++) {
      if (seg.deaths[d].id === id) {
        wasDead = true;
        break;
      }
    }
    if (wasDead) dead += 1;
  }
  if (dead >= partyActorIds.length && dead > 0) return "wipe";
  if (seg.deaths.length === 0 && seg.endedAt) return "kill";
  return seg.deaths.length > 0 ? "wipe" : "kill";
}

export function segmentOutcomeClass(outcome?: SegmentOutcome): string {
  if (outcome === "wipe") return "ecu-seg-wipe";
  if (outcome === "kill") return "ecu-seg-kill";
  return "";
}
