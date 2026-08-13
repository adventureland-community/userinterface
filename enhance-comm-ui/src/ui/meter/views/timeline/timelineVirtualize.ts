/**
 * Time Line virtualization, axis ticks, and block pixel layout.
 */

import { e } from "../../../../host/react";
import type { TimelineBlock } from "./timelineModel";
import {
  TL_BAR_MIN_PX,
  TL_CAST_BAR_GAP_PX,
  TL_TICK_MIN_PX,
  TL_VIEW_BUF_PX,
  TL_VIEW_ESTIMATE_W,
  TL_VISUAL_DUR_MAX,
  visualDurationSec,
} from "./timelineModel";
import { fmtClock, wallAtElapsed } from "./timelineFormat";

export function firstBlockInView(
  blocks: TimelineBlock[],
  viewLeft: number,
  pps: number,
): number {
  const maxBarPx = TL_VISUAL_DUR_MAX * pps;
  const minAt = (viewLeft - maxBarPx) / Math.max(1, pps);
  let lo = 0;
  let hi = blocks.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (blocks[mid].atSec < minAt) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function lastBlockInView(
  blocks: TimelineBlock[],
  viewRight: number,
  pps: number,
  from: number,
): number {
  const maxAt = viewRight / Math.max(1, pps);
  let lo = from;
  let hi = blocks.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (blocks[mid].atSec <= maxAt) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function blockOverlapsView(
  b: TimelineBlock,
  viewLeft: number,
  viewRight: number,
  pps: number,
  iconPx: number,
): boolean {
  const layout = blockLayoutPx(b, pps, iconPx);
  return layout.left + layout.width > viewLeft && layout.left < viewRight;
}

export function isViewUnmeasured(range: {
  left: number;
  right: number;
}): boolean {
  return range.left <= -1e8;
}

/**
 * Follow-now window before the scroller is measured. Mounts ~visible
 * seconds at the live head — never the whole fight, never an empty box.
 */
export function estimateViewRange(
  durSec: number,
  pps: number,
  follow: boolean,
): { left: number; right: number } {
  const viewW = TL_VIEW_ESTIMATE_W;
  const buf = TL_VIEW_BUF_PX;
  const contentW = Math.max(0, durSec * pps);
  const left = follow ? Math.max(0, contentW - viewW) : 0;
  const right = follow ? Math.max(viewW, contentW) : viewW;
  return { left: left - buf, right: right + buf };
}

/** Pick axis step so labels stay ~72+ px apart at the current scale. */
export function tickStepSec(pps: number): number {
  const candidates = [5, 10, 15, 30, 60, 120];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i] * pps >= TL_TICK_MIN_PX) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export type TlTick = {
  sec: number;
  left: number;
  /** Post-combat end marker only — never a live step tick (avoids is-last flip). */
  isEnd?: boolean;
};

/** Stable ticks from fight start — spacing adapts to px/sec zoom. */
export function buildTicks(
  pps: number,
  axisSec: number,
  includeEnd: boolean,
): TlTick[] {
  const step = tickStepSec(pps);
  // Floor so float duration never flickers the last step in/out each frame.
  const last = Math.max(0, Math.floor(axisSec + 1e-9));
  const ticks: TlTick[] = [{ sec: 0, left: 0 }];
  for (let s = step; s <= last; s += step) {
    ticks.push({ sec: s, left: Math.round(s * pps) });
  }
  if (includeEnd && last > 0) {
    const endLeft = Math.round(last * pps);
    const prev = ticks[ticks.length - 1];
    if (endLeft - prev.left > 24) {
      ticks.push({ sec: last, left: endLeft, isEnd: true });
    }
  }
  return ticks;
}

/** Dual-axis labels at the same X: fight elapsed (primary) or wall clock. */
export function axisTickNodes(
  ticks: TlTick[],
  kind: "fight" | "wall",
  originMs: number,
  viewLeft: number,
  viewRight: number,
): any[] {
  const slop = 48;
  const nodes: any[] = [];
  for (let i = 0; i < ticks.length; i++) {
    const t = ticks[i];
    if (t.left < viewLeft - slop || t.left > viewRight + slop) continue;
    const wall = kind === "wall" ? wallAtElapsed(originMs, t.sec) : "";
    const isFirst = t.sec === 0 && !t.isEnd;
    nodes.push(
      e(
        "span",
        {
          key: `${kind}-${t.isEnd ? "end" : t.sec}`,
          className:
            "ecu-meter-tl-tick" +
            (kind === "wall" ? " is-wall" : " is-fight") +
            (isFirst ? " is-first" : "") +
            (t.isEnd ? " is-last" : ""),
          style: { left: `${t.left}px` },
          title: kind === "fight" ? "Fight elapsed" : "Wall clock",
        },
        kind === "fight" ? fmtClock(t.sec) : wall || "—",
      ),
    );
  }
  return nodes;
}

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

export function blockLayoutPx(
  b: TimelineBlock,
  pps: number,
  iconPx: number,
): { left: number; width: number; showBar: boolean } {
  const left = Math.round(Math.max(0, b.atSec * pps));
  if (b.kind === "gear") {
    return { left, width: iconPx, showBar: false };
  }
  let visualDur = visualDurationSec(b);
  // Shared-CD spam: clip this cast’s bar so it ends before the next
  // same-skill icon. Each attack stays its own block + hitbox.
  if (b.kind === "cast" && b.nextSameAtSec != null) {
    const gapSec = TL_CAST_BAR_GAP_PX / Math.max(1, pps);
    visualDur = Math.min(
      visualDur,
      Math.max(0, b.nextSameAtSec - b.atSec - gapSec),
    );
  }
  const barPx = Math.round(visualDur * pps);
  const width = Math.max(iconPx, barPx);
  const barSpan = barPx - Math.round(iconPx / 2);
  const showBar = b.kind !== "death" && barSpan >= TL_BAR_MIN_PX;
  return { left, width, showBar };
}
