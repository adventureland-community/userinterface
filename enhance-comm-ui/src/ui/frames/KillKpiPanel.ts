import { e } from "../../host/react";
import { getStats } from "../../kpi/sessionKills";

export function KillKpiPanel(): any {
  const stats = getStats();
  if (stats.total === 0) return null;

  return e(
    "div",
    {
      style: {
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
        margin: "4px",
        border: "2px double gray",
        background: "black",
        gap: "2px",
        maxHeight: "140px",
        minWidth: "140px",
      },
    },
    e(
      "div",
      {
        style: {
          padding: "2px",
          whiteSpace: "nowrap",
          textShadow: "0 0 2px black",
        },
      },
      `Kills: ${stats.total}`,
    ),
    ...stats.byMtype.slice(0, 12).map((row) =>
      e(
        "div",
        {
          key: row.mtype,
          style: {
            padding: "2px 4px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
          },
        },
        e("span", {}, row.mtype),
        e("span", {}, String(row.count)),
      ),
    ),
  );
}
