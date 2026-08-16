import { e } from "../../host/react";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type StatProps = {
  label: string;
  value: any;
  accent?: string;
  title?: string;
};

export function Stat(props: StatProps): any {
  if (props.value == null || props.value === "") return null;
  return e(
    "div",
    {
      title: props.title,
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: "6px",
        fontSize: TYPE.secondary,
        lineHeight: "16px",
        ...PIXEL_TEXT,
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
