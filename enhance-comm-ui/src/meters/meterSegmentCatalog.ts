/**
 * Segment picker catalog. Archive only supplies meta; this file owns titles
 * and the Current / run overall / Overall / fights list.
 * Instance `in` is never shown in titles or hover tips.
 */

import { listArchiveMeta, type ArchiveMeta } from "./meterArchive";
import { eventDisplayName, mapDisplayName, runRefForSegment } from "./meterRun";
import {
  fightChipTitle,
  fightHoverTip,
  fightPickerTitle,
  sourceFromMeta,
  sourceFromSegment,
  type FightLabelSource,
} from "./meterSegmentMeta";
import { refsEqual, segmentRefKey, type SegmentChoice } from "./meterSegmentRef";
import type { CombatSegment, SegmentRef } from "./meterTypes";

export function runTitle(ref: SegmentRef, map?: string): string {
  if (ref === "current") return "Current";
  if (ref === "total") return "Overall";
  if ("pastId" in ref) return "Fight";
  if ("event" in ref) return `${eventDisplayName(ref.event)} overall`;
  if ("mapIn" in ref) {
    return `${mapDisplayName(map || "") || "Instance"} overall`;
  }
  const _never: never = ref;
  return String(_never);
}

/** Hover copy for Current / Overall / instance-or-event overall. No mapIn. */
function runHoverTip(ref: SegmentRef, map?: string): string {
  if (ref === "current") return "Live camera fight";
  if (ref === "total") return "All recorded fights from this camera";
  if ("pastId" in ref) return "";
  if ("event" in ref) {
    return `${eventDisplayName(ref.event)} overall\nAll fights in this world event`;
  }
  if ("mapIn" in ref) {
    const name = mapDisplayName(map || "") || "Instance";
    return `${name} overall\nAll fights in this instance`;
  }
  const _never: never = ref;
  return String(_never);
}

export function partsForRun(
  ref: SegmentRef,
  live: CombatSegment | null,
  past: CombatSegment[],
): CombatSegment[] {
  const parts: CombatSegment[] = [];
  const match = (seg: CombatSegment): boolean => {
    if (ref === "total") return true;
    if (typeof ref === "object" && "mapIn" in ref) {
      return seg.mapIn === ref.mapIn;
    }
    if (typeof ref === "object" && "event" in ref) {
      return seg.event === ref.event;
    }
    return false;
  };
  if (live && match(live)) parts.push(live);
  for (let i = 0; i < past.length; i++) {
    if (match(past[i])) parts.push(past[i]);
  }
  return parts;
}

function fightChoice(id: string, src: FightLabelSource): SegmentChoice {
  const fav = !!src.favorite;
  return {
    ref: { pastId: id },
    title: (fav ? "★ " : "") + fightPickerTitle(src),
    chip: fightChipTitle(src),
    tip: fightHoverTip(src),
    outcome: src.outcome,
    favorite: fav,
  };
}

function currentChoice(
  live: CombatSegment | null,
  past: CombatSegment[],
): SegmentChoice {
  const srcSeg = live || past[0];
  if (!srcSeg) {
    return {
      ref: "current",
      title: runTitle("current"),
      tip: "Live camera fight\nNo fight recorded yet",
    };
  }
  const src = sourceFromSegment(srcSeg);
  const head = live
    ? "Live camera fight"
    : "Last fight (out of combat)";
  return {
    ref: "current",
    title: runTitle("current"),
    tip: `${head}\n${fightHoverTip(src)}`,
  };
}

function addRunChoice(
  out: SegmentChoice[],
  seen: Record<string, boolean>,
  seg: Pick<CombatSegment, "map" | "mapIn" | "event"> | null | undefined,
): void {
  if (!seg) return;
  const run = runRefForSegment(seg);
  if (!run) return;
  const key = segmentRefKey(run);
  if (seen[key]) return;
  seen[key] = true;
  out.push({
    ref: run,
    title: runTitle(run, seg.map),
    tip: runHoverTip(run, seg.map),
  });
}

function appendArchivedRuns(
  out: SegmentChoice[],
  seen: Record<string, boolean>,
  meta: ArchiveMeta[],
): void {
  for (let i = 0; i < meta.length; i++) {
    addRunChoice(out, seen, meta[i]);
  }
}

function appendArchivedFights(
  out: SegmentChoice[],
  ramIds: Record<string, boolean>,
  meta: ArchiveMeta[],
): void {
  for (let i = 0; i < meta.length; i++) {
    const m = meta[i];
    if (ramIds[m.id]) continue;
    out.push(fightChoice(m.id, sourceFromMeta(m)));
  }
}

export function buildSegmentChoices(args: {
  live: CombatSegment | null;
  past: CombatSegment[];
  camera: { map: string; mapIn: string; event?: string } | null;
}): SegmentChoice[] {
  const { live, past, camera } = args;
  const meta = listArchiveMeta();
  const out: SegmentChoice[] = [currentChoice(live, past)];
  const seen: Record<string, boolean> = {};
  addRunChoice(out, seen, live);
  if (camera) addRunChoice(out, seen, camera);
  for (let i = 0; i < past.length; i++) addRunChoice(out, seen, past[i]);
  appendArchivedRuns(out, seen, meta);
  out.push({
    ref: "total",
    title: runTitle("total"),
    tip: runHoverTip("total"),
  });
  const ramIds: Record<string, boolean> = {};
  for (let i = 0; i < past.length; i++) {
    const p = past[i];
    ramIds[p.id] = true;
    out.push(fightChoice(p.id, sourceFromSegment(p)));
  }
  appendArchivedFights(out, ramIds, meta);
  return out;
}

export function titleForRef(
  ref: SegmentRef,
  choices: SegmentChoice[],
): string | undefined {
  for (let i = 0; i < choices.length; i++) {
    if (refsEqual(choices[i].ref, ref)) {
      return choices[i].chip || choices[i].title;
    }
  }
  return undefined;
}
