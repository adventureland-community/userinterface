import { e } from "../../host/react";
import { aggroByTarget, findEntity } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";
import { PanelShellDummy } from "../chrome/PanelShellDummy";
import { THREAT_PANEL_STYLE } from "../../lib/frameSizes";

export type ThreatTableProps = {
  entities: EntityLike[];
  observingId?: string;
  layoutEdit?: boolean;
};

export function ThreatTable(props: ThreatTableProps): any {
  const byTarget = aggroByTarget(props.entities);
  const targetIds = Object.keys(byTarget);
  if (targetIds.length === 0) {
    if (!props.layoutEdit) return null;
    return e(PanelShellDummy, {
      label: "Threat",
      hint: "Aggro by target",
      accent: "#844",
      rows: 4,
      style: THREAT_PANEL_STYLE,
    });
  }

  targetIds.sort((a, b) => {
    if (a === props.observingId) return -1;
    if (b === props.observingId) return 1;
    return byTarget[b].length - byTarget[a].length;
  });

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
        gap: "3px",
        maxHeight: "200px",
        minWidth: "200px",
        fontSize: "15px",
      },
    },
    e(
      "div",
      {
        style: {
          padding: "6px 8px",
          whiteSpace: "nowrap",
          fontSize: "16px",
          textShadow: "none",
        },
      },
      "Threat",
    ),
    ...targetIds.map((tid) => {
      const mobs = byTarget[tid];
      const target = findEntity(props.entities, tid);
      const name = target?.name || tid;
      const counts: Record<string, number> = {};
      for (let i = 0; i < mobs.length; i++) {
        const mt = mobs[i].mtype || "?";
        counts[mt] = (counts[mt] || 0) + 1;
      }
      const summary = Object.keys(counts)
        .map((mt) => `${counts[mt]}×${mt}`)
        .join(", ");
      return e(
        "div",
        {
          key: tid,
          style: {
            padding: "5px 8px",
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            fontSize: "15px",
            textShadow: "none",
            fontWeight: "normal",
            background:
              tid === props.observingId ? "rgba(80,0,0,0.5)" : undefined,
          },
        },
        e("span", {}, name),
        e("span", { style: { color: "#ddd" } }, `${mobs.length} (${summary})`),
      );
    }),
  );
}
