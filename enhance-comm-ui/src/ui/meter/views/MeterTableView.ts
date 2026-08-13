import { e } from "../../../host/react";
import { PIXEL_TEXT, TYPE } from "../../../lib/typeScale";
import type { MeterResult } from "../../../meters/meterTypes";

/** Compact HTML-table renderer for the Summary report presentation. */
export function MeterTableView(props: { result: MeterResult }): any {
  if (props.result.kind === "summary") {
    const rows = props.result.matrix;
    return e(
      "table",
      {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: TYPE.body,
          ...PIXEL_TEXT,
        },
      },
      e(
        "thead",
        null,
        e(
          "tr",
          null,
          e("th", { style: th }, "Name"),
          e("th", { style: th }, "Dmg"),
          e("th", { style: th }, "Heal"),
          e("th", { style: th }, "Taken"),
        ),
      ),
      e(
        "tbody",
        null,
        ...rows.map((r) =>
          e(
            "tr",
            { key: r.id },
            e("td", { style: td }, r.name),
            e("td", { style: td }, String(Math.round(r.damage))),
            e("td", { style: td }, String(Math.round(r.heal))),
            e("td", { style: td }, String(Math.round(r.taken))),
          ),
        ),
      ),
    );
  }
  if (props.result.kind !== "ranked") {
    return e("div", { style: empty }, "No table data");
  }
  return e(
    "table",
    {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: TYPE.body,
        ...PIXEL_TEXT,
      },
    },
    e(
      "thead",
      null,
      e(
        "tr",
        null,
        e("th", { style: th }, "#"),
        e("th", { style: th }, "Name"),
        e("th", { style: th }, "Value"),
      ),
    ),
    e(
      "tbody",
      null,
      ...props.result.rows.map((r, i) =>
        e(
          "tr",
          { key: r.id },
          e("td", { style: td }, String(i + 1)),
          e("td", { style: td }, r.name),
          e("td", { style: td }, r.label),
        ),
      ),
    ),
  );
}

const th: Record<string, any> = {
  textAlign: "left",
  padding: "2px 6px",
  borderBottom: "1px solid #444",
  color: "#aaa",
};
const td: Record<string, any> = {
  padding: "2px 6px",
  borderBottom: "1px solid #333",
};
const empty: Record<string, any> = {
  padding: "8px",
  color: "#888",
  fontSize: TYPE.body,
  ...PIXEL_TEXT,
};
