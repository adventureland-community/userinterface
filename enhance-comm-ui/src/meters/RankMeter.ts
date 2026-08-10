import { e } from "../host/react";
import { classColors } from "../lib/colors";
import { getPercent } from "../lib/format";

export type RankRow = {
  id: string;
  name: string;
  ctype?: string;
  value: number;
  barMax: number;
  label: string;
};

export type RankMeterProps = {
  title: string;
  className?: string;
  rows: RankRow[];
};

export function RankMeter(props: RankMeterProps): any {
  const { title, className, rows } = props;
  if (!rows || rows.length === 0) return null;

  return e(
    "div",
    {
      className: className,
      style: {
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
        margin: "4px",
        border: "2px double gray",
        background: "black",
        gap: "2px",
      },
    },
    e(
      "div",
      {
        style: {
          padding: "2px",
          whiteSpace: "nowrap",
          textShadow: "0 0 2px black",
          position: "relative",
        },
      },
      title,
    ),
    ...rows.map((row) =>
      e(
        "div",
        {
          key: row.id,
          style: {
            position: "relative",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          },
        },
        e("div", {
          style: {
            position: "absolute",
            top: 0,
            bottom: 0,
            width:
              row.barMax > 0
                ? getPercent(row.value / row.barMax, 3)
                : "0%",
            background: classColors[row.ctype || ""] || "#666",
          },
        }),
        e(
          "div",
          {
            style: {
              padding: "2px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              textShadow: "0 0 2px black",
              position: "relative",
            },
          },
          row.name,
        ),
        e(
          "div",
          {
            style: {
              padding: "2px",
              whiteSpace: "nowrap",
              textShadow: "0 0 2px black",
              position: "relative",
            },
          },
          row.label,
        ),
      ),
    ),
  );
}
