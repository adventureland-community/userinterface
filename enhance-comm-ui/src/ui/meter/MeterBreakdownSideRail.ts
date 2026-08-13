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
import { listSegmentChoices } from "../../meters/meterSession";
import { runMeterQuery } from "../../meters/meterQuery";
import { refsEqual, segmentRefKey } from "../../meters/meterSegmentRef";
import type {
  PlayersMetric,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";
import {
  hoverDetailPosFromEl,
  portalHoverDetail,
  type HoverDetailPos,
} from "./meterHoverDetail";

export type MeterBreakdownSideRailProps = {
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  selectedActorId: string;
  metric?: PlayersMetric;
  onSelectActor: (actorId: string, name: string) => void;
  onSelectSegment?: (next: SegmentRef) => void;
};

type SideHover =
  | { kind: "player"; id: string; pos: HoverDetailPos }
  | { kind: "seg"; key: string; pos: HoverDetailPos };

export function MeterBreakdownSideRail(
  props: MeterBreakdownSideRailProps,
): any {
  const React = getReact();
  const [hover, setHover] = React.useState(null as SideHover | null);
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

  const segmentOpts = listSegmentChoices();
  let hoverText: string | null = null;
  if (hover && hover.kind === "player") {
    for (let i = 0; i < players.length; i++) {
      if (players[i].id === hover.id) {
        hoverText = `${players[i].name} — ${formatCompactNumber(players[i].value)}`;
        break;
      }
    }
  } else if (hover && hover.kind === "seg") {
    for (let i = 0; i < segmentOpts.length; i++) {
      if (segmentRefKey(segmentOpts[i].ref) === hover.key) {
        hoverText = segmentOpts[i].tip || segmentOpts[i].title;
        break;
      }
    }
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
                onMouseEnter: (ev: any) => {
                  setHover({
                    kind: "player",
                    id: row.id,
                    pos: hoverDetailPosFromEl(ev.currentTarget as HTMLElement),
                  });
                },
                onMouseLeave: () => setHover(null),
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
        const key = segmentRefKey(opt.ref);
        return e(
          "button",
          {
            key,
            type: "button",
            role: "option",
            "aria-selected": active,
            className: "ecu-meter-bd-side-item" + (active ? " is-active" : ""),
            disabled: !props.onSelectSegment,
            onMouseEnter: (ev: any) => {
              setHover({
                kind: "seg",
                key,
                pos: hoverDetailPosFromEl(ev.currentTarget as HTMLElement),
              });
            },
            onMouseLeave: () => setHover(null),
            onClick: () => {
              if (props.onSelectSegment && !active) {
                props.onSelectSegment(opt.ref);
              }
            },
          },
          e("span", { className: "ecu-meter-bd-side-lab" }, opt.title),
        );
      }),
    ),
    hoverText && hover ? portalHoverDetail(hoverText, hover.pos) : null,
  );
}
