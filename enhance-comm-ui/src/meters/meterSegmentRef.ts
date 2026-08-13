/**
 * Canonical SegmentRef identity. UI must not parse pastId / mapIn / event.
 */

import type { CombatSegment, SegmentRef } from "./meterTypes";

export function segmentRefKey(ref: SegmentRef): string {
  if (ref === "current" || ref === "total") return ref;
  if ("pastId" in ref) return `past:${ref.pastId}`;
  if ("mapIn" in ref) return `mapIn:${ref.mapIn}`;
  if ("event" in ref) return `event:${ref.event}`;
  const _never: never = ref;
  return String(_never);
}

export function refsEqual(a: SegmentRef, b: SegmentRef): boolean {
  return segmentRefKey(a) === segmentRefKey(b);
}

/** Picker Current — follows the live camera. Past / run overall / total do not. */
export function isLiveCameraRef(ref: SegmentRef | undefined): boolean {
  return !ref || ref === "current";
}

export type SegmentChoice = {
  ref: SegmentRef;
  title: string;
  /** Header/chip without duration — chrome already appends `· 40s`. */
  chip?: string;
  /** Hover-detail copy. Never include instance `in`. */
  tip?: string;
  outcome?: CombatSegment["outcome"];
  /** Archive retention favorite (past fights only). */
  favorite?: boolean;
};
