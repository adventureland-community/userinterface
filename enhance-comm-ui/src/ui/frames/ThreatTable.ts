import { e } from "../../host/react";
import { itemContainer, monsterSkin, setXTarget } from "../../host/icons";
import { aggroByTarget, findEntity } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";
import { PanelShellDummy } from "../chrome/PanelShellDummy";
import { VitalsColumn } from "../chrome/VitalsColumn";
import { THREAT_PANEL_STYLE } from "../../lib/frameSizes";
import { classColors } from "../../lib/colors";
import { formatTime, getPercent } from "../../lib/format";
import { estimateTtk, getIncomingDps } from "../../meters/combatMeter";

const MOB_ICON_SIZE = 22;
const MAX_MOB_CHIPS = 6;

export type ThreatTableProps = {
  entities: EntityLike[];
  observingId?: string;
  layoutEdit?: boolean;
  setSelectedEntity?: (id: string) => void;
};

type MtypeCount = { mtype: string; count: number };

function countByMtype(mobs: EntityLike[]): MtypeCount[] {
  const counts: Record<string, number> = {};
  for (let i = 0; i < mobs.length; i++) {
    const mt = mobs[i].mtype || "?";
    counts[mt] = (counts[mt] || 0) + 1;
  }
  const rows: MtypeCount[] = [];
  const keys = Object.keys(counts);
  for (let i = 0; i < keys.length; i++) {
    rows.push({ mtype: keys[i], count: counts[keys[i]] });
  }
  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.mtype.localeCompare(b.mtype);
  });
  return rows;
}

function wrapIconHtml(html: string): any {
  return e("div", {
    style: { display: "inline-block", lineHeight: 0, fontSize: 0 },
    dangerouslySetInnerHTML: { __html: html },
    ref: (node: HTMLElement | null) => {
      if (!node) return;
      const root = node.firstElementChild as HTMLElement | null;
      if (!root) return;
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
    },
  });
}

function MobChip(props: { mtype: string; count: number }): any {
  const { mtype, count } = props;
  const skin = monsterSkin(mtype);
  const title = `${count}×${mtype}`;
  let icon: any = null;
  if (skin) {
    const html = itemContainer(
      {
        skin,
        size: MOB_ICON_SIZE,
        draggable: false,
      },
      null,
    );
    if (html) icon = wrapIconHtml(html);
  }

  if (!icon) {
    return e(
      "span",
      {
        title,
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "2px",
          padding: "1px 5px",
          background: "rgba(40,20,20,0.9)",
          border: "1px solid #633",
          color: "#ddd",
          fontSize: "12px",
          lineHeight: 1.2,
          fontWeight: "normal",
          textShadow: "none",
          whiteSpace: "nowrap",
        },
      },
      `${count}×${mtype}`,
    );
  }

  return e(
    "span",
    {
      title,
      style: {
        display: "inline-flex",
        alignItems: "flex-end",
        gap: "2px",
        position: "relative",
        flexShrink: 0,
      },
    },
    icon,
    e(
      "span",
      {
        style: {
          fontSize: "12px",
          color: "#ffd0d0",
          fontWeight: "normal",
          textShadow: "none",
          lineHeight: 1,
          marginBottom: "1px",
        },
      },
      `×${count}`,
    ),
  );
}

function fmtRate(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

function pressureTrailing(target: EntityLike | undefined, tid: string): string {
  const parts: string[] = [];
  if (target && target.max_hp) {
    parts.push(getPercent((target.hp || 0) / (target.max_hp || 1), 0));
  }
  const incoming = getIncomingDps(tid);
  if (incoming > 0) {
    parts.push(`${fmtRate(incoming)}/s`);
    const ttk = estimateTtk(target?.hp, incoming);
    if (ttk != null && ttk < 600) {
      parts.push(`TTK ${formatTime(ttk)}`);
    }
  }
  return parts.join(" · ");
}

function ThreatRow(props: {
  tid: string;
  mobs: EntityLike[];
  entities: EntityLike[];
  observingId?: string;
  setSelectedEntity?: (id: string) => void;
}): any {
  const { tid, mobs, observingId, setSelectedEntity } = props;
  const target = findEntity(props.entities, tid);
  const name = target?.name || tid;
  const isYou = tid === observingId;
  const mtypes = countByMtype(mobs);
  const shown = mtypes.slice(0, MAX_MOB_CHIPS);
  const overflow = mtypes.length - shown.length;
  const trailing = pressureTrailing(target, tid);
  const hpColor = classColors[target?.ctype || ""] || (isYou ? "#8a1e1e" : "#666");

  const aggroBadge = e(
    "span",
    {
      className: "comm-threat-spark",
      title: `${mobs.length} mob${mobs.length === 1 ? "" : "s"} aggroed`,
      style: {
        flexShrink: 0,
        minWidth: "18px",
        height: "18px",
        padding: "0 4px",
        boxSizing: "border-box",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#8a1e1e",
        border: "1px solid #e05555",
        color: "#ffd0d0",
        fontSize: "12px",
        lineHeight: 1,
        fontWeight: "normal",
        textShadow: "none",
      },
    },
    String(mobs.length),
  );

  const nameBlock = e(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        minWidth: 0,
        overflow: "hidden",
      },
    },
    aggroBadge,
    e(
      "span",
      {
        style: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        },
      },
      name,
    ),
  );

  const label = trailing
    ? e(
        "span",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            width: "100%",
            alignItems: "center",
          },
        },
        nameBlock,
        e(
          "span",
          {
            style: {
              fontSize: "13px",
              opacity: 0.95,
              flexShrink: 0,
              fontWeight: "normal",
              textShadow: "none",
              color: "#ddd",
            },
          },
          trailing,
        ),
      )
    : nameBlock;

  const chips = e(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px",
        padding: "0 2px",
      },
    },
    ...shown.map((row) =>
      e(MobChip, { key: row.mtype, mtype: row.mtype, count: row.count }),
    ),
    overflow > 0
      ? e(
          "span",
          {
            style: {
              fontSize: "12px",
              color: "#999",
              fontWeight: "normal",
              textShadow: "none",
            },
            title: mtypes
              .slice(MAX_MOB_CHIPS)
              .map((r) => `${r.count}×${r.mtype}`)
              .join(", "),
          },
          `+${overflow}`,
        )
      : null,
  );

  const onSelect =
    target && setSelectedEntity
      ? () => {
          setXTarget(target);
          setSelectedEntity(String(target.id));
        }
      : undefined;

  const vitals = target
    ? e(
        VitalsColumn,
        {
          hp: target.hp || 0,
          maxHp: target.max_hp || 1,
          mp: target.mp,
          maxMp: target.max_mp,
          hpColor,
          showMp: true,
          nameStyle: {
            fontSize: "15px",
            fontWeight: "normal",
          },
          onClick: onSelect,
        },
        label,
      )
    : e(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            padding: "4px 6px",
            fontSize: "15px",
            fontWeight: "normal",
            textShadow: "none",
            cursor: onSelect ? "pointer" : undefined,
          },
          onClick: onSelect,
        },
        nameBlock,
        trailing
          ? e("span", { style: { color: "#ddd", fontSize: "13px" } }, trailing)
          : null,
      );

  return e(
    "div",
    {
      key: tid,
      className: "comm-threat-row" + (isYou ? " is-you" : ""),
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        padding: "3px 4px 5px",
        background: isYou ? "rgba(80,0,0,0.45)" : undefined,
        boxSizing: "border-box",
      },
    },
    vitals,
    chips,
  );
}

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
      className: "comm-threat-table",
      style: {
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
        margin: "4px",
        border: "2px double gray",
        background: "black",
        gap: "2px",
        maxHeight: "280px",
        minWidth: "220px",
        fontSize: "15px",
        fontWeight: "normal",
        textShadow: "none",
      },
    },
    e(
      "div",
      {
        style: {
          padding: "5px 8px 2px",
          whiteSpace: "nowrap",
          fontSize: "16px",
          textShadow: "none",
          fontWeight: "normal",
          color: "#ccc",
        },
      },
      "Threat",
    ),
    ...targetIds.map((tid) =>
      e(ThreatRow, {
        key: tid,
        tid,
        mobs: byTarget[tid],
        entities: props.entities,
        observingId: props.observingId,
        setSelectedEntity: props.setSelectedEntity,
      }),
    ),
  );
}
