import { e } from "../host/react";
import { classColors } from "../lib/colors";
import { getPercent } from "../lib/format";
import { PIXEL_TEXT, TYPE } from "../lib/typeScale";

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
  /** Nested inside another panel — no outer margin/border. */
  embedded?: boolean;
  /** Highlight this row id (watched character). */
  highlightId?: string;
};

export function RankMeter(props: RankMeterProps): any {
  const { title, className, rows, embedded, highlightId } = props;
  if (!rows || rows.length === 0) return null;

  return e(
    "div",
    {
      className: className,
      style: {
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
        margin: embedded ? 0 : "4px",
        border: embedded ? "none" : "2px solid #555",
        background: "black",
        gap: "2px",
        fontSize: TYPE.nameLg,
        ...PIXEL_TEXT,
      },
    },
    e(
      "div",
      {
        style: {
          padding: "3px 8px",
          whiteSpace: "nowrap",
          position: "relative",
          fontSize: TYPE.body,
          color: "#ccc",
          ...PIXEL_TEXT,
        },
      },
      title,
    ),
    ...rows.map((row) => {
      const isYou =
        highlightId != null && String(row.id) === String(highlightId);
      return e(
        "div",
        {
          key: row.id,
          style: {
            position: "relative",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            minHeight: "26px",
            alignItems: "center",
            background: isYou ? "rgba(225,55,88,0.16)" : undefined,
            boxShadow: isYou ? "inset 3px 0 0 #e13758" : undefined,
          },
        },
        e("div", {
          style: {
            position: "absolute",
            top: 0,
            bottom: 0,
            width:
              row.barMax > 0 ? getPercent(row.value / row.barMax, 3) : "0%",
            background: classColors[row.ctype || ""] || "#666",
          },
        }),
        e(
          "div",
          {
            style: {
              padding: "2px 8px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              position: "relative",
              fontSize: TYPE.nameLg,
              ...PIXEL_TEXT,
              color: isYou ? "#ffe0e8" : undefined,
            },
          },
          row.name,
        ),
        e(
          "div",
          {
            style: {
              padding: "2px 8px",
              whiteSpace: "nowrap",
              position: "relative",
              fontVariantNumeric: "tabular-nums",
              fontSize: TYPE.nameLg,
              ...PIXEL_TEXT,
            },
          },
          row.label,
        ),
      );
    }),
  );
}
