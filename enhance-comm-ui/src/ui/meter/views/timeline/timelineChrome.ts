/**
 * Time Line filter tabs, legend, gutter/track lane chrome.
 */

import { e } from "../../../../host/react";
import { classColors } from "../../../../lib/colors";
import type { TimelineBlock, TimelineLane, TlFilter } from "./timelineModel";
import {
  blockCat,
  laneRowPx,
  TL_COALESCE_SEC,
  TL_ICON,
  TL_ICON_SUB,
} from "./timelineModel";
import type { TlTick } from "./timelineVirtualize";
import {
  blockOverlapsView,
  firstBlockInView,
  lastBlockInView,
} from "./timelineVirtualize";

export const TL_FILTER_TABS: Array<{ id: TlFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "cds", label: "Cooldowns" },
  { id: "debuffs", label: "Debuffs" },
  { id: "buffs", label: "Buffs" },
  { id: "gear", label: "Gear" },
];

export function timelineLegendItems(
  filter: TlFilter,
): Array<{ cls: string; label: string }> {
  return filter === "cds"
    ? [{ cls: "is-cd", label: "Cooldown bar" }]
    : filter === "buffs"
      ? [{ cls: "is-buff", label: "Buff bar" }]
      : filter === "debuffs"
        ? [{ cls: "is-debuff", label: "Debuff bar" }]
        : filter === "gear"
          ? [{ cls: "is-gear", label: "Gear swap" }]
          : [
              { cls: "is-cd", label: "CD" },
              { cls: "is-buff", label: "Buff" },
              { cls: "is-debuff", label: "Debuff" },
              { cls: "is-gear", label: "Gear" },
              { cls: "is-death", label: "Death" },
            ];
}

export function timelineEmptyMsg(filter: TlFilter): string {
  return filter === "all"
    ? "No cast / condition / gear markers yet."
    : filter === "cds"
      ? "No cast / cooldown markers yet."
      : filter === "debuffs"
        ? "No debuffs recorded yet."
        : filter === "gear"
          ? "No gear swaps recorded yet."
          : "No buffs recorded yet.";
}

export function timelineGutterLane(
  lane: TimelineLane,
  li: number,
  selectedId: string | null,
  selectLane: (laneId: string) => void,
): any {
  const rowH = laneRowPx(lane.cats);
  const tip = lane.ctype ? `${lane.name} · ${lane.ctype}` : lane.name;
  return e(
    "div",
    {
      key: lane.id,
      className:
        "ecu-meter-tl-gutter-lane" +
        (li % 2 === 1 ? " is-alt" : "") +
        (selectedId === lane.id ? " is-selected" : "") +
        (lane.cats.length >= 2 ? " is-split" : ""),
      title: tip,
      style: {
        color: classColors[(lane.ctype || "").toLowerCase()] || "#b0bec5",
        height: `${rowH}px`,
        minHeight: `${rowH}px`,
        maxHeight: `${rowH}px`,
      },
      onClick: () => selectLane(lane.id),
    },
    e("span", { className: "ecu-meter-tl-name-txt" }, lane.name),
  );
}

export type TrackLaneOpts = {
  selectedId: string | null;
  selectLane: (laneId: string) => void;
  renderRange: { left: number; right: number };
  pps: number;
  ticks: TlTick[];
  TimelineEvent: any;
  laneBlocksRef: { current: Record<string, TimelineBlock[]> };
  start: number;
};

export function timelineTrackLane(
  lane: TimelineLane,
  li: number,
  opts: TrackLaneOpts,
): any {
  // One kind only → full-height bar + large icons (same as exclusive tabs).
  // Two+ kinds → taller stacked sub-lanes (no empty category slots).
  const split = lane.cats.length >= 2;
  const rowH = laneRowPx(lane.cats);
  const iconPx = split ? TL_ICON_SUB : TL_ICON;
  const from = firstBlockInView(lane.blocks, opts.renderRange.left, opts.pps);
  const to = lastBlockInView(
    lane.blocks,
    opts.renderRange.right,
    opts.pps,
    from,
  );
  const eventNodes: any[] = [];
  let lastCastKey = "";
  let lastCastAt = -1e9;
  for (let bi = from; bi < to; bi++) {
    const b = lane.blocks[bi];
    if (
      !blockOverlapsView(
        b,
        opts.renderRange.left,
        opts.renderRange.right,
        opts.pps,
        iconPx,
      )
    ) {
      continue;
    }
    if (b.kind === "cast") {
      if (b.key === lastCastKey && b.atSec - lastCastAt < TL_COALESCE_SEC) {
        continue;
      }
      lastCastKey = b.key;
      lastCastAt = b.atSec;
    }
    const cat = blockCat(b);
    const subIndex = split && cat !== "death" ? lane.cats.indexOf(cat) : -1;
    eventNodes.push(
      e(opts.TimelineEvent, {
        key: b.domKey,
        block: b,
        laneId: lane.id,
        laneBlocksRef: opts.laneBlocksRef,
        originMs: opts.start,
        pps: opts.pps,
        actorName: lane.name,
        stackIndex: bi,
        iconPx,
        subIndex,
        subCount: split ? lane.cats.length : 1,
      }),
    );
  }
  const gridNodes: any[] = [];
  for (let i = 1; i < opts.ticks.length; i++) {
    const t = opts.ticks[i];
    if (
      t.left < opts.renderRange.left - 8 ||
      t.left > opts.renderRange.right + 8
    ) {
      continue;
    }
    gridNodes.push(
      e("div", {
        key: `g${t.isEnd ? "end" : t.sec}`,
        className: "ecu-meter-tl-gridline",
        style: { left: `${t.left}px` },
      }),
    );
  }
  return e(
    "div",
    {
      key: lane.id,
      className:
        "ecu-meter-tl-lane" +
        (li % 2 === 1 ? " is-alt" : "") +
        (opts.selectedId === lane.id ? " is-selected" : "") +
        (split ? " is-split" : ""),
      style: {
        height: `${rowH}px`,
        minHeight: `${rowH}px`,
        maxHeight: `${rowH}px`,
      },
      onClick: () => opts.selectLane(lane.id),
    },
    e(
      "div",
      { className: "ecu-meter-tl-track" },
      e("div", { className: "ecu-meter-tl-axis" }, ...gridNodes, ...eventNodes),
    ),
  );
}

/**
 * Compact jump-to-now on the Fight axis strip. Hidden by the view while
 * following / Shift-frozen at the live edge.
 */
export function timelineGoToNowBtn(onClick: () => void): any {
  return e(
    "button",
    {
      type: "button",
      className: "ecu-meter-tl-now-btn",
      title: "Go to now — live edge or end of fight",
      onClick,
    },
    "Now",
  );
}

export function timelineLegend(
  items: Array<{ cls: string; label: string }>,
): any {
  return e(
    "div",
    { className: "ecu-meter-tl-legend", "aria-label": "Bar colors" },
    ...items.map((item) =>
      e(
        "span",
        {
          key: item.cls,
          className: "ecu-meter-tl-legend-item " + item.cls,
        },
        e("span", {
          className: "ecu-meter-tl-legend-swatch",
          "aria-hidden": true,
        }),
        item.label,
      ),
    ),
  );
}
