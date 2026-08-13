import { getReact, e } from "../../../host/react";
import { formatCompactNumber, formatCompactRate } from "../../../lib/format";
import {
  conditionDisplayName,
  conditionKind,
  skillDisplayName,
} from "../../../lib/gameIcon";
import { GameIcon } from "../../chrome/GameIcon";
import type { PartyFocus } from "../../../lib/settingsFocus";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import { classColors } from "../../../lib/colors";
import type {
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
import { CompareTabBody } from "./MeterCompareView";

const OC_COLORS: Record<string, string> = {
  hits: "#90caf9",
  crits: "#ef5350",
  miss: "#b0bec5",
  evade: "#80cbc4",
  avoid: "#ce93d8",
  kills: "#e57373",
};

function outcomeRows(outcomes: OutcomeCounts): Array<[string, number, string]> {
  const all: Array<[string, number, string]> = [
    ["hits", outcomes.hits, OC_COLORS.hits],
    ["crits", outcomes.crits, OC_COLORS.crits],
    ["miss", outcomes.miss, OC_COLORS.miss],
    ["evade", outcomes.evade, OC_COLORS.evade],
    ["avoid", outcomes.avoid, OC_COLORS.avoid],
    ["kills", outcomes.kills, OC_COLORS.kills],
  ];
  const rows: Array<[string, number, string]> = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i][1] > 0) rows.push(all[i]);
  }
  return rows;
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

  const r = props.result.kind === "details" ? props.result : null;

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
