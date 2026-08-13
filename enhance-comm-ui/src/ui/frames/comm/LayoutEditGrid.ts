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
  /** Host box size in px (dual 1px strokes sit inside). */
  hostPx: number;
};

function tierLook(tier: GridLineTier): TierLook {
  // Dual-tone (dark + light) so 1× / 2× / 4× / edge read on water *and* sand.
  // 1px fills (not 0-size borders) — Chromium drops dashed borders on 0-size boxes.
  switch (tier) {
    case "fine":
      return {
        dark: "rgba(0, 0, 0, 0.42)",
        light: "rgba(255, 255, 255, 0.5)",
        dashed: true,
        hostPx: 2,
      };
    case "medium":
      return {
        dark: "rgba(0, 0, 0, 0.55)",
        light: "rgba(255, 250, 220, 0.7)",
        dashed: true,
        hostPx: 2,
      };
    case "coarse":
      return {
        dark: "rgba(0, 0, 0, 0.7)",
        light: "rgba(255, 245, 200, 0.88)",
        dashed: false,
        hostPx: 3,
      };
    case "edge":
      return {
        dark: "rgba(0, 0, 0, 0.82)",
        light: "rgba(255, 255, 255, 0.95)",
        dashed: false,
        hostPx: 4,
      };
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

/**
 * Solid / dashed 1px fill stroke (not border on a 0-size box — Chromium drops those).
 * Dashes use a repeating gradient so fine/medium stay visually lighter than coarse.
 */
function strokeStyle(
  axis: "v" | "h",
  color: string,
  dashed: boolean,
  offsetPx: number,
): Record<string, string | number> {
  const dash =
    axis === "v"
      ? `repeating-linear-gradient(to bottom, ${color} 0px, ${color} 3px, transparent 3px, transparent 7px)`
      : `repeating-linear-gradient(to right, ${color} 0px, ${color} 3px, transparent 3px, transparent 7px)`;
  if (axis === "v") {
    return {
      position: "absolute",
      left: `${offsetPx}px`,
      top: 0,
      bottom: 0,
      width: "1px",
      ...(dashed ? { backgroundImage: dash } : { backgroundColor: color }),
      boxSizing: "border-box",
      pointerEvents: "none",
    };
  }
  return {
    position: "absolute",
    top: `${offsetPx}px`,
    left: 0,
    right: 0,
    height: "1px",
    ...(dashed ? { backgroundImage: dash } : { backgroundColor: color }),
    boxSizing: "border-box",
    pointerEvents: "none",
  };
}

function gridLine(
  axis: "v" | "h",
  pct: number,
  tier: GridLineTier,
  key: string,
): any {
  const look = tierLook(tier);
  const host: Record<string, string | number> =
    axis === "v"
      ? {
          position: "absolute",
          left: `${pct}%`,
          top: 0,
          bottom: 0,
          width: `${look.hostPx}px`,
          pointerEvents: "none",
        }
      : {
          position: "absolute",
          top: `${pct}%`,
          left: 0,
          right: 0,
          height: `${look.hostPx}px`,
          pointerEvents: "none",
        };

  return e(
    "div",
    {
      key,
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
 * Square-cell guide grid for layout edit.
 * Draws nested 1× (fine snap) + 2× + 4× + 0/50/100 edges together.
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
    kids.push(gridLine("v", tiers.x[i].pct, tiers.x[i].tier, `vx${i}`));
  }
  for (let j = 0; j < tiers.y.length; j++) {
    kids.push(gridLine("h", tiers.y[j].pct, tiers.y[j].tier, `hy${j}`));
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
