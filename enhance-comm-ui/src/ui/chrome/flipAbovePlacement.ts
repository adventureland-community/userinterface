/**
 * Shared above/below placement: given free space and measured height, pick
 * which side fits (or which side gets a scroll maxHeight when both are tight).
 */

export type FlipPlace = "above" | "below";

export type FlipAboveDecision = {
  place: FlipPlace;
  maxHeight?: number;
};

/**
 * Pure flip decision from measured height and available space.
 *
 * Default: open **below** whenever the menu fits — required for toolbar
 * hover bridges when the window sits top / mid.
 *
 * Flip **above** only when:
 * - below would clip past the viewport, or
 * - the anchor sits in the bottom ~28% of the viewport and there is more
 *   room above (so short View/Report/Reset menus don't sit over the meter
 *   body at the screen edge).
 */
export function decideFlipAbove(
  measuredH: number,
  spaceAbove: number,
  spaceBelow: number,
  opts?: { anchorBottomRatio?: number },
): FlipAboveDecision {
  const h = Math.max(1, measuredH);
  const fitsBelow = h <= spaceBelow + 0.5;
  const fitsAbove = h <= spaceAbove + 0.5;
  const nearViewportBottom =
    opts?.anchorBottomRatio != null && opts.anchorBottomRatio >= 0.72;

  if (fitsBelow) {
    if (nearViewportBottom && spaceAbove > spaceBelow) {
      if (fitsAbove) return { place: "above" };
      return {
        place: "above",
        maxHeight: Math.max(80, Math.floor(spaceAbove)),
      };
    }
    return { place: "below" };
  }
  if (fitsAbove) return { place: "above" };
  if (spaceAbove > spaceBelow) {
    return { place: "above", maxHeight: Math.max(80, Math.floor(spaceAbove)) };
  }
  return { place: "below", maxHeight: Math.max(80, Math.floor(spaceBelow)) };
}

export type AnchorBox = {
  top: number;
  height: number;
};

/**
 * Spaces around an anchor box for a gap-separated popup (viewport pad).
 */
export function flipSpacesForAnchor(
  anchor: AnchorBox,
  opts?: { vh?: number; pad?: number; gap?: number },
): { spaceAbove: number; spaceBelow: number; belowTop: number } {
  const vh =
    opts?.vh ?? (typeof window !== "undefined" ? window.innerHeight : 800);
  const pad = opts?.pad ?? 6;
  const gap = opts?.gap ?? 4;
  const belowTop = anchor.top + anchor.height + gap;
  return {
    belowTop,
    spaceBelow: vh - pad - belowTop,
    spaceAbove: anchor.top - pad - gap,
  };
}

/**
 * Anchor box + measured height → place, optional maxHeight, and content top
 * (fixed/absolute menus that position by `top`).
 */
export function resolveFlipAbovePlacement(
  anchor: AnchorBox,
  measuredH: number,
  opts?: { vh?: number; pad?: number; gap?: number },
): { top: number; place: FlipPlace; maxHeight?: number } {
  const pad = opts?.pad ?? 6;
  const gap = opts?.gap ?? 4;
  const vh =
    opts?.vh ?? (typeof window !== "undefined" ? window.innerHeight : 800);
  const { spaceAbove, spaceBelow, belowTop } = flipSpacesForAnchor(
    anchor,
    opts,
  );
  const anchorBottomRatio = vh > 0 ? (anchor.top + anchor.height) / vh : 0.5;
  const decision = decideFlipAbove(measuredH, spaceAbove, spaceBelow, {
    anchorBottomRatio,
  });
  if (decision.place === "below") {
    return {
      top: Math.round(belowTop),
      place: "below",
      maxHeight: decision.maxHeight,
    };
  }
  const h =
    decision.maxHeight != null ? decision.maxHeight : Math.max(1, measuredH);
  return {
    top: Math.round(Math.max(pad, anchor.top - gap - h)),
    place: "above",
    maxHeight: decision.maxHeight,
  };
}
