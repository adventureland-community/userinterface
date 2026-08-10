import { e } from "../../host/react";
import { TYPE } from "../../lib/typeScale";

export type StatProps = {
  label: string;
  value: any;
  accent?: string;
};

export function Stat(props: StatProps): any {
  if (props.value == null || props.value === "") return null;
  return e(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: "10px",
        fontSize: TYPE.body,
        lineHeight: "20px",
      },
    },
    e("span", { style: { color: "#9a9a9a" } }, props.label),
    e(
      "span",
      { style: { color: props.accent || "#f0f0f0", textAlign: "right" } },
      props.value,
    ),
  );
}
