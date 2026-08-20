import { getReact, e } from "../../host/react";
import { monsterSprite } from "../../host/icons";
import { formatTime } from "../../lib/format";
import {
  loadSettings,
  saveSettings,
  effectiveKillScope,
  killScopeLabel,
  type PartyScope,
} from "../../lib/settings";
import { getStats, resetKillSession } from "../../kpi/sessionKills";
import { getObservingId } from "../../host/al";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { wrapIconHtml } from "../chrome/wrapIconHtml";

const MOB_ICON_SIZE = 20;
const LIST_ROW_HEIGHT = 30;
/** Rate-chip unit labels — brighter than body meta so /min /h /d stay readable. */
const UNIT_COLOR = "#c8c8c8";
const META_COLOR = "#b0b0b0";

function partyLabel(key: string): string {
  return key.indexOf("solo:") === 0 ? key.slice(5) : key;
}

function killWord(n: number): string {
  return n === 1 ? "kill" : "kills";
}

/** Compact rate digits: 44, 2.6k, 62.7k */
function fmtCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    const fixed = k >= 100 ? k.toFixed(0) : k.toFixed(1);
    return `${fixed.replace(/\.0$/, "")}k`;
  }
  return String(Math.round(n));
}

/** Per-row kills/min: one decimal under 100, compact above. */
function fmtRate(n: number): string {
  if (n >= 1000) return fmtCompact(n);
  if (n >= 100) return String(Math.round(n));
  return n.toFixed(1).replace(/\.0$/, "");
}

function metricCell(opts: {
  key?: string;
  value: string;
  unit?: string;
  title?: string;
  minWidth?: string;
}): any {
  return e(
    "span",
    {
      key: opts.key,
      title: opts.title,
      style: {
        position: "relative",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "baseline",
        gap: "2px",
        minWidth: opts.minWidth || "4.5ch",
        justifyContent: "flex-end",
        fontVariantNumeric: "tabular-nums",
        ...PIXEL_TEXT,
      },
    },
    e(
      "span",
      {
        style: {
          fontSize: TYPE.count,
          color: "#eee",
          ...PIXEL_TEXT,
        },
      },
      opts.value,
    ),
    opts.unit
      ? e(
          "span",
          {
            style: {
              fontSize: TYPE.secondaryMin,
              color: UNIT_COLOR,
              ...PIXEL_TEXT,
            },
          },
          opts.unit,
        )
      : null,
  );
}

export function KillKpiPanel(): any {
  const React = getReact();
  const [storedScope, setStoredScope] = React.useState(
    () => loadSettings().killScope as PartyScope,
  );
  const stats = getStats();
  const hasObserver = getObservingId() != null && getObservingId() !== "";
  const scope = effectiveKillScope(storedScope, hasObserver);

  const setKillScope = (next: PartyScope) => {
    saveSettings({ killScope: next });
    setStoredScope(next);
  };

  const selectStyle = {
    fontSize: TYPE.body,
    padding: "5px 8px",
    background: "#141414",
    color: "#eee",
    border: "1px solid #555",
    maxWidth: "200px",
    flex: "1 1 auto",
    minWidth: 0,
    ...PIXEL_TEXT,
  };

  const resetBtn = e(
    "button",
    {
      type: "button",
      onClick: () => resetKillSession(),
      style: {
        cursor: "pointer",
        fontSize: TYPE.body,
        padding: "5px 10px",
        border: "1px solid #555",
        background: "#1a1a1a",
        color: "#ccc",
        flexShrink: 0,
        ...PIXEL_TEXT,
      },
    },
    "Reset",
  );

  const title = e(
    "div",
    {
      "data-comm-drag-handle": "true",
      style: {
        fontSize: TYPE.title,
        color: "#eee",
        cursor: "grab",
        ...PIXEL_TEXT,
      },
    },
    "Kills",
  );

  const scopeRow = (showReset: boolean) =>
    e(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
        },
      },
      e(
        "span",
        {
          style: {
            fontSize: TYPE.body,
            color: "#999",
            flexShrink: 0,
            ...PIXEL_TEXT,
          },
        },
        "Scope",
      ),
      e(
        "select",
        {
          value: scope,
          style: selectStyle,
          onChange: (ev: any) => setKillScope(ev.target.value),
        },
        hasObserver
          ? e(
              "option",
              { value: "watched" },
              killScopeLabel("watched", stats.trackingName),
            )
          : null,
        e("option", { value: "all" }, killScopeLabel("all")),
      ),
      showReset ? resetBtn : null,
    );

  const shell = (children: any[]) =>
    e(
      "div",
      {
        style: {
          display: "flex",
          overflow: "auto",
          flexDirection: "column",
          margin: "4px",
          border: "2px solid #555",
          background: "rgba(0,0,0,0.94)",
          gap: "10px",
          padding: "10px",
          maxHeight: "300px",
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          fontSize: TYPE.name,
          color: "#eee",
          ...PIXEL_TEXT,
        },
      },
      ...children,
    );

  if (!stats.active && scope === "watched") {
    return shell([
      title,
      scopeRow(false),
      e(
        "div",
        { style: { fontSize: TYPE.body, color: "#999", ...PIXEL_TEXT } },
        "Select a character to track, or switch to visible parties.",
      ),
    ]);
  }

  const elapsedSec = stats.sessionStartedAt
    ? (Date.now() - stats.sessionStartedAt) / 1000
    : 0;
  const kpm = stats.killsPerMinute;
  const kph = stats.killsPerHour;
  const kpd = stats.killsPerDay;
  const ratesReady = kph != null;

  const rateChip = (value: number | null, unit: string) =>
    e(
      "div",
      {
        style: {
          flex: "1 1 0",
          minWidth: "64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          padding: "8px 6px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid #444",
          ...PIXEL_TEXT,
        },
      },
      e(
        "span",
        {
          style: {
            fontSize: TYPE.count,
            color: "#eee",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            ...PIXEL_TEXT,
          },
        },
        value != null ? fmtCompact(value) : "—",
      ),
      e(
        "span",
        {
          style: {
            fontSize: TYPE.body,
            color: UNIT_COLOR,
            lineHeight: 1.1,
            letterSpacing: "0.04em",
            ...PIXEL_TEXT,
          },
        },
        `/${unit}`,
      ),
    );

  const rateStrip = e(
    "div",
    {
      style: {
        display: "flex",
        gap: "6px",
        width: "100%",
      },
    },
    ...(ratesReady
      ? [rateChip(kpm, "min"), rateChip(kph, "h"), rateChip(kpd, "d")]
      : [
          e(
            "div",
            {
              style: {
                flex: 1,
                padding: "8px",
                textAlign: "center",
                color: "#888",
                fontSize: TYPE.body,
                border: "1px solid #333",
                ...PIXEL_TEXT,
              },
            },
            "Rates after first kill…",
          ),
        ]),
  );

  const sessionLine = e(
    "div",
    {
      style: {
        fontSize: TYPE.body,
        color: "#aaa",
        ...PIXEL_TEXT,
      },
    },
    `Session · ${stats.sessionStartedAt ? formatTime(elapsedSec) : "—"}`,
  );

  const hero = e(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      },
    },
    e(
      "div",
      {
        style: {
          fontSize: "22px",
          lineHeight: "1.15",
          color: "#f0f0f0",
          ...PIXEL_TEXT,
        },
      },
      `${stats.total} ${killWord(stats.total)}`,
    ),
    rateStrip,
    sessionLine,
  );

  const listSection = (heading: string, colHint: string | null, rows: any[]) =>
    e(
      "div",
      {
        style: {
          borderTop: "1px solid #333",
          paddingTop: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        },
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "4px",
          },
        },
        e(
          "div",
          {
            style: {
              fontSize: TYPE.body,
              color: "#888",
              ...PIXEL_TEXT,
            },
          },
          heading,
        ),
        colHint
          ? e(
              "div",
              {
                style: {
                  fontSize: TYPE.secondaryMin,
                  color: META_COLOR,
                  ...PIXEL_TEXT,
                },
              },
              colHint,
            )
          : null,
      ),
      ...rows,
    );

  const listRow = (opts: {
    key: string;
    label: string;
    count: number;
    max: number;
    mtype?: string;
    killsPerMinute?: number | null;
    avgIntervalSec?: number | null;
    showPace?: boolean;
  }) => {
    const share =
      opts.max > 0 ? Math.max(0, Math.min(1, opts.count / opts.max)) : 0;
    let icon: any = null;
    if (opts.mtype) {
      const html = monsterSprite(opts.mtype, { size: MOB_ICON_SIZE });
      if (html) icon = wrapIconHtml(html);
    }

    const rate =
      opts.killsPerMinute != null
        ? metricCell({
            value: fmtRate(opts.killsPerMinute),
            unit: "/min",
            title: "Kills per minute (session)",
            minWidth: "5.5ch",
          })
        : metricCell({
            value: "—",
            unit: "/min",
            title: "Kills per minute (session)",
            minWidth: "5.5ch",
          });

    const pace =
      opts.showPace !== false
        ? opts.avgIntervalSec != null
          ? metricCell({
              value: formatTime(opts.avgIntervalSec),
              unit: "avg",
              title:
                "Average interval between kills of this type (pace, not HP TTK)",
              minWidth: "5ch",
            })
          : metricCell({
              value: "—",
              unit: "avg",
              title: "Average interval between kills (needs 2+ kills)",
              minWidth: "5ch",
            })
        : null;

    return e(
      "div",
      {
        key: opts.key,
        style: {
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minHeight: `${LIST_ROW_HEIGHT}px`,
          height: `${LIST_ROW_HEIGHT}px`,
          padding: "0 6px",
          boxSizing: "border-box",
          ...PIXEL_TEXT,
        },
      },
      e("div", {
        style: {
          position: "absolute",
          left: 0,
          top: 2,
          bottom: 2,
          width: `${(share * 100).toFixed(1)}%`,
          background: "rgba(180, 70, 70, 0.22)",
          pointerEvents: "none",
        },
      }),
      icon,
      e(
        "span",
        {
          style: {
            position: "relative",
            flex: "1 1 auto",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: TYPE.body,
            color: "#ddd",
            ...PIXEL_TEXT,
          },
        },
        opts.label,
      ),
      rate,
      pace,
      e(
        "span",
        {
          style: {
            position: "relative",
            flexShrink: 0,
            fontSize: TYPE.count,
            color: "#eee",
            fontVariantNumeric: "tabular-nums",
            minWidth: "2.5ch",
            textAlign: "right",
            ...PIXEL_TEXT,
          },
          title: "Kill count",
        },
        String(opts.count),
      ),
    );
  };

  const partyMax =
    scope === "all" && stats.byParty.length ? stats.byParty[0].count : 0;
  const mtypeMax = stats.byMtype.length ? stats.byMtype[0].count : 0;

  return shell([
    title,
    scopeRow(true),
    hero,
    scope === "all" && stats.byParty.length > 1
      ? listSection(
          "Parties",
          "/min · count",
          stats.byParty.slice(0, 8).map((row) =>
            listRow({
              key: row.party,
              label: partyLabel(row.party),
              count: row.count,
              max: partyMax,
              killsPerMinute: row.killsPerMinute,
              showPace: false,
            }),
          ),
        )
      : null,
    stats.byMtype.length
      ? listSection(
          "Monsters",
          "/min · avg · count",
          stats.byMtype.slice(0, 12).map((row) =>
            listRow({
              key: row.mtype,
              label: row.mtype,
              count: row.count,
              max: mtypeMax,
              mtype: row.mtype,
              killsPerMinute: row.killsPerMinute,
              avgIntervalSec: row.avgIntervalSec,
              showPace: true,
            }),
          ),
        )
      : null,
  ]);
}
