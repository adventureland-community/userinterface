import { getReact, e } from "../../host/react";
import { monsterSprite, setXTarget } from "../../host/icons";
import { findEntity } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";
import { PanelShellDummy } from "../chrome/PanelShellDummy";
import { VitalsColumn } from "../chrome/VitalsColumn";
import { wrapIconHtml } from "../chrome/wrapIconHtml";
import { THREAT_PANEL_STYLE, THREAT_TABLE_SHELL } from "../../lib/frameSizes";
import { classColors } from "../../lib/colors";
import { formatTime, getPercent } from "../../lib/format";
import { estimateTtk, getIncomingDps } from "../../meters/combatMeter";
import {
  sortThreatTargetIds,
  stickyAggroByTarget,
} from "../../lib/stickyPresence";
import { AGGRO_BADGE, PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import {
  loadSettings,
  saveSettings,
  effectiveThreatScope,
  killScopeLabel,
  type PartyScope,
} from "../../lib/settings";
import { partyKeyFor } from "../../meters/meterSession";
import { ensureThreatPanelCss } from "./threatPanelCss";

const MOB_ICON_SIZE = 22;
const MAX_MOB_CHIPS = 6;

export type ThreatTableProps = {
  entities: EntityLike[];
  /** Shared aggro index for this tick (from combatSignals). */
  byTarget: Record<string, EntityLike[]>;
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

function MobChip(props: { mtype: string; count: number }): any {
  const React = getReact();
  const { mtype, count } = props;
  const title = `${count}×${mtype}`;
  const html = React.useMemo(
    () => monsterSprite(mtype, { size: MOB_ICON_SIZE }),
    [mtype],
  );
  let icon: any = null;
  if (html) icon = wrapIconHtml(html);

  const countBadge = e(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "22px",
        height: "20px",
        padding: "0 5px",
        boxSizing: "border-box",
        background: "rgba(80,20,20,0.95)",
        border: "1px solid #a44",
        color: "#ffe8e8",
        fontSize: TYPE.count,
        lineHeight: 1,
        ...PIXEL_TEXT,
      },
    },
    `×${count}`,
  );

  if (!icon) {
    return e(
      "span",
      {
        title,
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 6px",
          background: "rgba(40,20,20,0.9)",
          border: "1px solid #633",
          color: "#eee",
          fontSize: TYPE.badge,
          lineHeight: 1.2,
          ...PIXEL_TEXT,
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
        gap: "3px",
        position: "relative",
        flexShrink: 0,
      },
    },
    icon,
    countBadge,
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

/** Subject's in-game party (or self when solo). */
function isWatchedPartyTarget(
  tid: string,
  entities: EntityLike[],
  observingId?: string,
): boolean {
  if (!observingId) return true;
  if (tid === observingId) return true;
  const observing = findEntity(entities, observingId);
  const target = findEntity(entities, tid);
  if (!target) return false;
  return partyKeyFor(target, tid) === partyKeyFor(observing, observingId);
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
  const hpColor =
    classColors[target?.ctype || ""] || (isYou ? "#8a1e1e" : "#666");

  const aggroBadge = e(
    "span",
    {
      className: "comm-threat-spark",
      title: `${mobs.length} mob${mobs.length === 1 ? "" : "s"} aggroed`,
      style: {
        flexShrink: 0,
        minWidth: AGGRO_BADGE.minWidth,
        height: AGGRO_BADGE.height,
        padding: `0 ${AGGRO_BADGE.padX}`,
        boxSizing: "border-box",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#8a1e1e",
        border: "1px solid #e05555",
        color: "#ffd0d0",
        fontSize: AGGRO_BADGE.fontSize,
        lineHeight: 1,
        ...PIXEL_TEXT,
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

  const trailingStyle = {
    fontSize: TYPE.secondary,
    opacity: 0.95,
    flexShrink: 0,
    ...PIXEL_TEXT,
    color: "#ddd",
  };

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
        e("span", { style: trailingStyle }, trailing),
      )
    : nameBlock;

  const chips = e(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "5px",
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
              fontSize: TYPE.badge,
              color: "#bbb",
              ...PIXEL_TEXT,
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
            fontSize: TYPE.name,
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
            fontSize: TYPE.name,
            ...PIXEL_TEXT,
            cursor: onSelect ? "pointer" : undefined,
          },
          onClick: onSelect,
        },
        nameBlock,
        trailing ? e("span", { style: trailingStyle }, trailing) : null,
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
        width: "100%",
        boxSizing: "border-box",
        background: isYou ? "rgba(80,0,0,0.45)" : undefined,
      },
    },
    vitals,
    chips,
  );
}

export function ThreatTable(props: ThreatTableProps): any {
  ensureThreatPanelCss();
  const React = getReact();
  const [storedScope, setStoredScope] = React.useState(
    () => (loadSettings().threatScope || "visible") as PartyScope,
  );
  const hasObserver = !!(props.observingId && props.observingId !== "");
  const scope = effectiveThreatScope(storedScope, hasObserver);
  const watchedName = hasObserver
    ? findEntity(props.entities, props.observingId!)?.name
    : undefined;

  const setThreatScope = (next: PartyScope) => {
    const normalized: PartyScope = next === "all" ? "visible" : next;
    saveSettings({ threatScope: normalized });
    setStoredScope(normalized);
  };

  const nameOf = (tid: string): string => {
    const ent = findEntity(props.entities, tid);
    return (ent && ent.name) || tid;
  };
  const byTarget = stickyAggroByTarget(props.byTarget, nameOf);
  const allIds = sortThreatTargetIds(
    Object.keys(byTarget),
    props.observingId,
    nameOf,
  );
  const targetIds =
    scope === "watched"
      ? allIds.filter((tid) =>
          isWatchedPartyTarget(tid, props.entities, props.observingId),
        )
      : allIds;

  if (allIds.length === 0) {
    if (!props.layoutEdit) return null;
    return e(PanelShellDummy, {
      label: "Threat",
      hint: "Aggro by target",
      accent: "#844",
      rows: 4,
      style: THREAT_PANEL_STYLE,
    });
  }

  const selectStyle = {
    fontSize: TYPE.body,
    padding: "2px 4px",
    border: "1px solid #555",
    background: "#1a1a1a",
    color: "#ccc",
    maxWidth: "11em",
    ...PIXEL_TEXT,
  };

  const header = e(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: "5px 8px 2px",
        fontSize: TYPE.title,
        flexShrink: 0,
        ...PIXEL_TEXT,
        color: "#ccc",
      },
    },
    e("span", { style: { flexShrink: 0 } }, "Threat"),
    e(
      "select",
      {
        value: scope === "all" ? "visible" : scope,
        title: "Who to list: your party, or everyone with aggro in vision",
        style: selectStyle,
        onChange: (ev: any) => setThreatScope(ev.target.value),
      },
      hasObserver
        ? e(
            "option",
            { value: "watched" },
            killScopeLabel("watched", watchedName),
          )
        : null,
      e("option", { value: "visible" }, killScopeLabel("visible")),
    ),
  );

  const rows =
    targetIds.length > 0
      ? targetIds.map((tid) =>
          e(ThreatRow, {
            key: tid,
            tid,
            mobs: byTarget[tid],
            entities: props.entities,
            observingId: props.observingId,
            setSelectedEntity: props.setSelectedEntity,
          }),
        )
      : [
          e(
            "div",
            {
              key: "empty",
              style: {
                padding: "6px 8px 8px",
                fontSize: TYPE.body,
                color: "#999",
                ...PIXEL_TEXT,
              },
            },
            scope === "watched"
              ? "No party aggro — switch to Visible for everyone on screen."
              : "No aggro targets.",
          ),
        ];

  return e(
    "div",
    {
      className: "comm-threat-table",
      style: Object.assign({}, THREAT_TABLE_SHELL, {
        fontSize: TYPE.name,
        ...PIXEL_TEXT,
      }),
    },
    header,
    e(
      "div",
      {
        className: "comm-threat-rows",
        style: { flex: "1 1 auto", minHeight: 0, width: "100%" },
      },
      ...rows,
    ),
  );
}
