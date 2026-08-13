/**
 * Legacy player drill — prefer MeterDetailsView (Inspector / Details layout).
 * Kept for import stability; mirrors Spells/Targets/Summary tabs only.
 */

import { getReact, e } from "../../host/react";
import { formatCompactNumber, formatCompactRatePerSec } from "../../lib/format";
import type { PartyFocus } from "../../lib/settingsFocus";
import { PIXEL_TEXT } from "../../lib/typeScale";
import { runMeterQuery } from "../../meters/meterQuery";
import type {
  MeterQuery,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";
import { MeterBarsView } from "./MeterBarRow";
import { injectMeterChromeCss } from "./meterChromeCss";

export type PlayerDrillTab = "spells" | "targets" | "summary";

export const PLAYER_DRILL_TABS: Array<{ id: PlayerDrillTab; label: string }> = [
  { id: "spells", label: "Spells" },
  { id: "targets", label: "Targets" },
  { id: "summary", label: "Summary" },
];

export type MeterPlayerBreakdownProps = {
  actorId: string;
  actorName: string;
  tab: PlayerDrillTab;
  metric: "damage" | "heal" | "taken" | "healing_required" | "avoidance";
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  entities?: any[];
  frameH?: number;
  onTab: (tab: PlayerDrillTab) => void;
  onSpellClick?: (abilityId: string) => void;
};

export function MeterPlayerBreakdown(props: MeterPlayerBreakdownProps): any {
  getReact();
  injectMeterChromeCss();

  const metric =
    props.metric === "heal" || props.metric === "taken"
      ? props.metric
      : "damage";

  const spellsQuery: MeterQuery = {
    kind: "abilities",
    actorId: props.actorId,
    metric: metric === "heal" || metric === "taken" ? metric : "damage",
  };
  const targetsQuery: MeterQuery = {
    kind: "targets",
    actorId: props.actorId,
    metric: metric === "heal" ? "heal" : "damage",
  };

  let body: any = null;
  if (props.tab === "spells") {
    body = e(MeterBarsView, {
      query: spellsQuery,
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
      entities: props.entities,
      frameH: props.frameH,
      live: props.segmentRef === "current",
      onRowClick: (row: RankedRow) => {
        if (props.onSpellClick) props.onSpellClick(row.id);
      },
    });
  } else if (props.tab === "targets") {
    body = e(MeterBarsView, {
      query: targetsQuery,
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
      entities: props.entities,
      frameH: props.frameH,
      live: props.segmentRef === "current",
    });
  } else {
    const details = runMeterQuery(
      { kind: "details", actorId: props.actorId, metric },
      {
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus,
        entities: props.entities,
      },
    );
    if (details.kind !== "details") {
      body = e(
        "div",
        { style: { padding: 8, color: "#888", fontSize: 12 } },
        "No summary",
      );
    } else {
      const sec = Math.max(details.durationMs / 1000, 1);
      body = e(
        "div",
        { className: "ecu-meter-player-summary", style: { ...PIXEL_TEXT } },
        e(
          "div",
          { className: "stat-grid" },
          e(
            "div",
            null,
            "Damage ",
            e("b", null, formatCompactNumber(details.totals.damage)),
          ),
          e(
            "div",
            null,
            "DPS ",
            e("b", null, formatCompactRatePerSec(details.totals.damage / sec)),
          ),
          e(
            "div",
            null,
            "Taken ",
            e("b", null, formatCompactNumber(details.totals.taken)),
          ),
          e(
            "div",
            null,
            "Heal ",
            e("b", null, formatCompactNumber(details.totals.heal)),
          ),
          e(
            "div",
            null,
            "HPS ",
            e("b", null, formatCompactRatePerSec(details.totals.heal / sec)),
          ),
          e(
            "div",
            null,
            "Heal Req ",
            e("b", null, formatCompactNumber(details.totals.healingRequired)),
          ),
          e("div", null, "Deaths ", e("b", null, String(details.deaths))),
        ),
      );
    }
  }

  return e(
    "div",
    { className: "ecu-meter-player-breakdown" },
    e(
      "div",
      { className: "ecu-meter-player-tabs", style: { ...PIXEL_TEXT } },
      ...PLAYER_DRILL_TABS.map((t) =>
        e(
          "button",
          {
            key: t.id,
            type: "button",
            className:
              "ecu-meter-player-tab" + (props.tab === t.id ? " active" : ""),
            onClick: () => props.onTab(t.id),
          },
          t.label,
        ),
      ),
    ),
    body,
  );
}
