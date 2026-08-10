import { getReact, e } from "../../../host/react";
import {
  getLayoutGridStep,
  subscribeLayoutEditPrefs,
} from "../../../lib/layoutEditPrefs";
import {
  isLayoutGridMajor,
  layoutGridLinePercents,
} from "../../../lib/layoutGrid";

function lineStyle(
  axis: "v" | "h",
  pct: number,
  major: boolean,
): Record<string, string | number> {
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
 * Line spacing follows the user's layout-edit grid step pref.
 */
export function LayoutEditGrid(): any {
  const React = getReact();
  const [gridStep, setGridStep] = React.useState(() => getLayoutGridStep());

  React.useEffect(
    () =>
      subscribeLayoutEditPrefs(() => {
        setGridStep(getLayoutGridStep());
      }),
    [],
  );

  const lines = layoutGridLinePercents(gridStep);
  const kids: any[] = [];
  for (let i = 0; i < lines.length; i++) {
    const pct = lines[i];
    const major = isLayoutGridMajor(pct, gridStep);
    kids.push(
      e("div", {
        key: `v-${pct}`,
        className: major
          ? "comm-layout-grid-line major"
          : "comm-layout-grid-line",
        style: lineStyle("v", pct, major),
      }),
    );
    kids.push(
      e("div", {
        key: `h-${pct}`,
        className: major
          ? "comm-layout-grid-line major"
          : "comm-layout-grid-line",
        style: lineStyle("h", pct, major),
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
