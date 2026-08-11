import { getReact, e } from "../../../host/react";
import { layoutDragRoot } from "../../../lib/percentDrag";
import {
  getLayoutGridStep,
  subscribeLayoutEditPrefs,
} from "../../../lib/layoutEditPrefs";
import {
  squareGridTieredLines,
  type GridLineTier,
} from "../../../lib/layoutGrid";

type TierLook = {
  dark: string;
  light: string;
  dashed: boolean;
};

function tierLook(tier: GridLineTier): TierLook {
  // Dual-tone (dark + light) so lines read on water *and* sand.
  switch (tier) {
    case "fine":
      return {
        dark: "rgba(0, 0, 0, 0.42)",
        light: "rgba(255, 255, 255, 0.5)",
        dashed: true,
      };
    case "medium":
      return {
        dark: "rgba(0, 0, 0, 0.55)",
        light: "rgba(255, 250, 220, 0.7)",
        dashed: true,
      };
    case "coarse":
      return {
        dark: "rgba(0, 0, 0, 0.7)",
        light: "rgba(255, 245, 200, 0.88)",
        dashed: false,
      };
    case "edge":
      return {
        dark: "rgba(0, 0, 0, 0.82)",
        light: "rgba(255, 255, 255, 0.95)",
        dashed: false,
      };
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

function strokeStyle(
  axis: "v" | "h",
  color: string,
  dashed: boolean,
  offsetPx: number,
): Record<string, string | number> {
  const border = `${dashed ? "1px dashed" : "1px solid"} ${color}`;
  if (axis === "v") {
    return {
      position: "absolute",
      left: `${offsetPx}px`,
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
    top: `${offsetPx}px`,
    left: 0,
    right: 0,
    height: 0,
    borderTop: border,
    boxSizing: "border-box",
    pointerEvents: "none",
  };
}

function gridLine(axis: "v" | "h", pct: number, tier: GridLineTier): any {
  const look = tierLook(tier);
  const host: Record<string, string | number> =
    axis === "v"
      ? {
          position: "absolute",
          left: `${pct}%`,
          top: 0,
          bottom: 0,
          width: "2px",
          pointerEvents: "none",
        }
      : {
          position: "absolute",
          top: `${pct}%`,
          left: 0,
          right: 0,
          height: "2px",
          pointerEvents: "none",
        };

  return e(
    "div",
    {
      key: `${axis}-${tier}-${pct}`,
      className: `comm-layout-grid-line is-${tier}`,
      style: host,
    },
    e("div", {
      style: strokeStyle(axis, look.dark, look.dashed, 0),
    }),
    e("div", {
      style: strokeStyle(axis, look.light, look.dashed, 1),
    }),
  );
}

/**
 * Square-cell guide grid in layout edit mode.
 * Draws fine + 2× + 4× levels together; dual-tone strokes for sand/water contrast.
 */
export function LayoutEditGrid(): any {
  const React = getReact();
  const wrapRef = React.useRef(null as HTMLDivElement | null);
  const [gridStep, setGridStep] = React.useState(() => getLayoutGridStep());
  const [size, setSize] = React.useState(() => {
    const r = layoutDragRoot().getBoundingClientRect();
    return { w: r.width || 1, h: r.height || 1 };
  });

  React.useEffect(
    () =>
      subscribeLayoutEditPrefs(() => {
        setGridStep(getLayoutGridStep());
      }),
    [],
  );

  React.useEffect(() => {
    const root = layoutDragRoot();
    const measure = () => {
      const r = root.getBoundingClientRect();
      setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const tiers = squareGridTieredLines(gridStep, size.w, size.h);
  const kids: any[] = [];
  for (let i = 0; i < tiers.x.length; i++) {
    kids.push(gridLine("v", tiers.x[i].pct, tiers.x[i].tier));
  }
  for (let j = 0; j < tiers.y.length; j++) {
    kids.push(gridLine("h", tiers.y[j].pct, tiers.y[j].tier));
  }

  return e(
    "div",
    {
      ref: wrapRef,
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
