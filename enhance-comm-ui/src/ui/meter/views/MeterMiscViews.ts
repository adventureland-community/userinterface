import { getReact, e } from "../../../host/react";
import { formatCompactNumber, formatCompactRate } from "../../../lib/format";
import { MetricChart } from "../../chrome/MetricChart";
import type { PartyFocus } from "../../../lib/settingsFocus";
import { PIXEL_TEXT, TYPE } from "../../../lib/typeScale";
import { getMeterAppearance } from "../../../meters/meterAppearance";
import {
  getPlayerMeta,
  getYouId,
  resolveSegment,
} from "../../../meters/meterEngine";
import { skillIconHtml } from "../../../meters/meterIcons";
import { runMeterQuery } from "../../../meters/meterQuery";
import type {
  ActorAgg,
  DeathSnapshot,
  MeterResult,
  OutcomeCounts,
  RankedRow,
  SegmentRef,
} from "../../../meters/meterTypes";
import { injectMeterChromeCss } from "../meterChromeCss";
import { MeterBarsView } from "../MeterBarRow";

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

const DEBUFF_CONDITION_KEYS = new Set([
  "cursed",
  "burned",
  "poisoned",
  "weakness",
  "frozen",
  "stunned",
  "slowed",
]);

function conditionKind(key: string): "buff" | "debuff" {
  return DEBUFF_CONDITION_KEYS.has(key) ? "debuff" : "buff";
}

function buildActorNameMap(segmentRef?: SegmentRef): Record<string, string> {
  const map: Record<string, string> = {};
  const meta = getPlayerMeta();
  const metaIds = Object.keys(meta);
  for (let i = 0; i < metaIds.length; i++) {
    const id = metaIds[i];
    map[id] = meta[id].name;
  }
  const seg = resolveSegment(segmentRef);
  if (seg) {
    const actorIds = Object.keys(seg.actors);
    for (let i = 0; i < actorIds.length; i++) {
      const a = seg.actors[actorIds[i]];
      map[a.id] = a.name || map[a.id] || a.id;
    }
  }
  return map;
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

function sameCtypePeers(
  segmentRef: SegmentRef,
  actorId: string,
  ctype?: string,
): ActorAgg[] {
  if (!ctype) return [];
  const seg = resolveSegment(segmentRef);
  if (!seg) return [];
  const peers: ActorAgg[] = [];
  const ids = Object.keys(seg.actors);
  for (let i = 0; i < ids.length; i++) {
    const a = seg.actors[ids[i]];
    if (a.ctype !== ctype) continue;
    if (!getPlayerMeta()[a.id] && !a.damage && !a.heal && !a.taken) continue;
    peers.push(a);
  }
  peers.sort((a, b) => b.damage - a.damage);
  if (peers.length <= 1) return peers;
  const you = getYouId();
  const selfIdx = peers.findIndex((p) => p.id === actorId);
  if (selfIdx > 0) {
    const self = peers.splice(selfIdx, 1)[0];
    peers.unshift(self);
  } else if (you) {
    const youIdx = peers.findIndex((p) => p.id === you);
    if (youIdx > 1) {
      const row = peers.splice(youIdx, 1)[0];
      peers.splice(1, 0, row);
    }
  }
  return peers;
}

function DeathSourceBar(props: {
  ability: string;
  amount: number;
  pct: number;
}): any {
  const React = getReact();
  const iconRef = React.useRef(null as HTMLSpanElement | null);
  React.useEffect(() => {
    if (!iconRef.current) return;
    iconRef.current.innerHTML = skillIconHtml(props.ability, 14);
  }, [props.ability]);
  return e(
    "div",
    { className: "ecu-meter-death-source" },
    e("span", { ref: iconRef, className: "ecu-meter-death-source-icon" }),
    e("span", { className: "ecu-meter-death-source-name" }, props.ability),
    e(
      "span",
      { className: "ecu-meter-death-source-bar" },
      e("span", {
        className: "ecu-meter-death-source-fill",
        style: { width: `${Math.round(props.pct * 100)}%` },
      }),
    ),
    e("span", { className: "ecu-meter-death-source-amt" }, formatCompactNumber(props.amount)),
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
  const amt = heal ? `+${formatCompactNumber(Math.abs(h.damage))}` : `−${formatCompactNumber(h.damage)}`;
  const lifePct =
    props.showLifePct && props.hpLog
      ? lifePctAtHit(props.hpLog, h.at)
      : null;
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = `${skillIconHtml(h.source || "attack", 14)} ${h.source || "attack"}${h.actor ? ` <span class="ecu-meter-death-hit-actor">${h.actor}</span>` : ""}`;
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

const OC_COLORS: Record<string, string> = {
  hits: "#90caf9",
  crits: "#ef5350",
  miss: "#b0bec5",
  evade: "#80cbc4",
  avoid: "#ce93d8",
  kills: "#e57373",
};

function outcomeRows(outcomes: OutcomeCounts): Array<[string, number, string]> {
  return [
    ["hits", outcomes.hits, OC_COLORS.hits],
    ["crits", outcomes.crits, OC_COLORS.crits],
    ["miss", outcomes.miss, OC_COLORS.miss],
    ["evade", outcomes.evade, OC_COLORS.evade],
    ["avoid", outcomes.avoid, OC_COLORS.avoid],
    ["kills", outcomes.kills, OC_COLORS.kills],
  ].filter(([, c]) => c > 0) as Array<[string, number, string]>;
}

function OutcomeTable(props: {
  outcomes: OutcomeCounts;
  swatches?: boolean;
}): any {
  const rows = outcomeRows(props.outcomes);
  let sum = 0;
  for (let i = 0; i < rows.length; i++) sum += rows[i][1];
  if (!sum) sum = 1;
  return e(
    "table",
    { className: "ecu-meter-outcome" },
    e(
      "thead",
      null,
      e(
        "tr",
        null,
        e("th", null, "Type"),
        e("th", null, "Count"),
        e("th", null, "%"),
      ),
    ),
    e(
      "tbody",
      null,
      ...rows.map(([name, count, color]) =>
        e(
          "tr",
          { key: name },
          e(
            "td",
            null,
            props.swatches
              ? e("span", {
                  style: {
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    background: color,
                    marginRight: 6,
                  },
                })
              : null,
            name,
          ),
          e("td", null, String(count)),
          e("td", null, `${((count / sum) * 100).toFixed(0)}%`),
        ),
      ),
    ),
  );
}

/** Details Player Breakdown — Spells / Targets / Summary (no hit-tag rollup). */
export function MeterDetailsView(props: {
  result: MeterResult;
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  selectedAbility?: string | null;
  onSelectAbility?: (ability: string) => void;
  onSelectActor?: (actorId: string, name: string) => void;
}): any {
  const React = getReact();
  const [tab, setTab] = React.useState("spells");

  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  const isDetails = props.result.kind === "details";
  const r = isDetails ? props.result : null;
  const abilityKey = props.selectedAbility || (r ? r.ability : undefined);

  if (!r) {
    return e(
      "div",
      { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
      "Pick a player (or open Inspector after combat)",
    );
  }

  const sec = Math.max(r.durationMs / 1000, 1);

  const tabs = [
    { id: "spells", label: "Spells" },
    { id: "targets", label: "Targets" },
    { id: "auras", label: "Auras" },
    { id: "compare", label: "Compare" },
    { id: "summary", label: "Summary" },
  ];

  const onSpellClick = (row: RankedRow) => {
    if (props.onSelectAbility) props.onSelectAbility(row.id);
    setTab("targets");
  };

  let body: any = null;
  if (tab === "spells") {
    body = e(MeterBarsView, {
      query: { kind: "abilities", actorId: r.actorId, metric: "damage" },
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
      live: false,
      selectedRowId: props.selectedAbility || undefined,
      onRowClick: onSpellClick,
    });
  } else if (tab === "targets") {
    const ab = abilityKey || r.abilityRows[0]?.id;
    body = ab
      ? e(MeterBarsView, {
          query: {
            kind: "ability_targets",
            actorId: r.actorId,
            ability: ab,
            metric: "damage",
          },
          segmentRef: props.segmentRef,
          partyFocus: props.partyFocus,
          live: false,
        })
      : e(MeterBarsView, {
          query: { kind: "targets", actorId: r.actorId, metric: "damage" },
          segmentRef: props.segmentRef,
          partyFocus: props.partyFocus,
          live: false,
        });
  } else if (tab === "auras") {
    body = e(
      "div",
      { className: "ecu-meter-inspector-summary", style: { ...PIXEL_TEXT } },
      e("div", { className: "sec-h" }, "Buff / condition uptime"),
      e(UptimeTable, { rows: r.uptimeRows || [] }),
    );
  } else if (tab === "compare") {
    const peers = sameCtypePeers(props.segmentRef, r.actorId, r.ctype);
    body =
      peers.length > 1
        ? e(
            "div",
            { className: "ecu-meter-inspector-compare" },
            ...peers.map((p) => {
              const secPeer = Math.max(r.durationMs / 1000, 1);
              const isSelf = p.id === r.actorId;
              return e(
                "div",
                {
                  key: p.id,
                  className:
                    "ecu-meter-inspector-compare-col" +
                    (isSelf ? " is-you" : ""),
                },
                e(
                  "div",
                  { className: "ecu-meter-inspector-compare-h" },
                  p.name,
                  isSelf ? " (you)" : "",
                ),
                e(
                  "div",
                  { className: "ecu-meter-inspector-compare-stat" },
                  "Damage",
                  e("b", null, formatCompactNumber(p.damage)),
                ),
                e(
                  "div",
                  { className: "ecu-meter-inspector-compare-stat" },
                  "DPS",
                  e("b", null, formatCompactRate(p.damage / secPeer)),
                ),
                e(
                  "div",
                  { className: "ecu-meter-inspector-compare-stat" },
                  "Taken",
                  e("b", null, formatCompactNumber(p.taken)),
                ),
                e(
                  "div",
                  { className: "ecu-meter-inspector-compare-stat" },
                  "Heal",
                  e("b", null, formatCompactNumber(p.heal)),
                ),
                e(
                  "div",
                  { className: "ecu-meter-inspector-compare-stat" },
                  "HPS",
                  e("b", null, formatCompactRate(p.heal / secPeer)),
                ),
              );
            }),
          )
        : e(
            "div",
            { style: { padding: 8, color: "#888", ...PIXEL_TEXT } },
            r.ctype
              ? "No other players with the same class in this segment"
              : "Class unknown — compare needs ctype",
          );
  } else {
    body = e(
      "div",
      { className: "ecu-meter-inspector-summary", style: { ...PIXEL_TEXT } },
      e(
        "div",
        { className: "stat-grid" },
        e("div", null, "Damage ", e("b", null, formatCompactNumber(r.totals.damage))),
        e("div", null, "DPS ", e("b", null, formatCompactRate(r.totals.damage / sec))),
        e("div", null, "Taken ", e("b", null, formatCompactNumber(r.totals.taken))),
        e("div", null, "Heal ", e("b", null, formatCompactNumber(r.totals.heal))),
        e("div", null, "HPS ", e("b", null, formatCompactRate(r.totals.heal / sec))),
        e(
          "div",
          null,
          "Heal Req ",
          e("b", null, formatCompactNumber(r.totals.healingRequired)),
        ),
        e("div", null, "Deaths ", e("b", null, String(r.deaths))),
      ),
      e(
        "div",
        { className: "sec-h" },
        props.selectedAbility
          ? `${props.selectedAbility} — outcomes`
          : "Outcomes",
      ),
      e(OutcomeTable, { outcomes: r.outcomes }),
      r.uptimeRows && r.uptimeRows.length
        ? e(
            "div",
            null,
            e("div", { className: "sec-h" }, "Uptime"),
            e(UptimeTable, { rows: r.uptimeRows }),
          )
        : null,
    );
  }

  return e(
    "div",
    { className: "ecu-meter-inspector" },
    e(
      "div",
      { className: "ecu-meter-inspector-body" },
      tab === "targets" && props.selectedAbility
        ? e(
            "div",
            { className: "ecu-meter-inspector-spell" },
            props.selectedAbility,
            r.abilitySplash > 0
              ? ` · explosion splash ${formatCompactNumber(r.abilitySplash)}`
              : "",
          )
        : null,
      body,
    ),
    e(
      "div",
      { className: "ecu-meter-inspector-tabs-rail", style: { ...PIXEL_TEXT } },
      ...tabs.map((t) =>
        e(
          "button",
          {
            key: t.id,
            type: "button",
            className: "ecu-meter-player-tab" + (tab === t.id ? " active" : ""),
            onClick: () => setTab(t.id),
          },
          t.label,
        ),
      ),
    ),
  );
}

function UptimeTable(props: {
  rows: Array<{
    id: string;
    name: string;
    uptime: number;
    apps: number;
    activeMs: number;
  }>;
}): any {
  if (!props.rows.length) {
    return e(
      "div",
      { style: { padding: 8, color: "#888", ...PIXEL_TEXT } },
      "No buff / condition samples yet (need entity.s while in combat)",
    );
  }
  return e(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "4px 0",
        ...PIXEL_TEXT,
      },
    },
    ...props.rows.map((row) =>
      e(
        "div",
        {
          key: row.id,
          className: "ecu-meter-uptime-row",
          style: {
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 8,
            padding: "3px 8px",
            alignItems: "center",
            fontSize: 15,
            color: "#c5d0e0",
          },
          title: `${row.name}: ${(row.activeMs / 1000).toFixed(1)}s active`,
        },
        e("span", null, row.name),
        e(
          "b",
          { style: { color: "#fff" } },
          `${(row.uptime * 100).toFixed(0)}%`,
        ),
        e("span", { style: { color: "#8b9bb0" } }, `${row.apps}×`),
      ),
    ),
  );
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
    .sort((a, b) =>
      appearance.deathLogInvert ? b.at - a.at : a.at - b.at,
    );

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

export function MeterEncounterView(props: {
  result: MeterResult;
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  onOpenPlayer?: (id: string, name: string) => void;
}): any {
  const React = getReact();
  const [tab, setTab] = React.useState("summary");
  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  if (props.result.kind !== "encounter") {
    return e("div", { style: pad }, "No encounter");
  }
  const r = props.result;
  const sec = Math.max(r.durationMs / 1000, 1);

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "deaths", label: "Deaths" },
    { id: "interrupts", label: "Interrupts" },
    { id: "dispels", label: "Dispels" },
  ];

  const widgets: Array<{
    key: string;
    title: string;
    query: any;
  }> = [
    {
      key: "dmg",
      title: "Damage Done",
      query: { kind: "players", metric: "damage", primary: "total" },
    },
    {
      key: "dps",
      title: "DPS",
      query: { kind: "players", metric: "damage", primary: "rate" },
    },
    {
      key: "taken",
      title: "Damage Taken",
      query: { kind: "players", metric: "taken", primary: "total" },
    },
    {
      key: "heal",
      title: "Healing Done",
      query: { kind: "players", metric: "heal", primary: "total" },
    },
    {
      key: "hr",
      title: "Healing Required",
      query: { kind: "players", metric: "healing_required", primary: "total" },
    },
    {
      key: "av",
      title: "Avoidance",
      query: { kind: "avoidance" },
    },
  ];

  const deathResult = runMeterQuery(
    { kind: "death_log" },
    {
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
    },
  );

  let body: any = null;
  if (tab === "summary") {
    body = e(
      "div",
      null,
      e(
        "div",
        { className: "ecu-meter-encounter-stats", style: { ...PIXEL_TEXT } },
        e("span", null, `${sec.toFixed(0)}s`),
        e("span", null, `${r.deaths} deaths`),
        e("span", null, "Dmg ", e("b", null, formatCompactNumber(r.totalDamage))),
        e("span", null, "DPS ", e("b", null, `${formatCompactNumber(r.totalDamage / sec)}/s`)),
        e("span", null, "Heal ", e("b", null, formatCompactNumber(r.totalHeal))),
        e("span", null, "HPS ", e("b", null, `${formatCompactNumber(r.totalHeal / sec)}/s`)),
        r.topDps
          ? e("span", { style: { color: "#e88" } }, `Top ${r.topDps.name}`)
          : null,
      ),
      e(
        "div",
        { className: "ecu-meter-encounter-grid" },
        ...widgets.map((w) =>
          e(
            "div",
            { key: w.key, className: "ecu-meter-encounter-widget" },
            e("div", { className: "ecu-meter-encounter-widget-h" }, w.title),
            e(
              "div",
              { className: "ecu-meter-encounter-widget-body" },
              e(MeterBarsView, {
                query: w.query,
                segmentRef: props.segmentRef,
                partyFocus: props.partyFocus,
                live: false,
                onRowContextMenu: props.onOpenPlayer
                  ? (row: RankedRow) => props.onOpenPlayer!(row.id, row.name)
                  : undefined,
                onRowClick: props.onOpenPlayer
                  ? (row: RankedRow) => props.onOpenPlayer!(row.id, row.name)
                  : undefined,
              }),
            ),
          ),
        ),
        e(
          "div",
          { className: "ecu-meter-encounter-widget" },
          e("div", { className: "ecu-meter-encounter-widget-h" }, "Death Log"),
          e(
            "div",
            { className: "ecu-meter-encounter-widget-body" },
            deathResult.kind === "death_log" && deathResult.deaths.length
              ? e(
                  "div",
                  { style: { padding: "4px 6px", ...PIXEL_TEXT } },
                  ...deathResult.deaths.slice(0, 8).map((d, i) =>
                    e(
                      "div",
                      {
                        key: `${d.id}-${d.at}`,
                        style: {
                          padding: "3px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          fontSize: 11,
                          color: "#c5d0e0",
                        },
                      },
                      e("b", { style: { color: "#ef9a9a" } }, d.name),
                      ` · #${i + 1} · ${new Date(d.at).toLocaleTimeString()}`,
                    ),
                  ),
                )
              : e(
                  "div",
                  { style: { padding: 8, color: "#888", fontSize: 11 } },
                  "No deaths",
                ),
          ),
        ),
      ),
    );
  } else if (tab === "deaths") {
    body =
      deathResult.kind === "death_log"
        ? e(MeterDeathView, { result: deathResult })
        : e("div", { style: pad }, "No deaths");
  } else if (tab === "interrupts") {
    body = e(MeterBarsView, {
      query: { kind: "misc", metric: "interrupts" },
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
      live: false,
      onRowClick: props.onOpenPlayer
        ? (row: RankedRow) => props.onOpenPlayer!(row.id, row.name)
        : undefined,
    });
  } else {
    body = e(MeterBarsView, {
      query: { kind: "misc", metric: "dispels" },
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
      live: false,
      onRowClick: props.onOpenPlayer
        ? (row: RankedRow) => props.onOpenPlayer!(row.id, row.name)
        : undefined,
    });
  }

  return e(
    "div",
    { className: "ecu-meter-encounter", style: { ...PIXEL_TEXT } },
    e(
      "div",
      { className: "ecu-meter-encounter-tabs" },
      ...tabs.map((t) =>
        e(
          "button",
          {
            key: t.id,
            type: "button",
            className:
              "ecu-meter-encounter-tab" + (tab === t.id ? " active" : ""),
            onClick: () => setTab(t.id),
          },
          t.label,
        ),
      ),
    ),
    e("div", { className: "ecu-meter-encounter-body" }, body),
  );
}

export function MeterTimelineView(props: {
  result: MeterResult;
  segmentRef?: SegmentRef;
}): any {
  const React = getReact();
  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  if (props.result.kind !== "timeline") {
    return e("div", { style: pad }, "No timeline");
  }
  const { casts, conditions, durationMs } = props.result;
  const durSec = Math.max(durationMs / 1000, 1);
  const nameMap = buildActorNameMap(props.segmentRef);
  const seg = resolveSegment(props.segmentRef);
  const deaths = seg ? seg.deaths : [];

  let start = Date.now();
  for (let i = 0; i < conditions.length; i++) {
    start = Math.min(start, conditions[i].startedAt);
  }
  for (let i = 0; i < casts.length; i++) {
    start = Math.min(start, casts[i].at);
  }
  if (seg && seg.startedAt) start = Math.min(start, seg.startedAt);

  const lanes: Record<
    string,
    Array<{
      left: number;
      width: number;
      label: string;
      color: string;
      kind: "bar" | "death";
    }>
  > = {};

  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    if (filter === "cds") continue;
    const ck = conditionKind(c.key);
    if (filter === "buffs" && ck !== "buff") continue;
    if (filter === "debuffs" && ck !== "debuff") continue;
    const key = c.actorId;
    if (!lanes[key]) lanes[key] = [];
    const t0 = (c.startedAt - start) / 1000;
    const t1 = ((c.endedAt || Date.now()) - start) / 1000;
    lanes[key].push({
      left: (t0 / durSec) * 100,
      width: Math.max(0.8, ((t1 - t0) / durSec) * 100),
      label: c.key,
      color: ck === "debuff" ? "#ab47bc" : "#5c6bc0",
      kind: "bar",
    });
  }
  for (let i = 0; i < casts.length; i++) {
    const c = casts[i];
    if (filter === "buffs" || filter === "debuffs") continue;
    const key = c.actorId;
    if (!lanes[key]) lanes[key] = [];
    const t0 = (c.at - start) / 1000;
    lanes[key].push({
      left: (t0 / durSec) * 100,
      width: 1.2,
      label: c.source,
      color: "#ffb74d",
      kind: "bar",
    });
  }
  for (let i = 0; i < deaths.length; i++) {
    const d = deaths[i];
    const key = d.id;
    if (!lanes[key]) lanes[key] = [];
    const t0 = (d.at - start) / 1000;
    lanes[key].push({
      left: (t0 / durSec) * 100,
      width: 0,
      label: `${d.name} died`,
      color: "#e53935",
      kind: "death",
    });
  }
  const laneIds = Object.keys(lanes);
  const filterTabs = ["all", "buffs", "debuffs", "cds"];

  return e(
    "div",
    { className: "ecu-meter-timeline", style: { ...PIXEL_TEXT } },
    e(
      "div",
      { className: "ecu-meter-timeline-tools" },
      ...filterTabs.map((f) =>
        e(
          "button",
          {
            key: f,
            type: "button",
            className: "ecu-meter-tab" + (filter === f ? " active" : ""),
            onClick: () => setFilter(f),
          },
          f,
        ),
      ),
      e(
        "span",
        { className: "ecu-meter-timeline-meta" },
        `${durSec.toFixed(0)}s`,
        deaths.length ? ` · ${deaths.length} deaths` : "",
      ),
    ),
    e(
      "div",
      { className: "ecu-meter-timeline-scroll" },
      ...laneIds.slice(0, 12).map((id) =>
        e(
          "div",
          { key: id, className: "ecu-meter-timeline-lane" },
          e(
            "div",
            {
              className: "ecu-meter-timeline-name",
              title: nameMap[id] || id,
            },
            nameMap[id] || id,
          ),
          e(
            "div",
            { className: "ecu-meter-timeline-track" },
            ...lanes[id].map((bar, bi) =>
              bar.kind === "death"
                ? e("div", {
                    key: bi,
                    className: "ecu-meter-timeline-death",
                    title: bar.label,
                    style: {
                      left: `${Math.min(99, Math.max(0, bar.left))}%`,
                    },
                  })
                : e("div", {
                    key: bi,
                    className: "ecu-meter-timeline-bar",
                    title: bar.label,
                    style: {
                      left: `${Math.min(99, Math.max(0, bar.left))}%`,
                      width: `${Math.min(100, bar.width)}%`,
                      background: bar.color,
                    },
                  }),
            ),
          ),
        ),
      ),
    ),
  );
}
