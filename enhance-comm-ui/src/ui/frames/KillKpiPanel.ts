import { getReact, e } from "../../host/react";
import { formatTime } from "../../lib/format";
import { loadSettings, saveSettings, effectiveKillScope, killScopeLabel, type PartyScope } from "../../lib/settings";
import { getStats, resetKillSession } from "../../kpi/sessionKills";
import { getObservingId } from "../../host/al";
import { TYPE } from "../../lib/typeScale";
function partyLabel(key: string): string {
  return key.indexOf("solo:") === 0 ? key.slice(5) : key;
}

function killWord(n: number): string {
  return n === 1 ? "kill" : "kills";
}

const softText = {
  textShadow: "none",
  fontWeight: "normal" as const,
};

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
    fontSize: TYPE.name,
    padding: "6px 10px",
    background: "#141414",
    color: "#eee",
    border: "1px solid #555",
    maxWidth: "260px",
    flex: "1 1 auto",
    ...softText,
  };

  const resetBtn = e(
    "button",
    {
      type: "button",
      onClick: () => resetKillSession(),
      style: {
        cursor: "pointer",
        fontSize: TYPE.body,
        padding: "4px 12px",
        border: "1px solid #555",
        background: "#1a1a1a",
        color: "#ccc",
        ...softText,
      },
    },
    "Reset",
  );

  const header = (showReset: boolean) =>
    e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        },
      },
      e("div", { style: { fontSize: TYPE.title, ...softText } }, "Kills"),
      showReset ? resetBtn : null,
    );

  const scopeRow = e(
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
      { style: { fontSize: TYPE.name, color: "#bbb", ...softText } },
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
      e("option", { value: "all" }, "Visible parties"),    ),
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
          maxHeight: "280px",
          minWidth: "240px",
          fontSize: TYPE.name,
          color: "#eee",
          ...softText,
        },
      },
      ...children,
    );

  if (!stats.active && scope === "watched") {
    return shell([
      header(false),
      scopeRow,
      e(
        "div",
        { style: { fontSize: TYPE.body, color: "#999", ...softText } },
        "Select a character to track, or switch to visible parties.",
      ),
    ]);
  }
  const elapsedSec = stats.sessionStartedAt
    ? (Date.now() - stats.sessionStartedAt) / 1000
    : 0;
  const kpm =
    stats.killsPerMinute != null ? Math.round(stats.killsPerMinute) : null;
  const kph =
    stats.killsPerHour != null ? Math.round(stats.killsPerHour) : null;
  const kpd =
    stats.killsPerDay != null ? Math.round(stats.killsPerDay) : null;

  const rateCell = (value: number | null, unit: string) =>
    e(
      "span",
      {
        style: {
          display: "inline-flex",
          gap: "2px",
          alignItems: "baseline",
          ...softText,
        },
      },
      e("span", { style: { color: "#eee" } }, value != null ? String(value) : "—"),
      e("span", { style: { color: "#888", fontSize: TYPE.body } }, `/${unit}`),
    );

  const listSection = (rows: any[]) =>
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
      ...rows,
    );

  const listRow = (key: string, label: string, count: number) =>
    e(
      "div",
      {
        key,
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "12px",
          fontSize: TYPE.body,
          padding: "4px 0",
          ...softText,
        },
      },
      e("span", { style: { color: "#ddd" } }, label),
      e("span", { style: { color: "#eee", minWidth: "2ch", textAlign: "right" } }, String(count)),
    );

  return shell([
    header(true),
    scopeRow,
    e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        },
      },
      e(
        "div",
        { style: { fontSize: "22px", lineHeight: "1.2", ...softText } },
        `${stats.total} ${killWord(stats.total)}`,
      ),
      e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 14px",
            fontSize: TYPE.name,
            ...softText,
          },
        },
        ...(kph != null
          ? [rateCell(kpm, "m"), rateCell(kph, "h"), rateCell(kpd, "d")]
          : [e("span", { style: { color: "#888" } }, "—")]),
      ),
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "baseline",
            gap: "6px",
            fontSize: TYPE.body,
            color: "#aaa",
            ...softText,
          },
        },
        e("span", { style: { color: "#888" } }, "Session"),
        e(
          "span",
          {},
          stats.sessionStartedAt ? formatTime(elapsedSec) : "—",
        ),
      ),
    ),
    scope === "all" && stats.byParty.length > 1
      ? listSection(
          stats.byParty.slice(0, 8).map((row) =>
            listRow(row.party, partyLabel(row.party), row.count),
          ),
        )
      : null,
    stats.byMtype.length
      ? listSection(
          stats.byMtype
            .slice(0, 12)
            .map((row) => listRow(row.mtype, row.mtype, row.count)),
        )
      : null,
  ]);
}
