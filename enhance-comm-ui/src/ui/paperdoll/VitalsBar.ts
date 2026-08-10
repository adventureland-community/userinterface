import { e } from "../../host/react";
import { getPercent } from "../../lib/format";
import { TYPE } from "../../lib/typeScale";

export type VitalsBarProps = {
  current: number;
  max: number;
  color: string;
  label: string;
};

export function VitalsBar(props: VitalsBarProps): any {
  const pct = props.max > 0 ? props.current / props.max : 0;
  return e(
    "div",
    { style: { marginBottom: "6px" } },
    e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          fontSize: TYPE.body,
          marginBottom: "3px",
          color: "#cfcfcf",
        },
      },
      e("span", {}, props.label),
      e("span", {}, `${props.current} / ${props.max}`),
    ),
    e(
      "div",
      {
        style: {
          height: "8px",
          background: "#1a1a1a",
          border: "1px solid #333",
          position: "relative",
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
    ),
  );
}
