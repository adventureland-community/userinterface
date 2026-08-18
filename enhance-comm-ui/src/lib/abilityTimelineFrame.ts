/**
 * Ability timeline HUD box. Vertical default is a tall stick; horizontal
 * needs a wide short rail. Only swap when the saved box still looks like
 * the unused orientation's default — leave mid-size user resizes alone.
 */

import type { AbilityTimelineOrient } from "../instance/abilityTimelinePrefs";
import type { PanelLayoutMap } from "./layout";
import {
  ABILITY_TIMELINE_FRAME_DEFAULT,
  ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT,
} from "./frameSizes";

export type AbilityTimelineFrameSize = {
  frameW: number;
  frameH: number;
};

const VERTICAL_MAX_W = 90;
const VERTICAL_MIN_H = 160;
const HORIZONTAL_MAX_H = 120;
const HORIZONTAL_MIN_W = 160;

function dim(n: number | undefined): number {
  return typeof n === "number" ? n : 0;
}

function looksVerticalRail(w: number, h: number): boolean {
  return w > 0 && h > 0 && w <= VERTICAL_MAX_W && h >= VERTICAL_MIN_H && w < h;
}

function looksHorizontalRail(w: number, h: number): boolean {
  return (
    w > 0 && h > 0 && h <= HORIZONTAL_MAX_H && w >= HORIZONTAL_MIN_W && h < w
  );
}

/**
 * Next frame size after an orientation change, or null if the current box
 * should stay (user-resized, or already matching this orientation).
 */
export function abilityTimelineFrameForOrient(
  orient: AbilityTimelineOrient,
  current: { frameW?: number; frameH?: number },
): AbilityTimelineFrameSize | null {
  const w = dim(current.frameW);
  const h = dim(current.frameH);
  const swap =
    orient === "horizontal"
      ? looksVerticalRail(w, h)
      : looksHorizontalRail(w, h);
  if (!swap) return null;
  const def =
    orient === "horizontal"
      ? ABILITY_TIMELINE_HORIZONTAL_FRAME_DEFAULT
      : ABILITY_TIMELINE_FRAME_DEFAULT;
  return {
    frameW: Math.max(h, def.frameW),
    frameH: Math.max(w, def.frameH),
  };
}

/** Seed a layout map so a rail-shaped box matches the current orientation. */
export function applyAbilityTimelineOrientFrame<T extends PanelLayoutMap>(
  layout: T,
  orient: AbilityTimelineOrient,
): T {
  const pos = layout.abilityTimeline;
  if (!pos) return layout;
  const size = abilityTimelineFrameForOrient(orient, pos);
  if (!size) return layout;
  return { ...layout, abilityTimeline: { ...pos, ...size } };
}
