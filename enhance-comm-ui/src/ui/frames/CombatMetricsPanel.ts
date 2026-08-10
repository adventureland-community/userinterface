import { getReact, e } from "../../host/react";
import { formatTime } from "../../lib/format";
import {
  loadSettings,
  partyFocusLabel,
  resolvePartyFocus,
  effectivePartyFocus,
  saveSettings,
  type CombatViewMode,
  type CommUiSettings,
  type PartyFocus,
} from "../../lib/settings";
import {
  CHANNEL_COLORS,
  CHANNEL_LABELS,
  COMBAT_CHANNELS,
  buildCombatBarRows,
  getCombatHistory,
  getCombatRows,
  getCombatSessionStartedAt,
  getPartyTotals,
  getWatchedPartyKey,
  listPartyKeys,
  resetPartyCombat,
  type CombatChannel,
} from "../../meters/partyCombat";
import { RankMeter } from "../../meters/RankMeter";
import { MetricChart } from "../chrome/MetricChart";
import { getObserving, getObservingId } from "../../host/al";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

/** Always-visible channel chips. */
const PRIMARY_CHANNELS: CombatChannel[] = ["dps", "base", "hps"];

/** Collapsed behind “more” unless active / expanded. */
const SECONDARY_CHANNELS: CombatChannel[] = COMBAT_CHANNELS.filter(
  (ch) => PRIMARY_CHANNELS.indexOf(ch) < 0,
);

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

function partyDisplay(key: string): string {
  return key.indexOf("solo:") === 0 ? key.slice(5) : key;
}

function isChannelActive(
  ch: CombatChannel,
  view: CombatViewMode,
  channels: CombatChannel[],
  barChannel: CombatChannel,
): boolean {
  return view === "bars" ? barChannel === ch : channels.indexOf(ch) >= 0;
}

function segBtn(
  label: string,
  active: boolean,
  onClick: () => void,
  first?: boolean,
): any {
  return e(
    "button",
    {
      type: "button",
      onClick,
      style: {
        cursor: "pointer",
        fontSize: TYPE.secondary,
        lineHeight: "1.2",
        padding: "4px 10px",
        minHeight: "28px",
        margin: 0,
        border: "none",
        borderLeft: first ? "none" : "1px solid #3a3a3a",
        borderRadius: 0,
        background: active ? "#2e2e2e" : "transparent",
        color: active ? "#eee" : "#888",
        ...PIXEL_TEXT,
        outline: "none",
      },
    },
    label,
  );
}

function channelChip(
  ch: CombatChannel,
  active: boolean,
  onClick: () => void,
): any {
  const color = CHANNEL_COLORS[ch];
  return e(
    "button",
    {
      type: "button",
      onClick,
      title: CHANNEL_LABELS[ch],
      style: {
        cursor: "pointer",
        fontSize: TYPE.secondary,
        padding: "3px 8px",
        minHeight: "26px",
        lineHeight: "1.2",
        margin: 0,
        border: active ? `1px solid ${color}` : "1px solid #2a2a2a",
        background: active ? `${color}18` : "transparent",
        color: active ? color : "#666",
        ...PIXEL_TEXT,
      },
    },
    CHANNEL_LABELS[ch],
  );
}

function moreChip(expanded: boolean, hiddenActive: number, onClick: () => void): any {
  const label =
    expanded
      ? "less"
      : hiddenActive > 0
        ? `+${hiddenActive}`
        : "more";
  return e(
    "button",
    {
      type: "button",
      onClick,
      title: expanded ? "Hide secondary channels" : "Show more channels",
      style: {
        cursor: "pointer",
        fontSize: TYPE.secondaryMin,
        padding: "3px 8px",
        minHeight: "26px",
        lineHeight: "1.2",
        margin: 0,
        border: "1px solid #333",
        background: expanded ? "#1c1c1c" : "transparent",
        color: "#888",
        ...PIXEL_TEXT,
      },
    },
    label,
  );
}

const cellPad = "2px 6px";

function thCell(
  content: any,
  opts?: { key?: string; textAlign?: string; color?: string },
): any {
  return e(
    "th",
    {
      key: opts && opts.key,
      style: {
        textAlign: (opts && opts.textAlign) || "left",
        padding: cellPad,
        fontWeight: "normal",
        textShadow: "none",
        color: opts && opts.color,
      },
    },
    content,
  );
}

function tdCell(
  content: any,
  opts?: {
    key?: string;
    textAlign?: string;
    color?: string;
    maxWidth?: string;
    overflow?: string;
    textOverflow?: string;
    whiteSpace?: string;
    fontVariantNumeric?: string;
  },
): any {
  return e(
    "td",
    {
      key: opts && opts.key,
      style: {
        padding: cellPad,
        fontWeight: "normal",
        textShadow: "none",
        textAlign: opts && opts.textAlign,
        color: opts && opts.color,
        maxWidth: opts && opts.maxWidth,
        overflow: opts && opts.overflow,
        textOverflow: opts && opts.textOverflow,
        whiteSpace: opts && opts.whiteSpace,
        fontVariantNumeric: opts && opts.fontVariantNumeric,
      },
    },
    content,
  );
}

export function CombatMetricsPanel(): any {
  const React = getReact();
  const [settings, setSettings] = React.useState(() => loadSettings());
  const [moreOpen, setMoreOpen] = React.useState(false);

  const patch = (partial: Partial<CommUiSettings>) => {
    setSettings(saveSettings(partial));
  };

  const view = (settings.combatView || "table") as CombatViewMode;
  const storedFocus: PartyFocus = settings.partyFocus || "watched";
  const compact = !!settings.combatCompact;
  const channels: CombatChannel[] = compact
    ? ["dps", "hps"]
    : settings.combatChannels.length
      ? settings.combatChannels
      : ["dps"];
  const barChannel: CombatChannel = compact
    ? settings.barChannel === "hps"
      ? "hps"
      : "dps"
    : settings.barChannel || "dps";
  const watchedId = getObservingId();
  const watchedKey = getWatchedPartyKey();
  const watching = getObserving()?.name || getObserving()?.id || "";
  const hasObserver = watchedId != null && watchedId !== "";
  const focus = effectivePartyFocus(storedFocus, hasObserver);
  // Individual party keys: visible snapshot only (not whole session)
  const partyKeys = listPartyKeys("visible");

  const resolved = resolvePartyFocus(focus, watchedKey || "");
  const { scope, partyFilter, historyKey } = resolved;

  const rows = getCombatRows(scope, partyFilter);
  const totals = getPartyTotals(scope, partyFilter);
  const barRows = buildCombatBarRows(scope, barChannel, partyFilter);
  const history = getCombatHistory();
  const started = getCombatSessionStartedAt();
  const elapsed = started ? (Date.now() - started) / 1000 : 0;

  const series = channels.slice(0, 4).map((ch) => ({
    label: CHANNEL_LABELS[ch],
    color: CHANNEL_COLORS[ch],
    values: history.map((h) => {
      if (focus === "all" || focus === "visible") {
        const visibleKeys =
          focus === "visible" ? new Set(listPartyKeys("visible")) : null;
        let sum = 0;
        const keys = Object.keys(h.parties);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (visibleKeys && !visibleKeys.has(key)) continue;
          sum += (h.parties[key] && h.parties[key][ch]) || 0;
        }
        return sum;
      }
      if (!historyKey) return 0;
      const bucket = h.parties[historyKey];
      return (bucket && bucket[ch]) || 0;
    }),
  }));

  const onChannelClick = (ch: CombatChannel) => {
    if (view === "bars") {
      patch({ barChannel: ch });
      return;
    }
    const next = channels.slice();
    const idx = next.indexOf(ch);
    if (idx >= 0) {
      if (next.length <= 1) return;
      next.splice(idx, 1);
    } else {
      next.push(ch);
    }
    patch({ combatChannels: next });
  };

  const visibleSecondary = SECONDARY_CHANNELS.filter(
    (ch) =>
      moreOpen || isChannelActive(ch, view, channels, barChannel),
  );
  const hiddenInactive = SECONDARY_CHANNELS.filter(
    (ch) =>
      !moreOpen && !isChannelActive(ch, view, channels, barChannel),
  ).length;
  const chipChannels = PRIMARY_CHANNELS.concat(visibleSecondary);

  const selectStyle = {
    fontSize: TYPE.secondary,
    lineHeight: "1.2",
    padding: "4px 8px",
    minHeight: "28px",
    background: "#141414",
    color: "#ddd",
    border: "1px solid #444",
    maxWidth: "180px",
    minWidth: "0",
    flex: "1 1 auto",
    ...PIXEL_TEXT,
  };

  return e(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        margin: "4px",
        border: "2px solid #555",
        background: "rgba(0,0,0,0.94)",
        gap: "6px",
        padding: "8px",
        width: "420px",
        maxHeight: "520px",
        overflow: "auto",
        fontSize: TYPE.body,
        color: "#eee",
        ...PIXEL_TEXT,
      },
    },
    // Header — title / elapsed+dps / Reset
    e(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          minHeight: "28px",
        },
      },
      e(
        "div",
        {
          style: {
            fontSize: TYPE.title,
            color: "#eee",
            ...PIXEL_TEXT,
            flex: "0 0 auto",
          },
        },
        "Combat",
      ),
      e(
        "div",
        {
          style: {
            fontSize: TYPE.secondary,
            color: "#999",
            ...PIXEL_TEXT,
            flex: "1 1 auto",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        started ? `${formatTime(elapsed)} · ${fmt(totals.dps)} dps` : "waiting…",
      ),
      e(
        "button",
        {
          type: "button",
          onClick: () => resetPartyCombat(),
          style: {
            cursor: "pointer",
            fontSize: TYPE.secondary,
            lineHeight: "1.2",
            padding: "4px 10px",
            minHeight: "28px",
            border: "1px solid #444",
            background: "#161616",
            color: "#aaa",
            ...PIXEL_TEXT,
            flex: "0 0 auto",
          },
        },
        "Reset",
      ),
      e(
        "button",
        {
          type: "button",
          title: compact
            ? "Compact on — DPS + HPS only"
            : "Compact off — show all channels",
          onClick: () => patch({ combatCompact: !compact }),
          style: {
            cursor: "pointer",
            fontSize: TYPE.secondary,
            lineHeight: "1.2",
            padding: "6px 12px",
            minHeight: "32px",
            border: compact ? "1px solid #85c76b" : "1px solid #444",
            background: compact ? "#1a2a1a" : "#161616",
            color: compact ? "#85c76b" : "#aaa",
            ...PIXEL_TEXT,
            flex: "0 0 auto",
          },
        },
        compact ? "Compact" : "Full",
      ),
      hasObserver
        ? e(
            "button",
            {
              type: "button",
              title: "Focus the watched character's party",
              onClick: () => patch({ partyFocus: "watched" }),
              style: {
                cursor: "pointer",
                fontSize: TYPE.secondary,
                lineHeight: "1.2",
                padding: "6px 10px",
                minHeight: "32px",
                border:
                  focus === "watched" ? "1px solid #e13758" : "1px solid #444",
                background:
                  focus === "watched" ? "rgba(225,55,88,0.18)" : "#161616",
                color: focus === "watched" ? "#ffe0e8" : "#aaa",
                ...PIXEL_TEXT,
                flex: "0 0 auto",
              },
            },
            "My party",
          )
        : null,
    ),
    // Party + view tabs on one compact toolbar
    e(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        },
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flex: "1 1 140px",
            minWidth: 0,
          },
        },
        e(
          "span",
          {
            style: {
              fontSize: TYPE.secondaryMin,
              color: "#888",
              ...PIXEL_TEXT,
              flex: "0 0 auto",
            },
          },
          "Party",
        ),
        e(
          "select",
          {
            value: focus,
            style: selectStyle,
            onChange: (ev: any) => {
              patch({ partyFocus: ev.target.value as PartyFocus });
            },
          },
          e("option", { value: "watched" }, partyFocusLabel("watched", watching)),
          e("option", { value: "visible" }, "Visible parties"),
          e("option", { value: "all" }, "All parties"),
          partyKeys.length
            ? e("option", { value: "__sep__", disabled: true }, "────────")
            : null,
          ...partyKeys.map((key) =>
            e("option", { key, value: key }, partyDisplay(key)),
          ),
        ),
      ),
      e(
        "div",
        {
          style: {
            display: "inline-flex",
            flex: "0 0 auto",
            border: "1px solid #444",
            background: "#111",
          },
        },
        segBtn("Table", view === "table", () => patch({ combatView: "table" }), true),
        segBtn("Bars", view === "bars", () => patch({ combatView: "bars" })),
        segBtn("Graph", view === "graph", () => patch({ combatView: "graph" })),
      ),
    ),
    // Channel chips — hidden in compact (DPS+HPS forced)
    compact
      ? null
      : e(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: "3px",
              alignItems: "center",
            },
          },
          e(
            "span",
            {
              style: {
                fontSize: TYPE.secondaryMin,
                color: "#888",
                marginRight: "2px",
                ...PIXEL_TEXT,
              },
            },
            view === "bars" ? "Metric" : "Columns",
          ),
          ...chipChannels.map((ch) =>
            channelChip(
              ch,
              isChannelActive(ch, view, channels, barChannel),
              () => onChannelClick(ch),
            ),
          ),
          SECONDARY_CHANNELS.length
            ? moreChip(moreOpen, hiddenInactive, () => setMoreOpen(!moreOpen))
            : null,
        ),
    // Content
    view === "graph"
      ? e(MetricChart, {
          width: 400,
          height: 140,
          series,
          emptyText: "Collecting samples…",
        })
      : null,
    view === "table"
      ? rows.length
        ? e(
            "div",
            { style: { overflowX: "auto" } },
            e(
              "table",
              {
                style: {
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: TYPE.nameLg,
                  lineHeight: "1.25",
                  ...PIXEL_TEXT,
                },
              },
              e(
                "thead",
                {},
                e(
                  "tr",
                  {
                    style: {
                      borderBottom: "1px solid #333",
                      color: "#999",
                      fontSize: TYPE.nameLg,
                      ...PIXEL_TEXT,
                    },
                  },
                  thCell("Name"),
                  ...channels.map((ch) =>
                    thCell(CHANNEL_LABELS[ch], {
                      key: ch,
                      textAlign: "right",
                      color: CHANNEL_COLORS[ch],
                    }),
                  ),
                ),
              ),
              e(
                "tbody",
                {},
                ...rows.map((row) => {
                  const isYou =
                    watchedId != null && String(row.id) === String(watchedId);
                  return e(
                    "tr",
                    {
                      key: row.id,
                      style: {
                        borderBottom: "1px solid #1a1a1a",
                        background: isYou
                          ? "rgba(225,55,88,0.16)"
                          : undefined,
                        boxShadow: isYou
                          ? "inset 3px 0 0 #e13758"
                          : undefined,
                      },
                    },
                    tdCell(row.name, {
                      maxWidth: "130px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: isYou ? "#ffe0e8" : "#e8e8e8",
                    }),
                    ...channels.map((ch) =>
                      tdCell(fmt(row.rates[ch] || 0), {
                        key: ch,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: "#ddd",
                      }),
                    ),
                  );
                }),
                e(
                  "tr",
                  {
                    key: "_total",
                    style: {
                      background: "rgba(255,255,255,0.04)",
                      borderTop: "1px solid #3a3a3a",
                      color: "#cfcfcf",
                      fontWeight: "normal",
                      textShadow: "none",
                    },
                  },
                  tdCell("Total", { color: "#bbb" }),
                  ...channels.map((ch) =>
                    tdCell(fmt(totals[ch] || 0), {
                      key: ch,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }),
                  ),
                ),
              ),
            ),
          )
        : e(
            "div",
            { style: { color: "#777", padding: "10px 2px", fontSize: TYPE.body } },
            "No combat data yet for this focus.",
          )
      : null,
    view === "bars"
      ? barRows.length
        ? e(RankMeter, {
            title: `${CHANNEL_LABELS[barChannel]} · ${partyFocusLabel(focus, watching)}`,
            className: "PartyCombatBars",
            rows: barRows,
            embedded: true,
            highlightId: watchedId,
          })
        : e(
            "div",
            { style: { color: "#777", padding: "10px 2px", fontSize: TYPE.body } },
            "No combat data yet for this focus.",
          )
      : null,
  );
}
