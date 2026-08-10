import { getReact, e } from "../../host/react";
import { monsterSprite } from "../../host/icons";
import { formatTime } from "../../lib/format";
import { loadSettings, saveSettings, effectiveKillScope, killScopeLabel, type PartyScope } from "../../lib/settings";
import { getStats, resetKillSession } from "../../kpi/sessionKills";
import { getObservingId } from "../../host/al";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

const MOB_ICON_SIZE = 20;
const LIST_ROW_HEIGHT = 28;

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

function wrapIconHtml(html: string): any {
  return e("div", {
    style: { display: "inline-block", lineHeight: 0, fontSize: 0, flexShrink: 0 },
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
    { style: { fontSize: TYPE.title, color: "#eee", ...PIXEL_TEXT } },
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
        e(
          "option",
          { value: "watched" },
          killScopeLabel("watched", stats.trackingName),
        ),
        e("option", { value: "all" }, "Visible parties"),
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
          minWidth: "260px",
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
            color: "#999",
            lineHeight: 1.1,
            letterSpacing: "0.02em",
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

  const listSection = (heading: string, rows: any[]) =>
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
            fontSize: TYPE.body,
            color: "#888",
            marginBottom: "4px",
            ...PIXEL_TEXT,
          },
        },
        heading,
      ),
      ...rows,
    );

  const listRow = (opts: {
    key: string;
    label: string;
    count: number;
    max: number;
    mtype?: string;
  }) => {
    const share = opts.max > 0 ? Math.max(0, Math.min(1, opts.count / opts.max)) : 0;
    let icon: any = null;
    if (opts.mtype) {
      const html = monsterSprite(opts.mtype, { size: MOB_ICON_SIZE });
      if (html) icon = wrapIconHtml(html);
    }

    return e(
      "div",
      {
        key: opts.key,
        style: {
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "8px",
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
        },
        String(opts.count),
      ),
    );
  };

  const partyMax =
    scope === "all" && stats.byParty.length
      ? stats.byParty[0].count
      : 0;
  const mtypeMax = stats.byMtype.length ? stats.byMtype[0].count : 0;

  return shell([
    title,
    scopeRow(true),
    hero,
    scope === "all" && stats.byParty.length > 1
      ? listSection(
          "Parties",
          stats.byParty.slice(0, 8).map((row) =>
            listRow({
              key: row.party,
              label: partyLabel(row.party),
              count: row.count,
              max: partyMax,
            }),
          ),
        )
      : null,
    stats.byMtype.length
      ? listSection(
          "Monsters",
          stats.byMtype.slice(0, 12).map((row) =>
            listRow({
              key: row.mtype,
              label: row.mtype,
              count: row.count,
              max: mtypeMax,
              mtype: row.mtype,
            }),
          ),
        )
      : null,
  ]);
}
