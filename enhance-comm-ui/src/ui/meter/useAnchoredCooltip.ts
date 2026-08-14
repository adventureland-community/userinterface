/**
 * Measure cooltip after mount and snap above/below the toolbar button.
 * Fixes bottom-of-screen meters where the menu would clip or leave a hover gap.
 */

import { getReact } from "../../host/react";
import {
  cooltipStyle,
  guessCooltipPlace,
  resolveCooltipPlacement,
  type CooltipPlace,
  type CooltipStyleOpts,
  type MeterCooltipAnchor,
} from "./meterCooltipMenu";

export type AnchoredCooltip = {
  ref: { current: HTMLElement | null };
  style: Record<string, string | number>;
  place: CooltipPlace;
};

/**
 * @param measureSelector Optional child selector (e.g. `.ecu-meter-cooltip`)
 *   when `ref` is on a wrap that also holds a detail flyout.
 */
export function useAnchoredCooltip(
  anchor: MeterCooltipAnchor,
  opts?: CooltipStyleOpts,
  measureSelector?: string,
): AnchoredCooltip {
  const React = getReact();
  const ref = React.useRef(null as HTMLElement | null);
  const base = cooltipStyle(anchor, opts);
  const [adj, setAdj] = React.useState(
    null as null | {
      top: number;
      place: CooltipPlace;
      maxHeight?: number;
    },
  );

  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const el =
      (measureSelector
        ? (root.querySelector(measureSelector) as HTMLElement | null)
        : null) || root;
    const apply = () => {
      const measured = el.getBoundingClientRect().height;
      const next = resolveCooltipPlacement(anchor, measured);
      setAdj((prev: typeof adj) => {
        if (
          prev &&
          prev.top === next.top &&
          prev.place === next.place &&
          prev.maxHeight === next.maxHeight
        ) {
          return prev;
        }
        return next;
      });
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [
    anchor.left,
    anchor.top,
    anchor.width,
    anchor.height,
    opts?.minWidth,
    opts?.preferRight,
    measureSelector,
  ]);

  const place = adj?.place ?? guessCooltipPlace(anchor);
  const style: Record<string, string | number> = { ...base };
  if (adj) {
    style.top = adj.top;
    if (adj.maxHeight != null) style.maxHeight = adj.maxHeight;
  }
  return { ref, style, place };
}
