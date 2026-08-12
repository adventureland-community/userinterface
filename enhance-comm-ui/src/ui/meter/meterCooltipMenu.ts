/**
 * Details-like Cooltip menu helpers for meter toolbar.
 * Floating panel anchored under a button; hover-open with delayed hide.
 *
 * Cooltips are portaled to document.body — keep styles self-contained
 * (no dependency on .ecu-meter-shell CSS variables).
 */

export type MeterCooltipItem = {
  label: string;
  selected?: boolean;
  muted?: boolean;
  className?: string;
  onSelect: () => void;
};

export type MeterCooltipSection = {
  title?: string;
  items: MeterCooltipItem[];
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

/** Place cooltip below anchor; flip above if near bottom of viewport. */
export function cooltipStyle(
  anchor: MeterCooltipAnchor,
  opts?: { minWidth?: number; cover?: boolean; preferRight?: boolean },
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
  const pad = 6;
  const estH = Math.min(360, Math.floor(vh * 0.72));
  let left = opts?.preferRight
    ? anchor.left + anchor.width - minW
    : anchor.left;
  let top = anchor.top + anchor.height + 4;
  if (top + Math.min(estH, 280) > vh - pad) {
    top = Math.max(pad, anchor.top - Math.min(estH, 280) - 4);
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
