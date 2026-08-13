/**
 * Details BreakdownSideMenuFrame — external left rail on Player Details:
 * Select Player · Select Segment. Plugins (Encounter / Timeline / Deaths) live
 * on MeterPluginRail; this rail omits the Plugins block when the list is empty.
 * Player switching for Spells / Auras / Compare — not ranking bars inside Auras.
 */

import { getReact, e } from "../../host/react";
import { formatCompactNumber } from "../../lib/format";
import type { PartyFocus } from "../../lib/settingsFocus";
import { PIXEL_TEXT } from "../../lib/typeScale";
import { listPastSegments, resolveSegment } from "../../meters/meterEngine";
import { runMeterQuery, segmentTitle } from "../../meters/meterQuery";
import type {
  PlayersMetric,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";

export type MeterBreakdownSideRailProps = {
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  selectedActorId: string;
  metric?: PlayersMetric;
  onSelectActor: (actorId: string, name: string) => void;
  onSelectSegment?: (next: SegmentRef) => void;
};

function segmentKey(ref: SegmentRef): string {
  if (ref === "current" || ref === "total") return ref;
  return `past:${ref.pastId}`;
}

function refsEqual(a: SegmentRef, b: SegmentRef): boolean {
  return segmentKey(a) === segmentKey(b);
}

export function MeterBreakdownSideRail(
  props: MeterBreakdownSideRailProps,
): any {
  getReact();
  const metric: PlayersMetric =
    props.metric === "heal" || props.metric === "taken"
      ? props.metric
      : "damage";

  const playersResult = runMeterQuery(
    { kind: "players", metric, primary: "total" },
    {
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
      now: Date.now(),
    },
  );
  const players: RankedRow[] =
    playersResult.kind === "ranked" ? playersResult.rows : [];

  const past = listPastSegments();
  const segmentOpts: Array<{ ref: SegmentRef; label: string }> = [
    { ref: "current", label: segmentTitle("current") },
    { ref: "total", label: segmentTitle("total") },
  ];
  for (let i = 0; i < past.length; i++) {
    const p = past[i];
    segmentOpts.push({
      ref: { pastId: p.id },
      label: p.label || segmentTitle({ pastId: p.id }) || p.id,
    });
  }

  return e(
    "aside",
    {
      className: "ecu-meter-bd-side",
      style: { ...PIXEL_TEXT },
      "aria-label": "Breakdown side menu",
    },
    e("div", { className: "ecu-meter-bd-side-sec" }, "Select Player"),
    e(
      "div",
      { className: "ecu-meter-bd-side-list", role: "listbox" },
      players.length
        ? players.map((row) =>
            e(
              "button",
              {
                key: row.id,
                type: "button",
                role: "option",
                "aria-selected": row.id === props.selectedActorId,
                className:
                  "ecu-meter-bd-side-item" +
                  (row.id === props.selectedActorId ? " is-active" : ""),
                title: `${row.name} — ${formatCompactNumber(row.value)}`,
                onClick: () => {
                  if (row.id !== props.selectedActorId) {
                    props.onSelectActor(row.id, row.name);
                  }
                },
              },
              e("span", { className: "ecu-meter-bd-side-lab" }, row.name),
              e(
                "span",
                { className: "ecu-meter-bd-side-amt" },
                formatCompactNumber(row.value),
              ),
            ),
          )
        : e(
            "div",
            { className: "ecu-meter-bd-side-empty" },
            "No players in segment",
          ),
    ),
    e("div", { className: "ecu-meter-bd-side-sec" }, "Select Segment"),
    e(
      "div",
      { className: "ecu-meter-bd-side-list is-segments", role: "listbox" },
      segmentOpts.map((opt) => {
        const active = refsEqual(opt.ref, props.segmentRef);
        const resolved =
          opt.ref === "current" ? resolveSegment("current") : null;
        const label =
          opt.ref === "current" && resolved?.label ? `${opt.label}` : opt.label;
        return e(
          "button",
          {
            key: segmentKey(opt.ref),
            type: "button",
            role: "option",
            "aria-selected": active,
            className: "ecu-meter-bd-side-item" + (active ? " is-active" : ""),
            title: label,
            disabled: !props.onSelectSegment,
            onClick: () => {
              if (props.onSelectSegment && !active) {
                props.onSelectSegment(opt.ref);
              }
            },
          },
          e("span", { className: "ecu-meter-bd-side-lab" }, label),
        );
      }),
    ),
  );
}
