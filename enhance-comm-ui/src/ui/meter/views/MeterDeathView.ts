import { getReact, e } from "../../../host/react";
import { formatCompactNumber } from "../../../lib/format";
import { skillDisplayName, skillIconHtml } from "../../../lib/gameIcon";
import { MetricChart } from "../../chrome/MetricChart";
import { GameIcon } from "../../chrome/GameIcon";
import { PIXEL_TEXT, TYPE } from "../../../lib/typeScale";
import { getMeterAppearance } from "../../../meters/meterAppearance";
import type { DeathSnapshot, MeterResult } from "../../../meters/meterTypes";
import { injectMeterChromeCss } from "../meterChromeCss";

const pad = {
  padding: "8px",
  color: "#888",
  fontSize: TYPE.body,
  ...PIXEL_TEXT,
};

function fmtRelSec(deathAt: number, hitAt: number): string {
  const d = (hitAt - deathAt) / 1000;
  const sign = d <= 0 ? "" : "+";
  return `${sign}${d.toFixed(1)}s`;
}

function lifePctAtHit(
  hpLog: DeathSnapshot["hpLog"],
  hitAt: number,
): number | null {
  if (!hpLog.length) return null;
  let best = hpLog[0];
  for (let i = 0; i < hpLog.length; i++) {
    const sample = hpLog[i];
    if (sample.at <= hitAt) best = sample;
  }
  if (!(best.maxHp > 0)) return null;
  return Math.round((best.hp / best.maxHp) * 100);
}

function DeathSourceBar(props: {
  ability: string;
  amount: number;
  pct: number;
}): any {
  return e(
    "div",
    { className: "ecu-meter-death-source" },
    e(GameIcon, {
      id: props.ability,
      kind: "auto",
      size: 14,
      className: "ecu-meter-death-source-icon",
      title: skillDisplayName(props.ability),
    }),
    e(
      "span",
      { className: "ecu-meter-death-source-name" },
      skillDisplayName(props.ability),
    ),
    e(
      "span",
      { className: "ecu-meter-death-source-bar" },
      e("span", {
        className: "ecu-meter-death-source-fill",
        style: { width: `${Math.round(props.pct * 100)}%` },
      }),
    ),
    e(
      "span",
      { className: "ecu-meter-death-source-amt" },
      formatCompactNumber(props.amount),
    ),
  );
}

function DeathHitRow(props: {
  hit: {
    at: number;
    actor?: string;
    damage: number;
    source?: string;
  };
  deathAt: number;
  showLifePct?: boolean;
  hpLog?: DeathSnapshot["hpLog"];
}): any {
  const React = getReact();
  const ref = React.useRef(null as HTMLSpanElement | null);
  const h = props.hit;
  const heal = h.damage < 0 || h.source === "heal";
  const amt = heal
    ? `+${formatCompactNumber(Math.abs(h.damage))}`
    : `−${formatCompactNumber(h.damage)}`;
  const lifePct =
    props.showLifePct && props.hpLog ? lifePctAtHit(props.hpLog, h.at) : null;
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = `${skillIconHtml(h.source || "attack", 14)} ${skillDisplayName(h.source || "attack")}${h.actor ? ` <span class="ecu-meter-death-hit-actor">${h.actor}</span>` : ""}`;
  }, [h.source, h.actor]);
  return e(
    "div",
    {
      className:
        "ecu-meter-death-hit" +
        (heal ? " is-heal" : " is-dmg") +
        (lifePct != null ? " has-life" : ""),
    },
    e(
      "span",
      { className: "ecu-meter-death-hit-rel" },
      fmtRelSec(props.deathAt, h.at),
    ),
    e("span", { ref, className: "ecu-meter-death-hit-src" }),
    e("span", { className: "ecu-meter-death-hit-amt" }, amt),
    lifePct != null
      ? e("span", { className: "ecu-meter-death-hit-life" }, `${lifePct}%`)
      : null,
  );
}

function useDeathChartWidth(fallback = 320): {
  ref: { current: HTMLDivElement | null };
  width: number;
} {
  const React = getReact();
  const ref = React.useRef(null as HTMLDivElement | null);
  const [width, setWidth] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setWidth(Math.max(120, Math.floor(el.clientWidth - 4)));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function MeterDeathView(props: { result: MeterResult }): any {
  const React = getReact();
  const [sel, setSel] = React.useState(0);
  const [filter, setFilter] = React.useState(
    "all" as "all" | "damage" | "heal",
  );
  const chartWrap = useDeathChartWidth();
  const appearance = getMeterAppearance();

  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  if (props.result.kind !== "death_log") {
    return e("div", { style: pad }, "No deaths");
  }
  const deaths = props.result.deaths;
  if (!deaths.length) return e("div", { style: pad }, "No deaths yet");
  const idx = Math.min(sel, deaths.length - 1);
  const d = deaths[idx];

  const killers: Record<string, number> = {};
  for (let i = 0; i < d.recentHits.length; i++) {
    const h = d.recentHits[i];
    if (!(h.damage > 0)) continue;
    const key = h.source || h.actor || "unknown";
    killers[key] = (killers[key] || 0) + h.damage;
  }
  const killerList = Object.keys(killers)
    .map((k) => ({ key: k, amount: killers[k] }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
  const killerMax =
    killerList.length > 0
      ? killerList.reduce((m, k) => Math.max(m, k.amount), 0)
      : 1;

  const hpSeries = [
    {
      label: "HP",
      color: "#e53935",
      values: d.hpLog.map((h) => (h.maxHp > 0 ? (h.hp / h.maxHp) * 100 : h.hp)),
    },
  ];

  const relevanceMs = Math.max(appearance.deathLogRelevanceSec, 1) * 1000;

  const filteredHits = d.recentHits.filter((h) => {
    const delta = d.at - h.at;
    if (delta < 0 || delta > relevanceMs) return false;
    const heal = h.damage < 0 || h.source === "heal";
    if (filter === "damage") return !heal && h.damage > 0;
    if (filter === "heal") return heal;
    return true;
  });
  const logHits = filteredHits
    .slice()
    .sort((a, b) => (appearance.deathLogInvert ? b.at - a.at : a.at - b.at));

  const killerLabel =
    d.killerId && killerList.length ? killerList[0].key : d.killerId || null;

  const filterTabs = [
    { id: "all" as const, label: "All" },
    { id: "damage" as const, label: "Damage" },
    { id: "heal" as const, label: "Heals" },
  ];

  return e(
    "div",
    { className: "ecu-meter-death", style: { ...PIXEL_TEXT } },
    e(
      "div",
      { className: "ecu-meter-death-side" },
      ...deaths.map((row, i) =>
        e(
          "button",
          {
            key: `${row.id}-${row.at}`,
            type: "button",
            className: i === idx ? "active" : "",
            onClick: () => setSel(i),
          },
          e("span", { className: "ecu-meter-death-side-num" }, `#${i + 1}`),
          row.name,
          e(
            "span",
            { className: "ecu-meter-death-side-time" },
            new Date(row.at).toLocaleTimeString(),
          ),
        ),
      ),
    ),
    e(
      "div",
      { className: "ecu-meter-death-main" },
      e(
        "header",
        { className: "ecu-meter-death-hdr" },
        e("div", { className: "ecu-meter-death-victim" }, d.name),
        e(
          "div",
          { className: "ecu-meter-death-meta" },
          `#${idx + 1} · ${new Date(d.at).toLocaleTimeString()}`,
        ),
        killerLabel
          ? e(
              "div",
              { className: "ecu-meter-death-killer" },
              "Killing blow: ",
              e("b", null, killerLabel),
            )
          : null,
      ),
      e(
        "section",
        { className: "ecu-meter-death-chart", ref: chartWrap.ref },
        e("div", { className: "sec-h" }, "Health"),
        e(MetricChart, {
          width: chartWrap.width,
          height: 88,
          series: hpSeries,
          emptyText: "No HP log",
          fill: true,
        }),
      ),
      killerList.length
        ? e(
            "section",
            { className: "ecu-meter-death-sources" },
            e("div", { className: "sec-h" }, "Damage sources"),
            ...killerList.map((k) =>
              e(DeathSourceBar, {
                key: k.key,
                ability: k.key,
                amount: k.amount,
                pct: k.amount / killerMax,
              }),
            ),
          )
        : null,
      e(
        "section",
        { className: "ecu-meter-death-log" },
        e(
          "div",
          { className: "ecu-meter-death-log-hdr" },
          e("div", { className: "sec-h" }, "Events"),
          e(
            "div",
            { className: "ecu-meter-death-filters" },
            ...filterTabs.map((tab) =>
              e(
                "button",
                {
                  key: tab.id,
                  type: "button",
                  className:
                    "ecu-meter-death-filter" +
                    (filter === tab.id ? " active" : ""),
                  onClick: () => setFilter(tab.id),
                },
                tab.label,
              ),
            ),
          ),
        ),
        e(
          "div",
          { className: "ecu-meter-death-log-scroll" },
          logHits.length
            ? logHits.map((h, i) =>
                e(DeathHitRow, {
                  key: `${h.at}-${i}`,
                  hit: h,
                  deathAt: d.at,
                  showLifePct: appearance.deathLogLifePct,
                  hpLog: d.hpLog,
                }),
              )
            : e("div", { className: "ecu-meter-death-log-empty" }, "No events"),
        ),
      ),
    ),
  );
}
