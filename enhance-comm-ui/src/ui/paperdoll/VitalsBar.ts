import { e } from "../../host/react";
import { getPercent } from "../../lib/format";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type VitalsBarProps = {
  current: number;
  max: number;
  color: string;
  label: string;
  /** Override the `current / max` readout (compact XP, etc.). */
  valueText?: string;
};

/** Overlay label + value on a thin bar — paperdoll vitals. */
export function VitalsBar(props: VitalsBarProps): any {
  const pct = props.max > 0 ? props.current / props.max : 0;
  const value =
    props.valueText != null
      ? props.valueText
      : `${props.current} / ${props.max}`;
  return e(
    "div",
    {
      title: `${props.label} ${value}`,
      style: {
        position: "relative",
        height: "16px",
        background: "#1a1a1a",
        border: "1px solid #333",
        overflow: "hidden",
      },
    },
    e("div", {
      style: {
        width: getPercent(pct, 1),
        height: "100%",
        background: props.color,
      },
    }),
    e(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 5px",
          fontSize: TYPE.micro,
          color: "#f0f0f0",
          pointerEvents: "none",
          ...PIXEL_TEXT,
        },
      },
      e("span", {}, props.label),
      e("span", {}, value),
    ),
  );
}
