import { getReact, e } from "../../../host/react";
import { formatCompactNumber, formatCompactRate } from "../../../lib/format";
import {
  conditionDisplayName,
  conditionKind,
  skillDisplayName,
  skillIconHtml,
} from "../../../lib/gameIcon";
import { MetricChart } from "../../chrome/MetricChart";
import { GameIcon } from "../../chrome/GameIcon";
import type { PartyFocus } from "../../../lib/settingsFocus";
import { PIXEL_TEXT, TYPE } from "../../../lib/typeScale";
import { getMeterAppearance } from "../../../meters/meterAppearance";
import {
  getPlayerMeta,
  getYouId,
  resolveSegment,
} from "../../../meters/meterEngine";
import { runMeterQuery } from "../../../meters/meterQuery";
import type {
  ActorAgg,
  DeathSnapshot,
  HitAmountStats,
  MeterResult,
  OutcomeCounts,
  RankedRow,
  SegmentRef,
  UptimeRow,
} from "../../../meters/meterTypes";
import { injectMeterChromeCss } from "../meterChromeCss";
import { MeterBarsView } from "../MeterBarRow";
import { MeterBreakdownSideRail } from "../MeterBreakdownSideRail";
import { detailsWindowTitle } from "../meterShellHelpers";
import { classColors } from "../../../lib/colors";

/** Details Compare: peer needs >30% shared spells with primary. */
const COMPARE_SPELL_MATCH_PCT = 30;
const COMPARE_SPELL_ROWS = 12;
const COMPARE_TARGET_ROWS = 9;

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

/** Shared ability overlap % (Details Compare match filter). */
function sharedAbilityPct(primary: ActorAgg, other: ActorAgg): number {
  const keys = Object.keys(primary.abilities);
  if (!keys.length) return 0;
  let same = 0;
  for (let i = 0; i < keys.length; i++) {
    if (other.abilities[keys[i]]) same += 1;
  }
  return (same / keys.length) * 100;
}

/**
 * Details Compare peer pick: same ctype + >30% shared abilities.
 * Returns primary first, then up to 2 peers (by metric total).
 */
function comparePeerActors(
  segmentRef: SegmentRef,
  actorId: string,
  ctype: string | undefined,
  metric: "damage" | "heal" | "taken",
): { primary: ActorAgg | null; peers: ActorAgg[] } {
  const all = sameCtypePeers(segmentRef, actorId, ctype);
  const primary = all.find((a) => a.id === actorId) || all[0] || null;
  if (!primary) return { primary: null, peers: [] };
  const scored: Array<{ a: ActorAgg; total: number }> = [];
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    if (a.id === primary.id) continue;
    if (sharedAbilityPct(primary, a) <= COMPARE_SPELL_MATCH_PCT) continue;
    scored.push({ a, total: actorMetricTotal(a, metric) });
  }
  scored.sort((x, y) => y.total - x.total);
  const peers: ActorAgg[] = [];
  for (let i = 0; i < scored.length && peers.length < 2; i++) {
    peers.push(scored[i].a);
  }
  return { primary, peers };
}

function actorTargetTotals(
  actor: ActorAgg,
  metric: "damage" | "heal" | "taken",
): Array<{
  id: string;
  name: string;
  value: number;
  mtype?: string;
  ctype?: string;
}> {
  const byId: Record<
    string,
    {
      id: string;
      name: string;
      value: number;
      mtype?: string;
      ctype?: string;
    }
  > = {};
  const abKeys = Object.keys(actor.abilities);
  for (let i = 0; i < abKeys.length; i++) {
    const ab = actor.abilities[abKeys[i]];
    const tKeys = Object.keys(ab.targets);
    for (let t = 0; t < tKeys.length; t++) {
      const tg = ab.targets[tKeys[t]];
      let v = 0;
      if (metric === "heal") v = tg.heal;
      else if (metric === "taken") v = 0;
      else v = tg.damage;
      if (!(v > 0)) continue;
      if (!byId[tg.id]) {
        byId[tg.id] = {
          id: tg.id,
          name: tg.name || tg.id,
          value: 0,
          mtype: tg.mtype,
          ctype: tg.ctype,
        };
      }
      byId[tg.id].value += v;
      if (tg.name) byId[tg.id].name = tg.name;
      if (tg.mtype) byId[tg.id].mtype = tg.mtype;
      if (tg.ctype) byId[tg.id].ctype = tg.ctype;
    }
  }
  const rows = Object.keys(byId).map((id) => byId[id]);
  rows.sort((a, b) => b.value - a.value);
  return rows;
}

/** Details peer % vs primary: green + when primary ahead, red − when behind. */
function comparePctLabel(
  primaryVal: number,
  peerVal: number,
): { text: string; tone: "up" | "down" | "flat" } {
  if (primaryVal === 0 && peerVal === 0) {
    return { text: "+0%", tone: "flat" };
  }
  if (primaryVal > peerVal) {
    if (!(peerVal > 0)) return { text: "+999%", tone: "up" };
    const up = Math.min(
      999,
      Math.floor(((primaryVal - peerVal) / peerVal) * 100),
    );
    return { text: `+${up}%`, tone: "up" };
  }
  if (peerVal > primaryVal) {
    if (!(primaryVal > 0)) return { text: "−999%", tone: "down" };
    const down = Math.min(
      999,
      Math.floor(((peerVal - primaryVal) / primaryVal) * 100),
    );
    return { text: `−${down}%`, tone: "down" };
  }
  return { text: "+0%", tone: "flat" };
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

function fmtUptimeTimer(ms: number): string {
  const sec = Math.max(0, ms / 1000);
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function abilityAmount(
  actor: ActorAgg,
  abilityId: string,
  metric: "damage" | "heal" | "taken",
): number {
  const ab = actor.abilities[abilityId];
  if (!ab) return 0;
  if (metric === "heal") return ab.heal;
  if (metric === "taken") return ab.taken;
  return ab.damage;
}

function actorMetricTotal(
  actor: ActorAgg,
  metric: "damage" | "heal" | "taken",
): number {
  if (metric === "heal") return actor.heal;
  if (metric === "taken") return actor.taken;
  return actor.damage;
}

function topAbilityIds(
  actor: ActorAgg,
  metric: "damage" | "heal" | "taken",
  n: number,
): string[] {
  const keys = Object.keys(actor.abilities);
  const scored = keys.map((k) => ({
    id: k,
    v: abilityAmount(actor, k, metric),
  }));
  scored.sort((a, b) => b.v - a.v);
  const out: string[] = [];
  for (let i = 0; i < scored.length && out.length < n; i++) {
    if (scored[i].v > 0) out.push(scored[i].id);
  }
  return out;
}

function SpellBlock(props: {
  className?: string;
  fillPct?: number;
  children: any;
}): any {
  const fill =
    props.fillPct != null
      ? Math.max(0, Math.min(100, props.fillPct))
      : undefined;
  return e(
    "div",
    {
      className:
        "ecu-meter-bd-block" + (props.className ? ` ${props.className}` : ""),
    },
    fill != null
      ? e("div", {
          className: "ecu-meter-bd-block-fill",
          style: { width: `${fill}%` },
        })
      : null,
    e("div", { className: "ecu-meter-bd-block-body" }, props.children),
  );
}

function SpellBlockLine(props: {
  left: any;
  right?: any;
  mutedRight?: boolean;
}): any {
  return e(
    "div",
    { className: "ecu-meter-bd-block-line" },
    e("span", { className: "ecu-meter-bd-block-left" }, props.left),
    props.right != null
      ? e(
          "span",
          {
            className:
              "ecu-meter-bd-block-right" +
              (props.mutedRight ? " ecu-meter-bd-muted" : ""),
          },
          props.right,
        )
      : null,
  );
}

/** AL damage_type label (physical / magical / pure) — not WoW school. */
function formatAlDamageType(type: string | undefined): string {
  if (!type) return "";
  const t = type.toLowerCase();
  if (t === "physical") return "Physical";
  if (t === "magical") return "Magical";
  if (t === "pure") return "Pure";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Details-shaped Min / Max / Average / DPS|HPS lines for a hit amount bucket.
 * DPS = contribution rate (bucket.total / fight seconds) — honest AL math.
 */
function hitAmountBlockLines(
  stats: HitAmountStats,
  sec: number,
  rateLabel: string,
): any[] {
  if (!(stats.count > 0)) {
    return [
      e(
        "div",
        { className: "ecu-meter-bd-block-note" },
        "Min / Max / avg need a new fight (reload after this update)",
      ),
    ];
  }
  const avg = stats.total / stats.count;
  const rate = stats.total / Math.max(sec, 1);
  return [
    e(SpellBlockLine, {
      left: e(
        "span",
        null,
        "Min: ",
        e("b", null, formatCompactNumber(stats.min)),
      ),
      right: e(
        "span",
        null,
        "Max: ",
        e("b", null, formatCompactNumber(stats.max)),
      ),
    }),
    e(SpellBlockLine, {
      left: e(
        "span",
        null,
        "Average: ",
        e("b", null, formatCompactNumber(avg)),
      ),
      right: e(
        "span",
        null,
        `${rateLabel}: `,
        e("b", null, formatCompactRate(rate)),
      ),
    }),
  ];
}

/** Details Player Breakdown — Spells (list + blocks + targets) / Auras / Compare. */
export function MeterDetailsView(props: {
  result: MeterResult;
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  selectedAbility?: string | null;
  onSelectAbility?: (ability: string) => void;
  onSelectActor?: (actorId: string, name: string) => void;
  onSelectSegment?: (next: SegmentRef) => void;
}): any {
  const React = getReact();
  const [tab, setTab] = React.useState("spells");

  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  const isDetails = props.result.kind === "details";
  const r = isDetails ? props.result : null;

  const abilityKey =
    r && (props.selectedAbility || r.ability || r.abilityRows[0]?.id || null);

  // Persist default top-ability selection like Details (first spell selected).
  React.useEffect(() => {
    if (!r) return;
    if (props.selectedAbility) return;
    const first = r.ability || r.abilityRows[0]?.id;
    if (first && props.onSelectAbility) props.onSelectAbility(first);
  }, [r && r.actorId, r && r.ability, props.selectedAbility]);

  if (!r) {
    return e(
      "div",
      { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
      "Pick a player (or open Inspector after combat)",
    );
  }

  const metric =
    r.metric === "heal" || r.metric === "taken" ? r.metric : "damage";
  const sec = Math.max(r.durationMs / 1000, 1);
  const amountLabel =
    metric === "heal" ? "Heal" : metric === "taken" ? "Taken" : "Damage";
  const rateLabel = metric === "heal" ? "HPS" : "DPS";

  const tabs = [
    { id: "spells", label: "Spells" },
    { id: "auras", label: "Auras" },
    { id: "compare", label: "Compare" },
  ];

  const onSpellClick = (row: RankedRow) => {
    setTab("spells");
    if (props.onSelectAbility) props.onSelectAbility(row.id);
  };

  const hits = r.outcomes.hits;
  const crits = r.outcomes.crits;
  const normals = Math.max(0, hits - crits);
  const avg = hits > 0 ? r.abilityTotal / hits : 0;
  const rate = r.abilityTotal / sec;
  const castText =
    r.abilityCasts > 0 ? String(r.abilityCasts) : hits > 0 ? String(hits) : "—";
  // Prefer amount-bucket counts when present (new fights); fall back to outcomes.
  const normalCount = r.hitNormal.count > 0 ? r.hitNormal.count : normals;
  const critCount = r.hitCrit.count > 0 ? r.hitCrit.count : crits;
  const hitDenom = Math.max(hits, normalCount + critCount, 1);
  const normalPct = (normalCount / hitDenom) * 100;
  const critPct = (critCount / hitDenom) * 100;
  const defenseHits = r.outcomes.miss + r.outcomes.evade + r.outcomes.avoid;
  const defensePct =
    hits + defenseHits > 0 ? (defenseHits / (hits + defenseHits)) * 100 : 0;
  const typeLabel = formatAlDamageType(r.damageType);

  const spellBlocks = abilityKey
    ? e(
        "div",
        { className: "ecu-meter-bd-blocks", style: { ...PIXEL_TEXT } },
        e(
          SpellBlock,
          { className: "is-summary", fillPct: 100 },
          e(
            "div",
            { className: "ecu-meter-bd-block-title" },
            skillDisplayName(abilityKey),
          ),
          e(SpellBlockLine, {
            left: e("span", null, "Casts: ", e("b", null, castText)),
            right: e("span", null, "Hits: ", e("b", null, String(hits))),
          }),
          e(SpellBlockLine, {
            left: e(
              "span",
              null,
              `${amountLabel}: `,
              e("b", null, formatCompactNumber(r.abilityTotal)),
            ),
            right: typeLabel || "—",
            mutedRight: true,
          }),
          e(SpellBlockLine, {
            left: e(
              "span",
              null,
              "Average: ",
              e("b", null, formatCompactNumber(avg)),
            ),
            right: e(
              "span",
              null,
              `${rateLabel}: `,
              e("b", null, formatCompactRate(rate)),
            ),
          }),
          r.abilitySplash > 0
            ? e(SpellBlockLine, {
                left: e(
                  "span",
                  null,
                  "Explosion splash: ",
                  e("b", null, formatCompactNumber(r.abilitySplash)),
                ),
              })
            : null,
        ),
        normalCount > 0
          ? e(
              SpellBlock,
              { fillPct: normalPct },
              e(SpellBlockLine, {
                left: e(
                  "span",
                  { className: "ecu-meter-bd-block-h" },
                  "Normal Hits",
                ),
                right: e(
                  "span",
                  null,
                  e("b", null, String(normalCount)),
                  e(
                    "span",
                    { className: "ecu-meter-bd-muted" },
                    ` [${normalPct.toFixed(1)}%]`,
                  ),
                ),
              }),
              ...hitAmountBlockLines(r.hitNormal, sec, rateLabel),
            )
          : null,
        critCount > 0
          ? e(
              SpellBlock,
              { className: "is-crit", fillPct: critPct },
              e(SpellBlockLine, {
                left: e(
                  "span",
                  { className: "ecu-meter-bd-block-h" },
                  "Critical Hits",
                ),
                right: e(
                  "span",
                  null,
                  e("b", null, String(critCount)),
                  e(
                    "span",
                    { className: "ecu-meter-bd-muted" },
                    ` [${critPct.toFixed(1)}%]`,
                  ),
                ),
              }),
              ...hitAmountBlockLines(r.hitCrit, sec, rateLabel),
            )
          : null,
        defenseHits > 0
          ? e(
              SpellBlock,
              { fillPct: defensePct },
              e(SpellBlockLine, {
                left: e(
                  "span",
                  { className: "ecu-meter-bd-block-h" },
                  "Defenses",
                ),
                right: e(
                  "span",
                  null,
                  e("b", null, String(defenseHits)),
                  e(
                    "span",
                    { className: "ecu-meter-bd-muted" },
                    ` [${defensePct.toFixed(1)}%]`,
                  ),
                ),
              }),
              e(SpellBlockLine, {
                left:
                  r.outcomes.miss > 0 ? `Miss: ${r.outcomes.miss}` : "\u00a0",
                right:
                  r.outcomes.evade > 0
                    ? `Evade: ${r.outcomes.evade}`
                    : r.outcomes.avoid > 0
                      ? `Avoid: ${r.outcomes.avoid}`
                      : "\u00a0",
              }),
              r.outcomes.evade > 0 && r.outcomes.avoid > 0
                ? e(SpellBlockLine, {
                    left: `Avoid: ${r.outcomes.avoid}`,
                  })
                : null,
            )
          : null,
      )
    : e(
        "div",
        {
          className: "ecu-meter-bd-blocks ecu-meter-bd-blocks-empty",
          style: { ...PIXEL_TEXT },
        },
        e(
          "div",
          { className: "ecu-meter-bd-stub" },
          "Select a spell on the left",
        ),
      );

  // MeterBarsView only patches on subscribeMeterTick when live (parent React ticks don't).
  const barsLive = props.segmentRef === "current";

  const spellsBody = e(
    "div",
    { className: "ecu-meter-bd-spells" },
    e(
      "div",
      { className: "ecu-meter-bd-left" },
      e(
        "div",
        { className: "ecu-meter-bd-abilities" },
        e(MeterBarsView, {
          query: {
            kind: "abilities",
            actorId: r.actorId,
            metric,
          },
          segmentRef: props.segmentRef,
          partyFocus: props.partyFocus,
          live: barsLive,
          selectedRowId: abilityKey || undefined,
          onRowClick: onSpellClick,
        }),
      ),
      e(
        "div",
        { className: "ecu-meter-bd-targets" },
        e(
          "div",
          { className: "ecu-meter-bd-targets-h", style: { ...PIXEL_TEXT } },
          "TARGETS:",
        ),
        abilityKey
          ? e(MeterBarsView, {
              query: {
                kind: "ability_targets",
                actorId: r.actorId,
                ability: abilityKey,
                metric,
              },
              segmentRef: props.segmentRef,
              partyFocus: props.partyFocus,
              live: barsLive,
            })
          : e(
              "div",
              { className: "ecu-meter-bd-stub", style: { ...PIXEL_TEXT } },
              "Select a spell to see its targets",
            ),
      ),
    ),
    spellBlocks,
  );

  const aurasBody = (() => {
    const rows = r.uptimeRows || [];
    const buffs: UptimeRow[] = [];
    const debuffs: UptimeRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const named = {
        ...row,
        name: conditionDisplayName(row.id) || row.name,
      };
      if (conditionKind(row.id) === "debuff") debuffs.push(named);
      else buffs.push(named);
    }
    return e(
      "div",
      { className: "ecu-meter-bd-auras is-full" },
      e(
        "div",
        { className: "ecu-meter-bd-auras-main", style: { ...PIXEL_TEXT } },
        e(
          "div",
          { className: "ecu-meter-bd-auras-col" },
          e("div", { className: "ecu-meter-bd-auras-col-h" }, "Buffs"),
          buffs.length
            ? e(UptimeTable, { rows: buffs })
            : e(
                "div",
                { className: "ecu-meter-bd-stub" },
                "No buff samples yet (need entity.s while in combat).",
              ),
        ),
        e(
          "div",
          { className: "ecu-meter-bd-auras-col" },
          e("div", { className: "ecu-meter-bd-auras-col-h" }, "Debuffs"),
          debuffs.length
            ? e(UptimeTable, { rows: debuffs })
            : e(
                "div",
                { className: "ecu-meter-bd-stub" },
                "No debuff samples yet (need entity.s while in combat).",
              ),
        ),
      ),
    );
  })();

  let body: any = null;
  if (tab === "spells") {
    body = spellsBody;
  } else if (tab === "auras") {
    body = aurasBody;
  } else {
    body = e(CompareTabBody, {
      segmentRef: props.segmentRef,
      actorId: r.actorId,
      ctype: r.ctype,
      metric,
      amountLabel,
      rateLabel,
      sec,
    });
  }

  const attrTitle = detailsWindowTitle(r.actorName, r.metric, r.primary);
  const ctype = r.ctype || "";
  const rateTotal =
    metric === "heal"
      ? r.totals.heal
      : metric === "taken"
        ? r.totals.taken
        : r.totals.damage;

  return e(
    "div",
    { className: "ecu-meter-inspector-layout" },
    props.onSelectActor
      ? e(MeterBreakdownSideRail, {
          segmentRef: props.segmentRef,
          partyFocus: props.partyFocus,
          selectedActorId: r.actorId,
          metric,
          onSelectActor: props.onSelectActor,
          onSelectSegment: props.onSelectSegment,
        })
      : null,
    e(
      "div",
      { className: "ecu-meter-inspector" },
      e(
        "div",
        { className: "ecu-meter-inspector-top", style: { ...PIXEL_TEXT } },
        e(
          "div",
          { className: "ecu-meter-inspector-attr" },
          e(GameIcon, {
            id: r.actorId,
            kind: "character",
            ctype: ctype || undefined,
            name: r.actorName,
            size: 40,
            title: ctype ? `${r.actorName} · ${ctype}` : r.actorName,
            className: "ecu-meter-inspector-portrait",
          }),
          e(
            "span",
            { className: "ecu-meter-inspector-attr-text" },
            attrTitle,
            ctype
              ? e(
                  "span",
                  {
                    className: "ecu-meter-inspector-ctype",
                    style: { color: classColors[ctype] || "#b0bec5" },
                  },
                  ` · ${ctype}`,
                )
              : null,
          ),
          e(
            "span",
            { className: "ecu-meter-inspector-sub" },
            `${formatCompactRate(rateTotal / sec)} · ${sec.toFixed(0)}s`,
          ),
        ),
        e(
          "div",
          { className: "ecu-meter-player-tabs ecu-meter-inspector-tabs" },
          ...tabs.map((t) =>
            e(
              "button",
              {
                key: t.id,
                type: "button",
                className:
                  "ecu-meter-player-tab" + (tab === t.id ? " active" : ""),
                onClick: () => setTab(t.id),
              },
              t.label,
            ),
          ),
        ),
      ),
      e("div", { className: "ecu-meter-inspector-body" }, body),
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
      { className: "ecu-meter-bd-stub", style: { ...PIXEL_TEXT } },
      "No buff / condition samples yet (need entity.s while in combat)",
    );
  }
  return e(
    "div",
    { className: "ecu-meter-bd-auras-table", style: { ...PIXEL_TEXT } },
    e(
      "div",
      { className: "ecu-meter-bd-auras-head" },
      e("span", null, "Name"),
      e("span", null, "Uptime"),
      e("span", null, "%"),
      e("span", { title: "Applications" }, "A"),
      e("span", { title: "Refreshes (AL: not tracked)" }, "R"),
    ),
    ...props.rows.map((row, i) =>
      e(
        "div",
        {
          key: row.id,
          className: "ecu-meter-uptime-row" + (i % 2 === 0 ? " is-alt" : ""),
          title: `${row.name}: ${fmtUptimeTimer(row.activeMs)} active`,
        },
        e(
          "span",
          { className: "ecu-meter-uptime-name" },
          e(GameIcon, {
            id: row.id,
            kind: "condition",
            size: 16,
            title: row.name,
            className: "ecu-meter-uptime-ico",
          }),
          e("span", { className: "ecu-meter-uptime-label" }, row.name),
        ),
        e(
          "span",
          { className: "ecu-meter-uptime-time" },
          fmtUptimeTimer(row.activeMs),
        ),
        e(
          "span",
          { className: "ecu-meter-uptime-pct" },
          `${(row.uptime * 100).toFixed(0)}%`,
        ),
        e("span", { className: "ecu-meter-uptime-apps" }, String(row.apps)),
        e("span", { className: "ecu-meter-uptime-ref" }, "—"),
      ),
    ),
  );
}

/** Details Compare: 3 columns — primary spells/targets + up to 2 same-ctype peers. */
function CompareTabBody(props: {
  segmentRef: SegmentRef;
  actorId: string;
  ctype?: string;
  metric: "damage" | "heal" | "taken";
  amountLabel: string;
  rateLabel: string;
  sec: number;
}): any {
  const { primary, peers } = comparePeerActors(
    props.segmentRef,
    props.actorId,
    props.ctype,
    props.metric,
  );

  if (!primary) {
    return e(
      "div",
      { className: "ecu-meter-bd-stub", style: { ...PIXEL_TEXT } },
      props.ctype
        ? `No ${props.ctype} actors in this segment to compare.`
        : "Compare needs ctype on party members.",
    );
  }

  const metric = props.metric;
  const spellIds = topAbilityIds(primary, metric, COMPARE_SPELL_ROWS);
  const primaryTargets = actorTargetTotals(primary, metric).slice(
    0,
    COMPARE_TARGET_ROWS,
  );
  const primaryTopSpell = spellIds.length
    ? abilityAmount(primary, spellIds[0], metric)
    : 1;
  const primaryTopTarget = primaryTargets[0]?.value || 1;

  const emptyPeerMsg =
    "There's no more players to compare (with the same ctype)";

  const columns: Array<{ actor: ActorAgg | null; isPrimary: boolean }> = [
    { actor: primary, isPrimary: true },
    { actor: peers[0] || null, isPrimary: false },
    { actor: peers[1] || null, isPrimary: false },
  ];

  return e(
    "div",
    {
      className: "ecu-meter-inspector-compare",
      style: { ...PIXEL_TEXT },
    },
    ...columns.map((col, colIdx) => {
      if (!col.actor) {
        return e(
          "div",
          {
            key: `empty-${colIdx}`,
            className: "ecu-meter-inspector-compare-col is-empty",
          },
          e(
            "div",
            { className: "ecu-meter-inspector-compare-empty" },
            emptyPeerMsg,
          ),
        );
      }
      const actor = col.actor;
      const total = actorMetricTotal(actor, metric);
      const peerTargets = actorTargetTotals(actor, metric);
      const peerTargetById: Record<
        string,
        { id: string; name: string; value: number }
      > = {};
      for (let i = 0; i < peerTargets.length; i++) {
        peerTargetById[peerTargets[i].id] = peerTargets[i];
      }
      const peerSpellRank: Record<string, number> = {};
      const peerSpellOrder = topAbilityIds(actor, metric, 99);
      for (let i = 0; i < peerSpellOrder.length; i++) {
        peerSpellRank[peerSpellOrder[i]] = i + 1;
      }
      const peerTargetRank: Record<string, number> = {};
      for (let i = 0; i < peerTargets.length; i++) {
        peerTargetRank[peerTargets[i].id] = i + 1;
      }

      return e(
        "div",
        {
          key: actor.id,
          className:
            "ecu-meter-inspector-compare-col" +
            (col.isPrimary ? " is-you" : ""),
        },
        e(
          "div",
          { className: "ecu-meter-inspector-compare-h" },
          e(GameIcon, {
            id: actor.id,
            kind: "character",
            ctype: actor.ctype,
            name: actor.name,
            size: 28,
            title: actor.ctype ? `${actor.name} · ${actor.ctype}` : actor.name,
          }),
          e("span", null, actor.name),
          col.isPrimary
            ? e("span", { className: "ecu-meter-bd-muted" }, " ★")
            : null,
        ),
        e(
          "div",
          { className: "ecu-meter-inspector-compare-stat" },
          props.amountLabel,
          e("b", null, formatCompactNumber(total)),
        ),
        e(
          "div",
          { className: "ecu-meter-inspector-compare-stat" },
          props.rateLabel,
          e("b", null, formatCompactRate(total / props.sec)),
        ),
        e(
          "div",
          { className: "ecu-meter-inspector-compare-spells-h" },
          "Spells",
        ),
        spellIds.length === 0
          ? e("div", { className: "ecu-meter-bd-muted" }, "No ability totals")
          : null,
        ...spellIds.map((abId, idx) => {
          const primaryV = abilityAmount(primary, abId, metric);
          const v = abilityAmount(actor, abId, metric);
          const hasSpell = !!actor.abilities[abId];
          if (!col.isPrimary && !hasSpell) {
            return e("div", {
              key: abId,
              className: "ecu-meter-inspector-compare-spell is-missing",
            });
          }
          const fillPct = col.isPrimary
            ? Math.min(100, (v / Math.max(primaryTopSpell, 1)) * 100)
            : 100;
          const rank = col.isPrimary ? idx + 1 : peerSpellRank[abId] || idx + 1;
          const pct = !col.isPrimary ? comparePctLabel(primaryV, v) : null;
          return e(
            "div",
            {
              key: abId,
              className: "ecu-meter-inspector-compare-spell",
              title: `${skillDisplayName(abId)} — ${formatCompactNumber(v)}`,
            },
            e("div", {
              className: "ecu-meter-inspector-compare-spell-fill",
              style: { width: `${fillPct}%` },
            }),
            e(
              "span",
              { className: "ecu-meter-inspector-compare-spell-n" },
              e(GameIcon, {
                id: abId,
                kind: "auto",
                size: 14,
                title: skillDisplayName(abId),
              }),
              `${rank}. ${skillDisplayName(abId)}`,
            ),
            e(
              "span",
              { className: "ecu-meter-inspector-compare-spell-v" },
              formatCompactNumber(v),
              pct
                ? e(
                    "span",
                    {
                      className:
                        "ecu-meter-inspector-compare-pct is-" + pct.tone,
                    },
                    " ",
                    pct.text,
                  )
                : null,
            ),
          );
        }),
        e(
          "div",
          { className: "ecu-meter-inspector-compare-spells-h" },
          "Targets",
        ),
        primaryTargets.length === 0
          ? e("div", { className: "ecu-meter-bd-muted" }, "No targets")
          : null,
        ...primaryTargets.map((pt, idx) => {
          const peerT = peerTargetById[pt.id];
          const v = col.isPrimary ? pt.value : peerT ? peerT.value : 0;
          if (!col.isPrimary && !peerT) {
            return e("div", {
              key: pt.id,
              className: "ecu-meter-inspector-compare-spell is-missing",
            });
          }
          const fillPct = col.isPrimary
            ? Math.min(100, (v / Math.max(primaryTopTarget, 1)) * 100)
            : 100;
          const rank = col.isPrimary
            ? idx + 1
            : peerTargetRank[pt.id] || idx + 1;
          const pct = !col.isPrimary ? comparePctLabel(pt.value, v) : null;
          return e(
            "div",
            {
              key: pt.id,
              className: "ecu-meter-inspector-compare-spell is-target",
              title: `${pt.name} — ${formatCompactNumber(v)}`,
            },
            e("div", {
              className: "ecu-meter-inspector-compare-spell-fill",
              style: { width: `${fillPct}%` },
            }),
            e(
              "span",
              { className: "ecu-meter-inspector-compare-spell-n" },
              e(GameIcon, {
                id: pt.id,
                kind: "target",
                size: 14,
                mtype: pt.mtype,
                ctype: pt.ctype,
                name: pt.name,
                title: pt.name,
              }),
              `${rank}. ${pt.name}`,
            ),
            e(
              "span",
              { className: "ecu-meter-inspector-compare-spell-v" },
              formatCompactNumber(v),
              pct
                ? e(
                    "span",
                    {
                      className:
                        "ecu-meter-inspector-compare-pct is-" + pct.tone,
                    },
                    " ",
                    pct.text,
                  )
                : null,
            ),
          );
        }),
      );
    }),
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

export function MeterEncounterView(props: {
  result: MeterResult;
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  onOpenPlayer?: (id: string, name: string) => void;
}): any {
  const React = getReact();
  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  if (props.result.kind !== "encounter") {
    return e("div", { style: pad }, "No encounter");
  }
  const r = props.result;
  const sec = Math.max(r.durationMs / 1000, 1);
  const seg = resolveSegment(props.segmentRef);
  const fightLabel = seg?.label || "Current fight";

  const openPlayer = props.onOpenPlayer
    ? (row: RankedRow) => {
        if (row.kind === "player" || !row.kind) {
          props.onOpenPlayer!(row.id, row.name);
        }
      }
    : undefined;

  const panes: Array<{
    key: string;
    title: string;
    tone: string;
    query?: any;
    deathLog?: boolean;
  }> = [
    {
      key: "taken",
      title: "Damage Taken per Player",
      tone: "tone-taken",
      query: { kind: "players", metric: "taken", primary: "total" },
    },
    {
      key: "spell",
      title: "Damage Taken by Spell",
      tone: "tone-spell",
      query: { kind: "taken_by_spell" },
    },
    {
      key: "adds",
      title: "Adds",
      tone: "tone-dmg",
      query: { kind: "enemy_damage" },
    },
    {
      key: "dispels",
      title: "Dispels",
      tone: "tone-heal",
      query: { kind: "misc", metric: "dispels" },
    },
    {
      key: "interrupts",
      title: "Interrupts",
      tone: "tone-av",
      query: { kind: "misc", metric: "interrupts" },
    },
    {
      key: "deaths",
      title: "Death Log",
      tone: "tone-death",
      deathLog: true,
    },
  ];

  const deathResult = runMeterQuery(
    { kind: "death_log" },
    {
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
    },
  );

  return e(
    "div",
    { className: "ecu-meter-encounter", style: { ...PIXEL_TEXT } },
    e(
      "div",
      { className: "ecu-meter-enc-head" },
      e(
        "div",
        { className: "ecu-meter-enc-title" },
        e("b", null, "Encounter Details"),
        " · ",
        fightLabel,
      ),
      e(
        "div",
        { className: "ecu-meter-enc-stats" },
        e("span", null, e("b", null, `${sec.toFixed(0)}s`)),
        e(
          "span",
          { className: r.deaths > 0 ? "is-bad" : undefined },
          e("b", null, String(r.deaths)),
          " deaths",
        ),
        e(
          "span",
          null,
          "Dmg ",
          e("b", null, formatCompactNumber(r.totalDamage)),
        ),
        e(
          "span",
          null,
          "DPS ",
          e("b", null, `${formatCompactNumber(r.totalDamage / sec)}/s`),
        ),
        e(
          "span",
          null,
          "Heal ",
          e("b", null, formatCompactNumber(r.totalHeal)),
        ),
        r.topDps ? e("span", null, "Top ", e("b", null, r.topDps.name)) : null,
      ),
    ),
    e(
      "div",
      { className: "ecu-meter-enc-grid" },
      ...panes.map((pane) =>
        e(
          "div",
          {
            key: pane.key,
            className: `ecu-meter-enc-widget ${pane.tone}`,
          },
          e("div", { className: "ecu-meter-enc-widget-hd" }, pane.title),
          e(
            "div",
            { className: "ecu-meter-enc-widget-body" },
            pane.deathLog
              ? deathResult.kind === "death_log" && deathResult.deaths.length
                ? e(
                    "div",
                    { className: "ecu-meter-enc-deathlist" },
                    ...deathResult.deaths.map((d, i) =>
                      e(
                        "div",
                        {
                          key: `${d.id}-${d.at}`,
                          className: "ecu-meter-enc-deathrow",
                        },
                        e(
                          "span",
                          { className: "ecu-meter-enc-deathname" },
                          d.name,
                        ),
                        e(
                          "span",
                          { className: "ecu-meter-enc-deathtime" },
                          new Date(d.at).toLocaleTimeString(),
                        ),
                        e(
                          "span",
                          { className: "ecu-meter-enc-deathnum" },
                          `#${i + 1}`,
                        ),
                      ),
                    ),
                  )
                : e("div", { className: "ecu-meter-enc-empty" }, "No deaths")
              : e(MeterBarsView, {
                  query: pane.query,
                  segmentRef: props.segmentRef,
                  partyFocus: props.partyFocus,
                  live: false,
                  onRowContextMenu: openPlayer,
                  onRowClick: openPlayer,
                }),
          ),
        ),
      ),
    ),
  );
}

/** @deprecated import from `./MeterTimelineView` — re-exported for callers. */
export { MeterTimelineView } from "./MeterTimelineView";
