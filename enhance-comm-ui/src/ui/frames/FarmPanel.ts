/**
 * Farm HUD — compact glance (nearby chips + gold spark) and details tabs.
 * Replaces KillKpiPanel. Panel id remains `kills` for layout persistence.
 */

import { getReact, e } from "../../host/react";
import { monsterSprite } from "../../host/icons";
import { monsterDisplayName, itemDisplayName } from "../../lib/gameIcon";
import { TYPE, PIXEL_TEXT } from "../../lib/typeScale";
import { wrapIconHtml } from "../chrome/wrapIconHtml";
import { cooltipHandlers } from "../chrome/cooltip";
import { ItemInstance, ensureItemInstanceBadgeCss } from "../chrome/ItemInstance";
import {
  loadSettings,
  saveSettings,
  type FarmGlanceGrow,
} from "../../lib/settings";
import {
  farmMtypeRow,
  farmTopDrop,
  getFarmStats,
  resetFarmSession,
  type FarmStats,
} from "../../kpi/farmSession";
import { ensureFarmPanelCss } from "./farmPanelCss";

type FarmTab = "overview" | "kills" | "gold" | "loot";

function fmtCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    const fixed = k >= 100 ? k.toFixed(0) : k.toFixed(1);
    return `${fixed.replace(/\.0$/, "")}k`;
  }
  return String(Math.round(n));
}

function fmtRate(n: number): string {
  if (n >= 100) return String(Math.round(n));
  return n.toFixed(1).replace(/\.0$/, "");
}

function fmtLootRate(n: number): string {
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function linePoints(series: number[], w: number, h: number, pad: number): string {
  if (!series.length) return "";
  const max = Math.max.apply(null, series.concat([1]));
  const pts: string[] = [];
  for (let i = 0; i < series.length; i++) {
    const x = pad + (i / Math.max(series.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (series[i] / max) * (h - pad * 2);
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

function sparkSvg(series: number[]): any {
  const pts = linePoints(series.length ? series : [0], 48, 14, 1);
  return e(
    "svg",
    {
      className: "ecu-farm__spark",
      viewBox: "0 0 48 14",
      preserveAspectRatio: "none",
      "aria-hidden": true,
    },
    e("polyline", {
      fill: "none",
      stroke: "#e8c96a",
      strokeWidth: "1.4",
      points: pts,
    }),
  );
}

function chartSvg(series: number[], stroke: string): any {
  const pts = linePoints(series.length ? series : [0], 160, 56, 4);
  return e(
    "svg",
    {
      className: "ecu-farm__line",
      viewBox: "0 0 160 56",
      preserveAspectRatio: "none",
      "aria-hidden": true,
    },
    e("polyline", {
      fill: "none",
      stroke,
      strokeWidth: "2",
      points: pts,
    }),
  );
}

function chipCap(cols: number, rows: number): number {
  if (rows <= 0) return 99;
  return Math.max(1, cols * rows);
}

function gridStyle(
  grow: FarmGlanceGrow,
  cols: number,
  rows: number,
): Record<string, string> {
  if (grow === "right" || grow === "left") {
    return {
      gridTemplateColumns: `repeat(${cols}, max-content)`,
      gridAutoFlow: "row",
      direction: grow === "left" ? "rtl" : "ltr",
    };
  }
  const r = rows > 0 ? rows : 99;
  return {
    gridTemplateRows: `repeat(${r}, max-content)`,
    gridTemplateColumns: `repeat(${cols}, max-content)`,
    gridAutoFlow: "column",
    direction: grow === "up" ? "rtl" : "ltr",
  };
}

function mobCooltipHtml(stats: FarmStats, mtype: string): string {
  const row = farmMtypeRow(stats, mtype);
  const drop = farmTopDrop(stats, mtype);
  const sprite = monsterSprite(mtype, { size: 28 });
  const rate =
    row?.killsPerMinute != null ? `${fmtRate(row.killsPerMinute)}/min` : "—";
  const count = row ? `×${row.count}` : "×0";
  const avg =
    row?.avgIntervalSec != null
      ? `${Math.max(1, Math.round(row.avgIntervalSec))}s`
      : "—";
  const topDrop =
    drop != null
      ? `${drop.name} ×${drop.q}` +
        (drop.perMin != null ? ` · ${fmtLootRate(drop.perMin)}/min` : "")
      : "—";
  return (
    `<h4><span class="ecu-meter-icon-monster">${sprite || ""}</span> ${mtype}</h4>` +
    `<div class="line"><b>Kills</b><span>${rate} · ${count}</span></div>` +
    `<div class="line"><b>Avg</b><span>${avg}</span></div>` +
    `<div class="line"><b>Top drop</b><span>${topDrop}</span></div>` +
    `<div class="line" style="opacity:.75"><span>Click for Farm details</span></div>`
  );
}

export function FarmPanel(): any {
  const React = getReact();
  ensureFarmPanelCss();
  ensureItemInstanceBadgeCss();

  const [details, setDetails] = React.useState(false);
  const [tab, setTab] = React.useState("overview" as FarmTab);
  const [, bump] = React.useState(0);
  const settings = loadSettings();
  const grow = (settings.farmGlanceGrow || "right") as FarmGlanceGrow;
  const cols = settings.farmGlanceCols || 2;
  const rows =
    typeof settings.farmGlanceRows === "number" ? settings.farmGlanceRows : 2;

  const stats = getFarmStats();
  const nearby = stats.nearbyMtypes;
  const cap = chipCap(cols, rows);
  const shown = nearby.slice(0, cap);
  const overflow = nearby.length - shown.length;

  const goldLabel =
    stats.goldGained > 0
      ? fmtCompact(stats.goldGained)
      : stats.goldPerMinute != null
        ? fmtCompact(stats.goldPerMinute)
        : "0";
  const goldRate =
    stats.goldPerMinute != null ? fmtCompact(stats.goldPerMinute) : "—";

  const detailsTitle = e(
    "div",
    {
      className: "ecu-farm__title",
      "data-comm-drag-handle": "true",
      style: { ...PIXEL_TEXT, fontSize: TYPE.title },
    },
    e("span", null, "Farm"),
    e(
      "span",
      { className: "ecu-farm__title-actions" },
      e(
        "button",
        {
          type: "button",
          className: "ecu-farm__btn is-on",
          style: PIXEL_TEXT,
          onClick: () => setDetails(false),
        },
        "Glance",
      ),
    ),
  );

  if (!stats.active && stats.scope === "watched") {
    return e(
      "div",
      { className: "ecu-farm ecu-farm--glance", style: PIXEL_TEXT },
      e(
        "div",
        {
          className: "ecu-farm__empty",
          "data-comm-drag-handle": "true",
          style: PIXEL_TEXT,
        },
        "Select a character to track.",
      ),
    );
  }

  const goldBar = e(
    "button",
    {
      type: "button",
      className: "ecu-farm__gold",
      style: PIXEL_TEXT,
      "data-comm-drag-handle": "true",
      "aria-label": "Farm gold — drag to move",
      onClick: () => {
        setTab("gold");
        setDetails(true);
      },
    },
    e(
      "span",
      { className: "ecu-farm__gold-v" },
      `${goldLabel}g `,
      e("span", { className: "u" }, `${goldRate}/m`),
    ),
    sparkSvg(stats.goldSeries),
  );

  const chips = e(
    "div",
    {
      className: "ecu-farm__chips",
      style: gridStyle(grow, cols, rows),
    },
    ...shown.map((mtype: string) => {
      const row = farmMtypeRow(stats, mtype);
      const drop = farmTopDrop(stats, mtype);
      const rate = row?.killsPerMinute;
      const tipKey = `farm-mob-${mtype}`;
      const handlers = cooltipHandlers(tipKey, () =>
        mobCooltipHtml(stats, mtype),
      );
      return e(
        "button",
        {
          key: mtype,
          type: "button",
          className: "ecu-farm__chip",
          style: { ...PIXEL_TEXT, direction: "ltr" },
          "aria-label": mtype,
          onClick: () => {
            setTab("kills");
            setDetails(true);
          },
          onMouseEnter: handlers.onMouseEnter,
          onMouseMove: handlers.onMouseMove,
          onMouseLeave: handlers.onMouseLeave,
        },
        e(
          "span",
          { className: "ecu-farm__portrait" },
          wrapIconHtml(monsterSprite(mtype, { size: 18 })),
        ),
        rate != null
          ? e(
              "span",
              { className: "ecu-farm__rate" },
              fmtRate(rate),
              e("span", { className: "u" }, "/m"),
            )
          : null,
        drop
          ? e(ItemInstance, {
              name: drop.name,
              q: drop.q,
              size: 20,
              // Stock art without nested item_container border (chip is the tile).
              bare: true,
              // Chip already owns the mob cooltip — don't nest item tips.
              cooltip: false,
              className: "ecu-farm__chip-drop",
            })
          : null,
      );
    }),
  );

  if (!details) {
    return e(
      "div",
      { className: "ecu-farm ecu-farm--glance", style: PIXEL_TEXT },
      e(
        "div",
        { className: "ecu-farm__glance-head" },
        e(
          "div",
          { className: "ecu-farm__gold-band" },
          goldBar,
          e(
            "button",
            {
              type: "button",
              className: "ecu-farm__open",
              style: PIXEL_TEXT,
              onClick: () => setDetails(true),
            },
            "Details",
          ),
        ),
      ),
      shown.length
        ? chips
        : e(
            "div",
            {
              className: "ecu-farm__empty",
              "data-comm-drag-handle": "true",
              style: PIXEL_TEXT,
            },
            "No farm nearby",
          ),
      overflow > 0
        ? e(
            "button",
            {
              type: "button",
              className: "ecu-farm__more",
              style: PIXEL_TEXT,
              onClick: () => {
                setTab("kills");
                setDetails(true);
              },
            },
            `+${overflow}`,
          )
        : null,
    );
  }

  const kpi = (v: string, l: string, tone?: "gold" | "mute") =>
    e(
      "div",
      {
        className:
          "ecu-farm__kpi" + (tone === "gold" ? " ecu-farm__kpi--gold" : ""),
      },
      e(
        "div",
        {
          className:
            "ecu-farm__kpi-v" +
            (tone === "gold"
              ? " ecu-farm__kpi-v--gold"
              : tone === "mute"
                ? " ecu-farm__kpi-v--mute"
                : ""),
          style: PIXEL_TEXT,
        },
        v,
      ),
      e("div", { className: "ecu-farm__kpi-l", style: PIXEL_TEXT }, l),
    );

  const killSeries = stats.byMtype.length
    ? stats.byMtype[0].killsPerMinute != null
      ? stats.goldSeries.length
        ? stats.goldSeries.map((_, i) => {
            // Approximate pace series from total rate when we lack per-tick kills.
            const base = stats.killsPerMinute || 0;
            return Math.max(0, base * (0.85 + (i % 5) * 0.04));
          })
        : [stats.killsPerMinute || 0]
      : [0]
    : [0];

  let body: any = null;
  if (tab === "overview") {
    body = e(
      React.Fragment,
      null,
      e(
        "div",
        { className: "ecu-farm__kpi-row" },
        kpi(
          String(stats.total),
          stats.killsPerMinute != null
            ? `kills · ${fmtRate(stats.killsPerMinute)}/min`
            : "kills",
        ),
        kpi(
          `${fmtCompact(stats.goldGained)}g`,
          stats.goldPerMinute != null
            ? `gold · ${fmtCompact(stats.goldPerMinute)}/min`
            : "gold",
          "gold",
        ),
        kpi(
          stats.lootPerMinute != null ? fmtLootRate(stats.lootPerMinute) : "—",
          "loot /min",
        ),
        kpi(
          stats.goldPerKill != null ? stats.goldPerKill.toFixed(1) : "—",
          "gold / kill",
        ),
      ),
      e(
        "div",
        { className: "ecu-farm__signal" },
        e(
          "div",
          null,
          "Downtime ",
          e(
            "b",
            {
              className:
                (stats.downtimePct || 0) > 20 ? "ecu-farm__warn" : "ecu-farm__ok",
            },
            stats.downtimePct != null ? `${stats.downtimePct}%` : "—",
          ),
        ),
        e(
          "div",
          null,
          "Nearby ",
          e(
            "b",
            null,
            nearby.length
              ? overflow > 0
                ? `${nearby.length}+`
                : String(nearby.length)
              : "—",
          ),
        ),
      ),
      stats.goldSeries.length ||
        (stats.killsPerMinute != null && stats.killsPerMinute > 0)
        ? e(
            "div",
            { className: "ecu-farm__charts" },
            e(
              "div",
              { className: "ecu-farm__chart" },
              e("h3", null, "Kills / min"),
              chartSvg(killSeries, "#c8c8c8"),
            ),
            e(
              "div",
              { className: "ecu-farm__chart" },
              e("h3", null, "Gold / min"),
              chartSvg(
                stats.goldSeries.length ? stats.goldSeries : [0],
                "#e8c96a",
              ),
            ),
          )
        : null,
    );
  } else if (tab === "kills") {
    body = e(
      "table",
      { className: "ecu-farm__table" },
      e(
        "thead",
        null,
        e(
          "tr",
          null,
          e("th", null, ""),
          e("th", null, "Monster"),
          e("th", { className: "num" }, "/min"),
          e("th", { className: "num" }, "avg"),
          e("th", { className: "num" }, "count"),
        ),
      ),
      e(
        "tbody",
        null,
        ...stats.byMtype.slice(0, 12).map((row) =>
          e(
            "tr",
            { key: row.mtype },
            e("td", null, wrapIconHtml(monsterSprite(row.mtype, { size: 18 }))),
            e(
              "td",
              null,
              monsterDisplayName(row.mtype) || row.mtype,
            ),
            e(
              "td",
              { className: "num" },
              row.killsPerMinute != null ? fmtRate(row.killsPerMinute) : "—",
            ),
            e(
              "td",
              { className: "num ecu-farm__avg" },
              row.avgIntervalSec != null
                ? `${Math.max(1, Math.round(row.avgIntervalSec))}s`
                : "—",
            ),
            e("td", { className: "num" }, row.count),
          ),
        ),
      ),
    );
  } else if (tab === "gold") {
    body = e(
      React.Fragment,
      null,
      e(
        "div",
        { className: "ecu-farm__kpi-row" },
        kpi(`${fmtCompact(stats.goldGained)}g`, "session", "gold"),
        kpi(
          stats.goldPerMinute != null ? fmtCompact(stats.goldPerMinute) : "—",
          "/min",
          "gold",
        ),
        kpi(
          stats.goldPerHour != null ? fmtCompact(stats.goldPerHour) : "—",
          "/h",
          "mute",
        ),
        kpi(
          stats.goldPerKill != null ? stats.goldPerKill.toFixed(1) : "—",
          "g/kill",
        ),
      ),
      stats.goldSeries.length
        ? e(
            "div",
            { className: "ecu-farm__chart ecu-farm__chart--gold" },
            e("h3", null, "Gold / min trend"),
            chartSvg(stats.goldSeries, "#e8c96a"),
          )
        : e(
            "div",
            { className: "ecu-farm__sub", style: PIXEL_TEXT },
            "Gold spark fills as the watched purse moves.",
          ),
    );
  } else {
    body =
      stats.loot.length === 0
        ? e(
            "div",
            { className: "ecu-farm__sub", style: PIXEL_TEXT },
            "No chest loot this session yet.",
          )
        : e(
            "table",
            { className: "ecu-farm__table" },
            e(
              "thead",
              null,
              e(
                "tr",
                null,
                e("th", null, "Item"),
                e("th", { className: "num" }, "/min"),
              ),
            ),
            e(
              "tbody",
              null,
              ...stats.loot.slice(0, 16).map((row) =>
                e(
                  "tr",
                  { key: row.name },
                  e(
                    "td",
                    null,
                    e(
                      "div",
                      { className: "ecu-farm__loot-row" },
                      e(ItemInstance, {
                        name: row.name,
                        size: 28,
                        cooltip: true,
                      }),
                      e(
                        "span",
                        { className: "ecu-farm__loot-meta" },
                        e(
                          "span",
                          null,
                          `${itemDisplayName(row.name) || row.name} · ×${row.q}`,
                        ),
                      ),
                    ),
                  ),
                  e(
                    "td",
                    { className: "num" },
                    row.perMin != null ? `${fmtLootRate(row.perMin)}/m` : "—",
                  ),
                ),
              ),
            ),
          );
  }

  const tabs: FarmTab[] = ["overview", "kills", "gold", "loot"];
  return e(
    "div",
    { className: "ecu-farm is-details", style: PIXEL_TEXT },
    detailsTitle,
    e(
      "div",
      { className: "ecu-farm__tabs" },
      ...tabs.map((t) =>
        e(
          "button",
          {
            key: t,
            type: "button",
            className: "ecu-farm__tab" + (tab === t ? " is-on" : ""),
            style: PIXEL_TEXT,
            onClick: () => setTab(t),
          },
          t[0].toUpperCase() + t.slice(1),
        ),
      ),
    ),
    tab === "overview"
      ? e(
          "div",
          { className: "ecu-farm__sub", style: PIXEL_TEXT },
          "Session · Reset clears kills + farm gold/loot",
        )
      : null,
    e("div", { className: "ecu-farm__body" }, body),
    e(
      "div",
      { className: "ecu-farm__actions" },
      e(
        "button",
        {
          type: "button",
          className: "ecu-farm__btn",
          style: PIXEL_TEXT,
          onClick: () => {
            resetFarmSession();
            bump((n: number) => n + 1);
          },
        },
        "Reset",
      ),
    ),
  );
}

/** Persist glance layout prefs (grow / cols / rows). */
export function saveFarmGlanceLayout(partial: {
  farmGlanceGrow?: FarmGlanceGrow;
  farmGlanceCols?: number;
  farmGlanceRows?: number;
}): void {
  saveSettings(partial);
}
