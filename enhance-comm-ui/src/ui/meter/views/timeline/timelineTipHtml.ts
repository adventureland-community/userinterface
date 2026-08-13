/**
 * Time Line cluster + gear/event cooltip HTML builders (pure).
 */

import {
  METER_TT_ICON,
  escapeHtml,
} from "../../../../meters/meterTooltip";
import type { TimelineBlock } from "./timelineModel";
import {
  blockCat,
  conditionElapsedSec,
  skillKey,
  TL_DEATH_W,
} from "./timelineModel";
import {
  blockCategoryLabel,
  blockIconHtml,
  fmtAt,
  gearItemIconHtml,
  gearItemLabel,
  gearItemNameOnly,
  gearSwapKind,
  prettySlot,
  tipAtLabel,
  wallAtElapsed,
} from "./timelineFormat";

export const NEARBY_WINDOW_SEC = 8;
/**
 * Prefer icons that overlap / sit within ~1 icon-width or ~2s of the
 * hover — tighter than ±8s at 88 px/s, where 8s is hundreds of px off-screen.
 */
export const NEARBY_CLUSTER_SEC = 2;

export const GEAR_TT_ICON = 40;

export function collectClusterBlocks(
  primary: TimelineBlock,
  nearby: TimelineBlock[],
): TimelineBlock[] {
  const all: TimelineBlock[] = [primary];
  for (let i = 0; i < nearby.length; i++) all.push(nearby[i]);
  return all;
}

export function clusterSameSecond(blocks: TimelineBlock[]): boolean {
  if (!blocks.length) return true;
  const sec = Math.floor(blocks[0].atSec);
  for (let i = 0; i < blocks.length; i++) {
    if (Math.floor(blocks[i].atSec) !== sec) return false;
  }
  return true;
}

/** Exact fight-elapsed stamp (same sample tick / identical `at` ms). */
export function clusterSameAtSec(blocks: TimelineBlock[]): boolean {
  if (!blocks.length) return true;
  const t = blocks[0].atSec;
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].atSec !== t) return false;
  }
  return true;
}

export function clusterWhenLabel(
  blocks: TimelineBlock[],
  originMs: number,
): string {
  if (!blocks.length) return "";
  let min = blocks[0].atSec;
  let max = blocks[0].atSec;
  for (let i = 1; i < blocks.length; i++) {
    const t = blocks[i].atSec;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  if (clusterSameAtSec(blocks) || clusterSameSecond(blocks)) {
    return tipAtLabel(originMs, min);
  }
  const wall = wallAtElapsed(originMs, min);
  const span = `${fmtAt(min)} – ${fmtAt(max)}`;
  return wall ? `${span} · ${wall}` : span;
}

export function tipClusterMetaHtml(who: string, whenLabel: string): string {
  const when = whenLabel
    ? `<span class="ecu-meter-tt-cluster-when">${escapeHtml(whenLabel)}</span>`
    : "";
  return `<div class="ecu-meter-tt-cluster-meta">
    <span class="ecu-meter-tt-cluster-who">${escapeHtml(who)}</span>
    ${when}
  </div>`;
}

function gearEmptySideHtml(): string {
  return `<div class="ecu-meter-tt-gear-side is-empty">
    <span class="ecu-meter-tt-gear-empty" style="width:${GEAR_TT_ICON}px;height:${GEAR_TT_ICON}px"></span>
    <span class="ecu-meter-tt-gear-text">
      <span class="ecu-meter-tt-gear-name">(empty)</span>
    </span>
  </div>`;
}

/**
 * One tip column: instance chrome + display name + muted item key.
 * Level lives on the instance pip (not duplicated in the name).
 */
function gearSideHtml(
  name: string | undefined,
  level: number | undefined,
  skin: string | undefined,
): string {
  if (!name) return gearEmptySideHtml();
  const display = gearItemNameOnly(name);
  const tipTitle = gearItemLabel(name, level);
  const icon = gearItemIconHtml(name, skin, GEAR_TT_ICON, tipTitle, {
    level,
    instance: true,
  });
  return `<div class="ecu-meter-tt-gear-side">
    <span class="ecu-meter-tt-gear-ico">${icon}</span>
    <span class="ecu-meter-tt-gear-text">
      <span class="ecu-meter-tt-gear-name">${escapeHtml(display)}</span>
      <span class="ecu-meter-tt-gear-key">${escapeHtml(name)}</span>
    </span>
  </div>`;
}

/**
 * One swap row: slot once, then aligned from | → | to columns.
 * No Equip/Unequip verbs, no mapIn/`in`. Time lives on cluster header
 * (or a quiet per-row at when the cluster spans seconds).
 */
export function tipGearRowHtml(
  b: TimelineBlock,
  muted: boolean,
  showAt: boolean,
  originMs: number,
): string {
  const tone = muted ? " is-muted" : "";
  const slot = b.slot ? prettySlot(b.slot) : "Slot";
  const kind = gearSwapKind(b.oldName, b.newName);
  let fromHtml: string;
  let toHtml: string;
  switch (kind) {
    case "swap":
      fromHtml = gearSideHtml(b.oldName, b.oldLevel, b.oldSkin);
      toHtml = gearSideHtml(b.newName, b.newLevel, b.skin);
      break;
    case "equip":
      fromHtml = gearEmptySideHtml();
      toHtml = gearSideHtml(b.newName, b.newLevel, b.skin);
      break;
    case "unequip":
      fromHtml = gearSideHtml(
        b.oldName,
        b.oldLevel,
        b.oldSkin || b.skin,
      );
      toHtml = gearEmptySideHtml();
      break;
    case "unknown":
      fromHtml = `<div class="ecu-meter-tt-gear-side"><span class="ecu-meter-tt-gear-text"><span class="ecu-meter-tt-gear-name">${escapeHtml(b.label || "Gear change")}</span></span></div>`;
      toHtml = gearEmptySideHtml();
      break;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }

  let atBit = "";
  if (showAt) {
    atBit = `<span class="ecu-meter-tt-gear-row-at">${escapeHtml(tipAtLabel(originMs, b.atSec))}</span>`;
  }

  return `<div class="ecu-meter-tt-gear-row${tone}">
    <div class="ecu-meter-tt-gear-row-head">
      <span class="ecu-meter-tt-gear-slot">${escapeHtml(slot)}</span>
      ${atBit}
    </div>
    <div class="ecu-meter-tt-gear-swap">
      ${fromHtml}
      <span class="ecu-meter-tt-gear-arrow" aria-hidden="true">→</span>
      ${toHtml}
    </div>
  </div>`;
}

/**
 * Cooltip for gear: one amber Gear header + player/time once, then
 * stacked lean swap rows. Nearby is same-`at` only (one sample tick’s
 * MH+OH), never ±2s neighbors from a later weapon swap-back.
 */
export function tipGearClusterHtml(
  primary: TimelineBlock,
  nearby: TimelineBlock[],
  actorName: string,
  originMs: number,
): string {
  const all = collectClusterBlocks(primary, nearby);
  all.sort((a, b) => {
    if (a.atSec !== b.atSec) return a.atSec - b.atSec;
    const sa = a.slot || "";
    const sb = b.slot || "";
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
  });

  const sameAt = clusterSameAtSec(all);
  const who = primary.source || actorName || "Unknown";
  const whenLabel = clusterWhenLabel(all, originMs);

  let rows = "";
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    rows += tipGearRowHtml(
      b,
      b.domKey !== primary.domKey,
      !sameAt,
      originMs,
    );
  }

  return `<div class="ecu-meter-tt-gear">
    <div class="ecu-meter-tt-tl-cat is-gear">Gear</div>
    ${tipClusterMetaHtml(who, whenLabel)}
    <div class="ecu-meter-tt-gear-list">${rows}</div>
  </div>`;
}

export function eventPillHtml(b: TimelineBlock): string {
  const cat = blockCat(b);
  let cls: string;
  let letter: string;
  switch (cat) {
    case "cast":
      cls = "is-cd";
      letter = "CD";
      break;
    case "buff":
      cls = "is-buff";
      letter = "Bf";
      break;
    case "debuff":
      cls = "is-debuff";
      letter = "Db";
      break;
    case "death":
      cls = "is-death";
      letter = "Dt";
      break;
    case "gear":
      cls = "is-gear";
      letter = "Gr";
      break;
    default: {
      const _exhaustive: never = cat;
      return _exhaustive;
    }
  }
  return `<span class="ecu-meter-tt-ev-pill ${cls}" title="${escapeHtml(blockCategoryLabel(b))}">${letter}</span>`;
}

/**
 * One dense CD/buff/debuff/death row: `[pill] icon Name [9.0s] [At]`.
 * Player name + shared time live on the cluster header.
 */
export function tipEventRowHtml(
  b: TimelineBlock,
  muted: boolean,
  showAt: boolean,
  originMs: number,
): string {
  const tone = muted ? " is-muted" : " is-primary";
  const icon = blockIconHtml(b, METER_TT_ICON);
  const elapsedSec = conditionElapsedSec(b);
  const elapsed =
    b.kind === "condition" && elapsedSec > 0
      ? `<span class="ecu-meter-tt-ev-elapsed">${elapsedSec.toFixed(1)}s</span>`
      : "";
  const at = showAt
    ? `<span class="ecu-meter-tt-ev-at">${escapeHtml(tipAtLabel(originMs, b.atSec))}</span>`
    : "";
  return `<div class="ecu-meter-tt-ev-row${tone}">
    ${eventPillHtml(b)}
    ${icon}
    <span class="ecu-meter-tt-ev-main"><span class="ecu-meter-tt-ev-name">${escapeHtml(b.label)}</span>${elapsed}</span>
    ${at}
  </div>`;
}

/**
 * Cooltip for casts/CDs, buffs, debuffs, deaths: player + time once, then
 * lean nearby-cluster rows (on-screen, ~2s) — no repeating Source/category.
 */
export function tipEventClusterHtml(
  primary: TimelineBlock,
  nearby: TimelineBlock[],
  actorName: string,
  originMs: number,
): string {
  const all = collectClusterBlocks(primary, nearby);
  all.sort((a, b) => {
    if (a.atSec !== b.atSec) return a.atSec - b.atSec;
    if (a.label < b.label) return -1;
    if (a.label > b.label) return 1;
    return 0;
  });

  const sameSecond = clusterSameSecond(all);
  const who = primary.source || actorName || "Unknown";
  const whenLabel = clusterWhenLabel(all, originMs);

  let rows = "";
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    rows += tipEventRowHtml(
      b,
      b.domKey !== primary.domKey,
      !sameSecond,
      originMs,
    );
  }

  return `<div class="ecu-meter-tt-evs">
    ${tipClusterMetaHtml(who, whenLabel)}
    <div class="ecu-meter-tt-evs-list">${rows}</div>
  </div>`;
}

export type NearbyView = {
  pps: number;
  iconPx: number;
  /** Canvas X of the left edge of the scroll viewport. */
  viewLeft: number;
  /** Canvas X of the right edge of the scroll viewport. */
  viewRight: number;
  /** Follow-now left pad (`--tl-pad`) before fight 00:00. */
  pad: number;
};

/** Icon / death-pin box in canvas coordinates (includes `--tl-pad`). */
export function blockCanvasBox(
  b: TimelineBlock,
  pps: number,
  iconPx: number,
  pad: number,
): { x: number; w: number } {
  const x = pad + Math.round(Math.max(0, b.atSec * pps));
  if (b.kind === "death") return { x: x - TL_DEATH_W / 2, w: TL_DEATH_W };
  return { x, w: iconPx };
}

export function blockIconInView(b: TimelineBlock, view: NearbyView): boolean {
  const box = blockCanvasBox(b, view.pps, view.iconPx, view.pad);
  return box.x + box.w > view.viewLeft && box.x < view.viewRight;
}

/**
 * ±8s cap (Details), but prefer ~2s or one icon-width — whichever is
 * larger at the current zoom — so the tip matches what’s around the hover.
 */
export function nearbyWindowSec(pps: number, iconPx: number): number {
  const iconSec = iconPx / Math.max(1, pps);
  return Math.min(NEARBY_WINDOW_SEC, Math.max(NEARBY_CLUSTER_SEC, iconSec));
}

export function timelineScrollView(from: EventTarget | null): {
  viewLeft: number;
  viewRight: number;
  pad: number;
} | null {
  const el = from instanceof Element ? from : null;
  const scroll = el && el.closest(".ecu-meter-tl-scroll");
  if (!(scroll instanceof HTMLElement)) return null;
  const root = scroll.closest(".ecu-meter-timeline");
  let pad = 0;
  if (root instanceof HTMLElement) {
    pad = parseFloat(root.style.getPropertyValue("--tl-pad")) || 0;
  }
  return {
    viewLeft: scroll.scrollLeft,
    viewRight: scroll.scrollLeft + scroll.clientWidth,
    pad,
  };
}

/**
 * Details `block_on_enter`: hovered block, then other spells on the same
 * player. Cooldown tab skips the *same spell id* (so Attack spam is not a
 * lane dump). We skip the hovered skill key for every kind so All mode
 * does not dump every repeat of the same cast.
 *
 * Gear pins: cluster **only** other gear swaps with the exact same
 * `atSec` (one `sampleGearSwaps` tick — e.g. MH+OH from one resend).
 * Do not pull in ±2s neighbors; a swap-back a fraction of a second later
 * is a separate pin and a separate tip.
 *
 * Non-gear nearby must be on this row, inside the cluster window, and
 * **currently visible in the scroll viewport**.
 */
export function nearbyBlocks(
  primary: TimelineBlock,
  laneBlocks: TimelineBlock[],
  view: NearbyView,
): TimelineBlock[] {
  if (primary.kind === "gear") {
    const nearby: TimelineBlock[] = [];
    for (let i = 0; i < laneBlocks.length; i++) {
      const o = laneBlocks[i];
      if (o.domKey === primary.domKey) continue;
      if (o.kind !== "gear") continue;
      if (o.atSec !== primary.atSec) continue;
      nearby.push(o);
    }
    nearby.sort((a, b) => {
      const sa = a.slot || "";
      const sb = b.slot || "";
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return 0;
    });
    return nearby;
  }

  const primaryKey = skillKey(primary);
  const windowSec = nearbyWindowSec(view.pps, view.iconPx);
  const bestByKey: Record<string, TimelineBlock> = {};
  for (let i = 0; i < laneBlocks.length; i++) {
    const o = laneBlocks[i];
    if (o.domKey === primary.domKey) continue;
    if (Math.abs(o.atSec - primary.atSec) > windowSec) continue;
    if (!blockIconInView(o, view)) continue;
    if (o.kind === "gear") continue;
    const k = skillKey(o);
    if (k === primaryKey) continue;
    const prev = bestByKey[k];
    if (
      !prev ||
      Math.abs(o.atSec - primary.atSec) < Math.abs(prev.atSec - primary.atSec)
    ) {
      bestByKey[k] = o;
    }
  }
  const nearby: TimelineBlock[] = [];
  const keys = Object.keys(bestByKey);
  for (let i = 0; i < keys.length; i++) nearby.push(bestByKey[keys[i]]);
  nearby.sort((a, b) => a.atSec - b.atSec);
  return nearby;
}

export function blockTooltipHtml(
  b: TimelineBlock,
  actorName: string,
  laneBlocks: TimelineBlock[],
  originMs: number,
  view: NearbyView,
): string {
  const nearby = nearbyBlocks(b, laneBlocks, view);
  if (b.kind === "gear") {
    return tipGearClusterHtml(b, nearby, actorName, originMs);
  }
  return tipEventClusterHtml(b, nearby, actorName, originMs);
}
