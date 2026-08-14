/**
 * Details-like Cooltip menu helpers for meter toolbar.
 * Floating panel anchored under a button; hover-open with delayed hide.
 *
 * Cooltips are portaled to document.body — keep styles self-contained
 * (no dependency on .ecu-meter-shell CSS variables).
 */

import {
  flipSpacesForAnchor,
  resolveFlipAbovePlacement,
} from "../chrome/flipAbovePlacement";

export type MeterCooltipItem = {
  label: string;
  /** Hover-detail copy (custom flyout). Never include instance `in`. */
  detail?: string;
  /** Stable React key; required when the menu re-renders on meter ticks. */
  itemKey?: string;
  selected?: boolean;
  muted?: boolean;
  className?: string;
  onSelect: () => void;
  /** Optional trailing control (e.g. favorite ★) — does not fire onSelect. */
  trailing?: {
    label: string;
    title?: string;
    className?: string;
    onSelect: () => void;
  };
};

export type MeterCooltipSection = {
  title?: string;
  items: MeterCooltipItem[];
};

export type MeterCooltipMenu = {
  header?: MeterCooltipItem;
  sections: MeterCooltipSection[];
};

export type MeterCooltipAnchor = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MeterCooltipKind =
  | "party"
  | "seg"
  | "display"
  | "view"
  | "report"
  | "reset"
  | "tools"
  | "actor"
  | "bookmarks"
  | "allDisplays"
  | "gear"
  | "bookmarkPick";

export const COOLTIP_HIDE_MS = 420;
export const COOLTIP_Z = 2147483000;

export function rectToAnchor(el: HTMLElement): MeterCooltipAnchor {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

export type CooltipPlace = "above" | "below";

export type CooltipStyleOpts = {
  minWidth?: number;
  cover?: boolean;
  preferRight?: boolean;
};

const COOLTIP_PAD = 6;
const COOLTIP_GAP = 4;

/**
 * After measuring the menu, pick top + above/below so it sits flush to the
 * anchor and fits the viewport (scroll when both sides are tight).
 */
export function resolveCooltipPlacement(
  anchor: MeterCooltipAnchor,
  measuredH: number,
  vh = typeof window !== "undefined" ? window.innerHeight : 800,
  pad = COOLTIP_PAD,
  gap = COOLTIP_GAP,
): { top: number; place: CooltipPlace; maxHeight?: number } {
  return resolveFlipAbovePlacement(anchor, measuredH, { vh, pad, gap });
}

/** Initial place guess before DOM measure. */
export function guessCooltipPlace(
  anchor: MeterCooltipAnchor,
  vh = typeof window !== "undefined" ? window.innerHeight : 800,
  pad = COOLTIP_PAD,
  gap = COOLTIP_GAP,
): CooltipPlace {
  const { spaceAbove, spaceBelow } = flipSpacesForAnchor(anchor, {
    vh,
    pad,
    gap,
  });
  const bottomRatio = vh > 0 ? (anchor.top + anchor.height) / vh : 0.5;
  // Match decideFlipAbove: below unless near the physical bottom edge.
  if (bottomRatio >= 0.72 && spaceAbove > spaceBelow) return "above";
  return "below";
}

/** Place cooltip below anchor; flip above if near bottom of viewport. */
export function cooltipStyle(
  anchor: MeterCooltipAnchor,
  opts?: CooltipStyleOpts,
): Record<string, string | number> {
  if (opts?.cover) {
    return {
      position: "fixed",
      left: Math.round(anchor.left),
      top: Math.round(anchor.top),
      width: Math.round(anchor.width),
      height: Math.round(anchor.height),
      zIndex: COOLTIP_Z,
    };
  }
  const minW = opts?.minWidth ?? 176;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = COOLTIP_PAD;
  const gap = COOLTIP_GAP;
  const estH = Math.min(360, Math.floor(vh * 0.72));
  let left = opts?.preferRight
    ? anchor.left + anchor.width - minW
    : anchor.left;
  const place = guessCooltipPlace(anchor, vh, pad, gap);
  let top: number;
  if (place === "above") {
    const { spaceAbove } = flipSpacesForAnchor(anchor, { vh, pad, gap });
    const h = Math.min(estH, Math.max(80, spaceAbove));
    top = Math.max(pad, anchor.top - gap - h);
  } else {
    top = anchor.top + anchor.height + gap;
  }
  left = Math.max(pad, Math.min(left, vw - minW - pad));
  return {
    position: "fixed",
    left: Math.round(left),
    top: Math.round(top),
    minWidth: minW,
    zIndex: COOLTIP_Z,
  };
}
