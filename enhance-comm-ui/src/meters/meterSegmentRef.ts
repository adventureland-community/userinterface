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

/**
 * Picker Current — follows the live camera (idle fade, auto-hide, you-pin).
 * Overall / run overall / past do not.
 */
export function isLiveCameraRef(ref: SegmentRef | undefined): boolean {
  return !ref || ref === "current";
}

/**
 * Bars/charts should refresh on combat ticks for this picker ref.
 * Current always; Overall / matching run overall while a live fight is included.
 */
export function segmentWantsLiveTick(
  ref: SegmentRef | undefined,
  live: CombatSegment | null | undefined,
): boolean {
  if (!ref || ref === "current") return true;
  if (typeof ref === "object" && "pastId" in ref) return false;
  if (!live) return false;
  if (ref === "total") return true;
  if (typeof ref === "object" && "mapIn" in ref) {
    return !!live.mapIn && live.mapIn === ref.mapIn;
  }
  if (typeof ref === "object" && "event" in ref) {
    return !!live.event && live.event === ref.event;
  }
  return false;
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
