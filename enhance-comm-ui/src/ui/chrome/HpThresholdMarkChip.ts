/**
 * Boss HP-track phase mark with Comm cooltip (spawn / ability).
 * Visual line stays thin; hit target is wider so tips are reachable over the name row.
 */
import { getReact, e } from "../../host/react";
import type { HpThresholdMark } from "../../instance/monsterSpawns";
import {
  dismissHpThresholdCooltip,
  hpThresholdCooltipHandlers,
  hpThresholdCooltipKey,
} from "./hpThresholdCooltip";

export type HpThresholdMarkChipProps = {
  mark: HpThresholdMark;
};

const HIT_W = 12;

export function HpThresholdMarkChip(props: HpThresholdMarkChipProps): any {
  const React = getReact();
  const { mark } = props;
  const tipKey = hpThresholdCooltipKey(mark.key);
  const tipHandlers = hpThresholdCooltipHandlers(mark);

  React.useEffect(() => {
    return () => {
      dismissHpThresholdCooltip(mark.key);
    };
  }, [tipKey, mark.key]);

  const stopAnd =
    (fn: (ev: MouseEvent) => void) =>
    (ev: MouseEvent) => {
      if (typeof ev.stopPropagation === "function") ev.stopPropagation();
      fn(ev);
    };

  const lineW = mark.abilityId ? 3 : 2;

  return e(
    "span",
    {
      className:
        "comm-hp-threshold" +
        (mark.fired ? " comm-hp-threshold--fired" : "") +
        (mark.abilityId ? " is-ability" : ""),
      "data-ecu-hp-phase": mark.key,
      onMouseEnter: stopAnd(tipHandlers.onMouseEnter),
      onMouseMove: stopAnd(tipHandlers.onMouseMove),
      onMouseLeave: () => {
        tipHandlers.onMouseLeave();
      },
      style: {
        position: "absolute",
        top: "-4px",
        bottom: "-4px",
        left: `${mark.leftPct}%`,
        width: `${HIT_W}px`,
        marginLeft: `${-HIT_W / 2}px`,
        boxSizing: "border-box",
        // Transparent hit pad; the visible tick is the ::after-like child.
        background: "transparent",
        pointerEvents: "auto",
        cursor: "help",
        zIndex: 6,
      },
    },
    e("span", {
      className: "comm-hp-threshold__tick",
      style: {
        position: "absolute",
        top: "2px",
        bottom: "2px",
        left: "50%",
        width: `${lineW}px`,
        marginLeft: `${-lineW / 2}px`,
        background: mark.fired
          ? "#666"
          : mark.abilityId
            ? "#8cf"
            : "#c88",
        opacity: mark.fired ? 0.5 : 0.95,
        boxShadow: mark.abilityId ? "0 0 0 1px rgba(0,0,0,0.55)" : undefined,
        pointerEvents: "none",
      },
    }),
  );
}
