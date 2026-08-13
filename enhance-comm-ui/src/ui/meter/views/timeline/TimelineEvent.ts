/**
 * Time Line event block (icon + bar + hover).
 */

import { e } from "../../../../host/react";
import { showMeterTooltip } from "../../../../meters/meterTooltip";
import type { TimelineBlock } from "./timelineModel";
import { TL_ICON_Z } from "./timelineModel";
import { blockIconHtml } from "./timelineFormat";
import {
  blockTooltipHtml,
  hideBlockTip,
  IconHost,
  isTlHoverTarget,
  showBlockTip,
  timelineScrollView,
  tlHoverDomKey,
  type NearbyView,
} from "./timelineTips";
import { blockLayoutPx } from "./timelineVirtualize";

export type TimelineEventProps = {
  block: TimelineBlock;
  laneId: string;
  laneBlocksRef: { current: Record<string, TimelineBlock[]> };
  /** Absolute ms for fight origin (axis 00:00) — wall-clock mapping. */
  originMs: number;
  pps: number;
  actorName: string;
  stackIndex: number;
  iconPx: number;
  /** -1 = full-height row; else index into the player’s All-mode sub-lanes. */
  subIndex: number;
  subCount: number;
};

export function timelineEventEqual(
  prev: TimelineEventProps,
  next: TimelineEventProps,
): boolean {
  if (prev.pps !== next.pps || prev.stackIndex !== next.stackIndex)
    return false;
  if (prev.laneId !== next.laneId || prev.actorName !== next.actorName) {
    return false;
  }
  if (prev.originMs !== next.originMs) return false;
  if (
    prev.iconPx !== next.iconPx ||
    prev.subIndex !== next.subIndex ||
    prev.subCount !== next.subCount
  ) {
    return false;
  }
  const pb = prev.block;
  const nb = next.block;
  if (pb.domKey !== nb.domKey || pb.atSec !== nb.atSec || pb.kind !== nb.kind) {
    return false;
  }
  if (pb.isOpen !== nb.isOpen || pb.condKind !== nb.condKind) return false;
  if (pb.nextSameAtSec !== nb.nextSameAtSec) return false;
  // Open auras tick elapsed in the cooltip — layout width is clamped.
  if (pb.isOpen && nb.isOpen) return true;
  return pb.durationSec === nb.durationSec;
}

/**
 * Place icons at true elapsed time. Overlaps stack in place (z-index +
 * cooltip cluster) — never nudge X. Live min-gap reflow was the jump source:
 * open auras grow visual width each tick, cascade-shifted later icons,
 * and misaligned same-time events across player rows.
 *
 * Hover is icon-first, then bar: the wrapper is not a stacking context, so
 * later icons sit above earlier 5–20s bars. Empty lane chrome still has
 * no tip — that was the old whole-fight dump.
 */
export function TimelineEventInner(props: TimelineEventProps): any {
  const b = props.block;
  const layout = blockLayoutPx(b, props.pps, props.iconPx);
  const tip = (ev: MouseEvent) => {
    const laneBlocks = props.laneBlocksRef.current[props.laneId] || [];
    const scroll = timelineScrollView(ev.target);
    const view: NearbyView = {
      pps: props.pps,
      iconPx: props.iconPx,
      viewLeft: scroll ? scroll.viewLeft : 0,
      viewRight: scroll ? scroll.viewRight : Number.POSITIVE_INFINITY,
      pad: scroll ? scroll.pad : 0,
    };
    return blockTooltipHtml(
      b,
      props.actorName,
      laneBlocks,
      props.originMs,
      view,
    );
  };
  const onEnter = (ev: MouseEvent) => {
    showBlockTip(b.domKey, ev, tip(ev));
  };
  const onMove = (ev: MouseEvent) => {
    // New event id (icon→icon) rebuilds the tip; same id just follows the cursor.
    if (tlHoverDomKey !== b.domKey) {
      showBlockTip(b.domKey, ev, tip(ev));
      return;
    }
    showMeterTooltip(ev, tip(ev));
  };
  const onLeave = (ev: MouseEvent) => {
    if (isTlHoverTarget(ev.relatedTarget)) return;
    hideBlockTip();
  };
  const iconZ = TL_ICON_Z + props.stackIndex;
  const barZ = props.stackIndex + 1;
  const split = props.subIndex >= 0 && props.subCount >= 2;

  if (b.kind === "death") {
    return e("div", {
      className: "ecu-meter-tl-death",
      style: { left: `${layout.left}px`, zIndex: iconZ },
      onMouseEnter: onEnter,
      onMouseMove: onMove,
      onMouseLeave: onLeave,
    });
  }

  return e(
    "div",
    {
      className:
        "ecu-meter-tl-block" +
        (b.kind === "cast" ? " is-cast" : "") +
        (b.kind === "gear" ? " is-gear" : "") +
        (b.condKind === "buff" ? " is-buff" : "") +
        (b.condKind === "debuff" ? " is-debuff" : "") +
        (layout.showBar ? "" : " is-no-bar") +
        (split ? " is-sub" : ""),
      "data-tl-key": b.domKey,
      style: {
        left: `${layout.left}px`,
        width: `${layout.width}px`,
        ...(split
          ? {
              ["--tl-sub-i" as string]: String(props.subIndex),
              ["--tl-subs" as string]: String(props.subCount),
            }
          : {}),
      },
    },
    e(IconHost, {
      html: blockIconHtml(b, props.iconPx),
      className: "ecu-meter-tl-block-ico",
      style: { zIndex: iconZ },
      onMouseEnter: onEnter,
      onMouseMove: onMove,
      onMouseLeave: onLeave,
    }),
    layout.showBar ? e("div", { className: "ecu-meter-tl-block-bar" }) : null,
    e("div", {
      className: "ecu-meter-tl-block-hit",
      style: { zIndex: barZ },
      onMouseEnter: onEnter,
      onMouseMove: onMove,
      onMouseLeave: onLeave,
    }),
  );
}
