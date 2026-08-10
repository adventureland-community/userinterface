import { e } from "../../../host/react";
import {
  LAYOUT_GRID_MAJOR_PCTS,
  LAYOUT_GRID_STEP,
} from "../../../lib/layoutGrid";

function isMajor(pct: number): boolean {
  return LAYOUT_GRID_MAJOR_PCTS.indexOf(pct) >= 0;
}

function lineStyle(
  axis: "v" | "h",
  pct: number,
): Record<string, string | number> {
  const major = isMajor(pct);
  // Bright warm dashes: opaque enough on light sand, luminous on dark water.
  const color = major
    ? "rgba(255, 245, 200, 0.62)"
    : "rgba(255, 245, 200, 0.34)";
  const border = `1px dashed ${color}`;
  if (axis === "v") {
    return {
      position: "absolute",
      left: `${pct}%`,
      top: 0,
      bottom: 0,
      width: 0,
      borderLeft: border,
      boxSizing: "border-box",
      pointerEvents: "none",
    };
  }
  return {
    position: "absolute",
    top: `${pct}%`,
    left: 0,
    right: 0,
    height: 0,
    borderTop: border,
    boxSizing: "border-box",
    pointerEvents: "none",
  };
}

/**
 * Viewport-% grid shown only in layout edit mode.
 * pointer-events: none so panel drag headers stay interactive.
 * Minor lines every LAYOUT_GRID_STEP%; majors at 0 / 25 / 50 / 75 / 100.
 */
export function LayoutEditGrid(): any {
  const kids: any[] = [];
  for (let pct = 0; pct <= 100; pct += LAYOUT_GRID_STEP) {
    kids.push(
      e("div", {
        key: `v-${pct}`,
        className: isMajor(pct)
          ? "comm-layout-grid-line major"
          : "comm-layout-grid-line",
        style: lineStyle("v", pct),
      }),
    );
    kids.push(
      e("div", {
        key: `h-${pct}`,
        className: isMajor(pct)
          ? "comm-layout-grid-line major"
          : "comm-layout-grid-line",
        style: lineStyle("h", pct),
      }),
    );
  }

  return e(
    "div",
    {
      className: "comm-layout-edit-grid",
      "aria-hidden": true,
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
      },
    },
    ...kids,
  );
}
