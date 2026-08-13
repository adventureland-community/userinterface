/**
 * Time Line — player rows × elapsed time axis.
 *
 * Live camera (not Details post-combat fit-to-width):
 * - Stable px/sec so past events never compress as the fight grows.
 * - 00:00 is the left of the *content* (fight start), not the viewport.
 * - While following, “now” stays pinned to the right of the visible track;
 *   new time extends the content and the past recedes left (rAF, no snap).
 * - Scroll left unlocks follow; scroll back to the live head re-locks.
 * - Fight end keeps the same scale (no fit-to-width crush).
 *
 * Modes: All (AL-only overlay) | Cooldowns | Debuffs | Buffs | Gear. Details
 * has exclusive tabs only (Cooldowns / Debuffs / Enemy Cast / Enemy Spells) —
 * no combined “All”. All stacks per-kind sub-lanes when a player has ≥2
 * categories. Blocks sit at true time × pps; cooltip is the hovered icon
 * plus nearby *other* skills on the same row whose icons are in the
 * scroll viewport and clustered around the hover (~1 icon / ~2s, cap
 * ±8s — Details block_on_enter, but never off-screen). Tips are lean:
 * player + time once, dense rows with a color pill (CD/Bf/Db/Dt).
 * Visual bar width still uses the 5–20s clamp; deaths are thin pins;
 * gear swaps are icon pins (item skin, no duration bar).
 *
 * Bar colors: green = buff, blue = cooldown/cast, red = debuff,
 * amber = gear. Player name colors are class colors, not bars.
 * Dual axis: fight elapsed (primary) + wall clock at the same X,
 * from segment origin; meta + cooltip still show both.
 *
 * Perf: keep all events in memory (8000-cast cap) but only *mount*
 * icons/bars in the scroll viewport ± buffer (DOM virtualization).
 * Before: O(n) React nodes per tick for the whole fight (~50k DOM at
 * 10 min × 6 players × ~1.5 Hz). After: O(visible seconds × players)
 * nodes (~80–200), independent of fight length.
 */

import { getReact, e } from "../../../host/react";
import { resolvePlayerCtype } from "../../../host/al";
import { classColors } from "../../../lib/colors";
import {
  conditionDisplayName,
  conditionKind,
  gameIconHtml,
  itemDisplayName,
  itemSkin,
  skillDisplayName,
  skinSheetHtml,
} from "../../../lib/gameIcon";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import type { PartyFocus } from "../../../lib/settingsFocus";
import { actorIdInScope } from "../../../meters/meterQuery";
import { getPlayerMeta, resolveSegment } from "../../../meters/meterEngine";
import {
  hideMeterTooltip,
  METER_TT_ICON,
  showMeterTooltip,
} from "../../../meters/meterTooltip";
import type {
  CastMarker,
  CombatSegment,
  ConditionInterval,
  DeathSnapshot,
  GearSwapEvent,
  MeterResult,
  SegmentRef,
} from "../../../meters/meterTypes";
import { injectMeterChromeCss } from "../meterChromeCss";

/** Details stacks nearby *other* spells within ±8s (cooltip only). */
const NEARBY_WINDOW_SEC = 8;
/**
 * Prefer icons that overlap / sit within ~1 icon-width or ~2s of the
 * hover — tighter than ±8s at 88 px/s, where 8s is hundreds of px off-screen.
 */
const NEARBY_CLUSTER_SEC = 2;
/** Death pin visual width (matches `.ecu-meter-tl-death`). */
const TL_DEATH_W = 4;

/** Skill/condition sprites on the lane. Must match --tl-icon. */
const TL_ICON = 28;
/**
 * Sprites when All mode splits a row into per-kind sub-lanes.
 * Sized to fill ~TL_SUB_ROW (not crumb-sized).
 */
const TL_ICON_SUB = 20;
/** Default player-row height (one kind only). Must match --tl-row. */
const TL_ROW = 36;
/**
 * Per-kind sub-lane height when a player mixes CD / buff / debuff.
 * 2 kinds → 52px row; 3 → 78px; 4 (incl. gear) → 104px.
 */
const TL_SUB_ROW = 26;
/** Frozen name gutter — match CSS `--tl-name-w` (not inside the x-scroller). */
const TL_NAME_W = 132;

/**
 * Default live scale. 88 px/s → 1s ≈ 3.1× a 28px icon; 1s-apart attacks
 * sit ~60px past icon overlap instead of stacking on one spot.
 */
const TL_PPS_BASE = 88;
const TL_PPS_MIN = 16;
const TL_PPS_MAX = 176;
const TL_ZOOM_STEP = 1.12;

/** Hide duration bars thinner than this (avoids 1–2px shimmer slivers). */
const TL_BAR_MIN_PX = 4;

/** Target minimum px between axis labels. */
const TL_TICK_MIN_PX = 72;

/** How close to the live head counts as “following now”. */
const TL_FOLLOW_SLACK = 28;

/**
 * Viewport ± this many px still mounts (covers 20s bars + scroll slack).
 * Quantize so slight scroll does not remount every icon.
 */
const TL_VIEW_BUF_PX = 480;
const TL_VIEW_SNAP_PX = 64;
/** First-paint sentinel — never use as a real cull box (would empty the track). */
const TL_VIEW_OPEN = { left: -1e9, right: 1e9 };
/** Unmeasured follow-window guess so we do not mount a 10-minute fight. */
const TL_VIEW_ESTIMATE_W = 960;
/**
 * Display-only: skip mounting identical cast icons closer than this.
 * Data stays in `lane.blocks` for cooltips. ~0.3s × 88 px/s ≈ one icon.
 */
const TL_COALESCE_SEC = 0.3;

/** Details SetSpellBlock clamps visual bar duration to 5–20s. */
const TL_VISUAL_DUR_MIN = 5;
const TL_VISUAL_DUR_MAX = 20;

/** Default cast/CD effect length when AL has no cooldown table (Details: 8). */
const TL_CAST_EFFECT_SEC = 8;

/**
 * Modes map to Details tabs we can approximate with AL data, plus All
 * (AL-only overlay — Details has no combined tab) and Gear (slot diffs).
 * Default All so cooldowns + buffs + debuffs + gear show together.
 */
type TlFilter = "all" | "cds" | "debuffs" | "buffs" | "gear";

type TlCat = "cast" | "buff" | "debuff" | "gear";

const TL_CAT_ORDER: TlCat[] = ["cast", "buff", "debuff", "gear"];

type TimelineBlock = {
  kind: "condition" | "cast" | "death" | "gear";
  /** Stable DOM / React key — one icon per event. */
  domKey: string;
  key: string;
  label: string;
  atSec: number;
  /** Real elapsed (cooltip). Visual width is clamped separately. */
  durationSec: number;
  /** Live aura start — cooltip elapsed uses Date.now() while open. */
  startedAtMs?: number;
  isOpen?: boolean;
  condKind?: "buff" | "debuff";
  source: string;
  actorId: string;
  /** Gear swap — equipped slot name (mainhand, chest, …). */
  slot?: string;
  /** Gear swap — previous item (unequip / replace). */
  oldName?: string;
  oldLevel?: number;
  oldSkin?: string;
  /** Gear swap — newly equipped item (equip / replace). */
  newName?: string;
  newLevel?: number;
  /** Prefer new item skin; else old (amber pin). */
  skin?: string;
};

type TimelineLane = {
  id: string;
  name: string;
  ctype?: string;
  blocks: TimelineBlock[];
  /** Distinct CD / buff / debuff kinds on this player (deaths ignored). */
  cats: TlCat[];
};

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function fmtAt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

/** Local wall-clock HH:MM:SS from epoch ms. */
function fmtWall(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Fight-relative atSec → wall clock using segment/timeline origin.
 * Origin is absolute ms (seg.startedAt / first event), same as axis 00:00.
 */
function wallAtElapsed(originMs: number, atSec: number): string {
  if (!(originMs > 0)) return "";
  return fmtWall(originMs + Math.max(0, atSec) * 1000);
}

/** Fight elapsed · wall clock, e.g. `1m 12s · 12:07:32`. */
function tipAtLabel(originMs: number, atSec: number): string {
  const wall = wallAtElapsed(originMs, atSec);
  return wall ? `${fmtAt(atSec)} · ${wall}` : fmtAt(atSec);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function prettySlot(slot: string): string {
  const spaced = slot.replace(/([0-9]+)$/, " $1");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function gearItemLabel(name: string | undefined, level?: number): string {
  if (!name) return "(empty)";
  const pretty = itemDisplayName(name);
  if (level != null && level > 0) return `${pretty} +${level}`;
  return pretty;
}

/** Item sprite for tip / pin — prefer event skin, else G.items[name].skin. */
function gearItemIconHtml(
  name: string | undefined,
  skin: string | undefined,
  size: number,
  title: string,
): string {
  const resolved = skin || (name ? itemSkin(name) : undefined);
  if (resolved) {
    const sheet = skinSheetHtml(resolved, size, title);
    if (sheet) return sheet;
  }
  if (name) return gameIconHtml(name, { kind: "item", size, title });
  return `<span class="ecu-meter-tt-gear-empty" style="width:${size}px;height:${size}px" title="empty"></span>`;
}

function prettyKey(key: string): string {
  if (!key) return "?";
  const cond = conditionDisplayName(key);
  if (cond !== key) return cond;
  const skill = skillDisplayName(key);
  if (skill !== key) return skill;
  return key.replace(/_/g, " ");
}

function buildActorMaps(segmentRef?: SegmentRef): {
  names: Record<string, string>;
  ctypes: Record<string, string | undefined>;
} {
  const names: Record<string, string> = {};
  const ctypes: Record<string, string | undefined> = {};
  const meta = getPlayerMeta();
  const metaIds = Object.keys(meta);
  for (let i = 0; i < metaIds.length; i++) {
    const id = metaIds[i];
    names[id] = meta[id].name;
    ctypes[id] = meta[id].ctype;
  }
  const seg = resolveSegment(segmentRef);
  if (seg) {
    const actorIds = Object.keys(seg.actors);
    for (let i = 0; i < actorIds.length; i++) {
      const a = seg.actors[actorIds[i]];
      names[a.id] = a.name || names[a.id] || a.id;
      ctypes[a.id] =
        a.ctype || ctypes[a.id] || resolvePlayerCtype(a.id) || undefined;
      if (!a.ctype && ctypes[a.id]) a.ctype = ctypes[a.id];
    }
  }
  return { names, ctypes };
}

function blockIconHtml(b: TimelineBlock, size: number): string {
  if (b.kind === "death") {
    return gameIconHtml("death", { kind: "death", size });
  }
  if (b.kind === "condition") {
    return gameIconHtml(b.key, {
      kind: "condition",
      size,
      title: b.label,
    });
  }
  if (b.kind === "gear") {
    return gearItemIconHtml(
      b.newName || b.oldName || b.key,
      b.skin,
      size,
      b.label,
    );
  }
  return gameIconHtml(b.key, { kind: "auto", size, title: b.label });
}

function blockCategoryLabel(b: TimelineBlock): string {
  if (b.kind === "death") return "Death";
  if (b.kind === "cast") return "Cooldown";
  if (b.kind === "gear") return "Gear";
  if (b.condKind === "debuff") return "Debuff";
  return "Buff";
}

function blockCat(b: TimelineBlock): TlCat | "death" {
  if (b.kind === "death") return "death";
  if (b.kind === "cast") return "cast";
  if (b.kind === "gear") return "gear";
  if (b.condKind === "debuff") return "debuff";
  return "buff";
}

function laneCatsFromBlocks(blocks: TimelineBlock[]): TlCat[] {
  const seen: Record<TlCat, boolean> = {
    cast: false,
    buff: false,
    debuff: false,
    gear: false,
  };
  for (let i = 0; i < blocks.length; i++) {
    const cat = blockCat(blocks[i]);
    if (cat !== "death") seen[cat] = true;
  }
  const out: TlCat[] = [];
  for (let i = 0; i < TL_CAT_ORDER.length; i++) {
    if (seen[TL_CAT_ORDER[i]]) out.push(TL_CAT_ORDER[i]);
  }
  return out;
}

/**
 * One kind (or deaths-only) → default full-height row.
 * Two+ kinds → taller row so each stacked sub-lane stays readable.
 * Never reserves empty category slots (cats only lists present kinds).
 */
function laneRowPx(cats: TlCat[]): number {
  if (cats.length >= 2) return cats.length * TL_SUB_ROW;
  return TL_ROW;
}

function skillKey(b: TimelineBlock): string {
  // Each gear swap is unique (slot + time) — don't collapse by item name
  // or hovering one pin stacks every nearby equipped item as a “loadout”.
  if (b.kind === "gear") return b.domKey;
  return `${b.kind}:${b.key}`;
}

/** Cooltip elapsed — live open auras tick at hover time, not last render. */
function conditionElapsedSec(b: TimelineBlock): number {
  if (b.kind !== "condition") return b.durationSec;
  if (b.isOpen && b.startedAtMs) {
    return Math.max(0, (Date.now() - b.startedAtMs) / 1000);
  }
  return b.durationSec;
}

/** Slightly larger than bar tips — lean gear rows stay short. */
const GEAR_TT_ICON = 26;

function collectClusterBlocks(
  primary: TimelineBlock,
  nearby: TimelineBlock[],
): TimelineBlock[] {
  const all: TimelineBlock[] = [primary];
  for (let i = 0; i < nearby.length; i++) all.push(nearby[i]);
  return all;
}

function clusterSameSecond(blocks: TimelineBlock[]): boolean {
  if (!blocks.length) return true;
  const sec = Math.floor(blocks[0].atSec);
  for (let i = 0; i < blocks.length; i++) {
    if (Math.floor(blocks[i].atSec) !== sec) return false;
  }
  return true;
}

function clusterWhenLabel(blocks: TimelineBlock[], originMs: number): string {
  if (!blocks.length) return "";
  let min = blocks[0].atSec;
  let max = blocks[0].atSec;
  for (let i = 1; i < blocks.length; i++) {
    const t = blocks[i].atSec;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  if (clusterSameSecond(blocks)) return tipAtLabel(originMs, min);
  const wall = wallAtElapsed(originMs, min);
  const span = `${fmtAt(min)} – ${fmtAt(max)}`;
  return wall ? `${span} · ${wall}` : span;
}

function tipClusterMetaHtml(who: string, whenLabel: string): string {
  const when = whenLabel
    ? `<span class="ecu-meter-tt-cluster-when">${escapeHtml(whenLabel)}</span>`
    : "";
  return `<div class="ecu-meter-tt-cluster-meta">
    <span class="ecu-meter-tt-cluster-who">${escapeHtml(who)}</span>
    ${when}
  </div>`;
}

/**
 * One dense gear row: `[slot]  old→new icons  names` (or Equip/Unequip).
 * At/Source/category live on the cluster header, not here.
 */
function tipGearRowHtml(
  b: TimelineBlock,
  muted: boolean,
  showAt: boolean,
  originMs: number,
): string {
  const tone = muted ? " is-muted" : "";
  const slot = b.slot ? prettySlot(b.slot) : "Slot";
  const hasOld = !!b.oldName;
  const hasNew = !!b.newName;
  const oldTitle = hasOld ? gearItemLabel(b.oldName, b.oldLevel) : "(empty)";
  const newTitle = hasNew ? gearItemLabel(b.newName, b.newLevel) : "(empty)";
  const oldIcon = gearItemIconHtml(
    b.oldName,
    b.oldSkin || (!hasNew ? b.skin : undefined),
    GEAR_TT_ICON,
    oldTitle,
  );
  const newIcon = gearItemIconHtml(b.newName, b.skin, GEAR_TT_ICON, newTitle);

  let icos: string;
  let names: string;
  if (hasOld && hasNew) {
    icos = `<span class="ecu-meter-tt-gear-icos">${oldIcon}<span class="ecu-meter-tt-gear-arrow" aria-hidden="true">→</span>${newIcon}</span>`;
    names = `<span class="ecu-meter-tt-gear-names"><span class="is-old">${escapeHtml(oldTitle)}</span><span class="ecu-meter-tt-gear-arrow-sm" aria-hidden="true">→</span><span class="is-new">${escapeHtml(newTitle)}</span></span>`;
  } else if (hasNew) {
    icos = `<span class="ecu-meter-tt-gear-icos is-single">${newIcon}</span>`;
    names = `<span class="ecu-meter-tt-gear-names"><span class="ecu-meter-tt-gear-verb">Equip</span> ${escapeHtml(newTitle)}</span>`;
  } else if (hasOld) {
    icos = `<span class="ecu-meter-tt-gear-icos is-single">${oldIcon}</span>`;
    names = `<span class="ecu-meter-tt-gear-names"><span class="ecu-meter-tt-gear-verb">Unequip</span> ${escapeHtml(oldTitle)}</span>`;
  } else {
    icos = `<span class="ecu-meter-tt-gear-icos is-single"></span>`;
    names = `<span class="ecu-meter-tt-gear-names">${escapeHtml(b.label || "Gear change")}</span>`;
  }

  let atBit = "";
  if (showAt) {
    atBit = `<span class="ecu-meter-tt-gear-row-at">${escapeHtml(tipAtLabel(originMs, b.atSec))}</span>`;
  }

  return `<div class="ecu-meter-tt-gear-row${tone}">
    <span class="ecu-meter-tt-gear-slot">${escapeHtml(slot)}</span>
    ${icos}
    ${names}
    ${atBit}
  </div>`;
}

/**
 * Cooltip for gear: one amber Gear header + player/time once, then
 * stacked lean swap rows (same-tick multi-slot without repeating At/Source).
 */
function tipGearClusterHtml(
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

  const sameSecond = clusterSameSecond(all);
  const who = primary.source || actorName || "Unknown";
  const whenLabel = clusterWhenLabel(all, originMs);

  let rows = "";
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    rows += tipGearRowHtml(
      b,
      b.domKey !== primary.domKey,
      !sameSecond,
      originMs,
    );
  }

  return `<div class="ecu-meter-tt-gear">
    <div class="ecu-meter-tt-tl-cat is-gear">Gear</div>
    ${tipClusterMetaHtml(who, whenLabel)}
    <div class="ecu-meter-tt-gear-list">${rows}</div>
  </div>`;
}

function eventPillHtml(b: TimelineBlock): string {
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
function tipEventRowHtml(
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
function tipEventClusterHtml(
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

type NearbyView = {
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
function blockCanvasBox(
  b: TimelineBlock,
  pps: number,
  iconPx: number,
  pad: number,
): { x: number; w: number } {
  const x = pad + Math.round(Math.max(0, b.atSec * pps));
  if (b.kind === "death") return { x: x - TL_DEATH_W / 2, w: TL_DEATH_W };
  return { x, w: iconPx };
}

function blockIconInView(b: TimelineBlock, view: NearbyView): boolean {
  const box = blockCanvasBox(b, view.pps, view.iconPx, view.pad);
  return box.x + box.w > view.viewLeft && box.x < view.viewRight;
}

/**
 * ±8s cap (Details), but prefer ~2s or one icon-width — whichever is
 * larger at the current zoom — so the tip matches what’s around the hover.
 */
function nearbyWindowSec(pps: number, iconPx: number): number {
  const iconSec = iconPx / Math.max(1, pps);
  return Math.min(NEARBY_WINDOW_SEC, Math.max(NEARBY_CLUSTER_SEC, iconSec));
}

function timelineScrollView(from: EventTarget | null): {
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
 * Gear pins are swap-only: nearby stacks other gear swaps in the window
 * (one row per slot change), never casts/buffs/debuffs — and never a
 * full current loadout.
 *
 * Nearby must be on this row, inside the cluster window, and **currently
 * visible in the scroll viewport** — ±8s at 88 px/s is ±704px and would
 * otherwise list Poison that is off-screen.
 */
function nearbyBlocks(
  primary: TimelineBlock,
  laneBlocks: TimelineBlock[],
  view: NearbyView,
): TimelineBlock[] {
  const primaryKey = skillKey(primary);
  const windowSec = nearbyWindowSec(view.pps, view.iconPx);
  const bestByKey: Record<string, TimelineBlock> = {};
  for (let i = 0; i < laneBlocks.length; i++) {
    const o = laneBlocks[i];
    if (o.domKey === primary.domKey) continue;
    if (Math.abs(o.atSec - primary.atSec) > windowSec) continue;
    if (!blockIconInView(o, view)) continue;
    // Gear tip = swaps only; non-gear tips still skip gear dumps of loadout.
    if (primary.kind === "gear") {
      if (o.kind !== "gear") continue;
    } else if (o.kind === "gear") {
      continue;
    }
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

function blockTooltipHtml(
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

function IconHost(props: { html: string; className?: string }): any {
  const React = getReact();
  const ref = React.useRef(null as HTMLSpanElement | null);
  const htmlRef = React.useRef("");
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || htmlRef.current === props.html) return;
    htmlRef.current = props.html;
    el.innerHTML = props.html;
  }, [props.html]);
  return e("span", { ref, className: props.className || undefined });
}

/**
 * Details SetSpellBlock: visual duration always clamped to 5–20s for bar width,
 * even when cooltip shows the real aura elapsed.
 */
function visualDurationSec(b: TimelineBlock): number {
  if (b.kind === "death" || b.kind === "gear") return 0;
  // Details: bar width from effect_time (fixed per event), not live-growing auras.
  const raw =
    b.kind === "cast"
      ? b.durationSec || TL_CAST_EFFECT_SEC
      : b.isOpen
        ? TL_CAST_EFFECT_SEC
        : Math.max(0, b.durationSec);
  return Math.max(
    TL_VISUAL_DUR_MIN,
    Math.min(TL_VISUAL_DUR_MAX, raw || TL_VISUAL_DUR_MIN),
  );
}

function eventsInScope<T>(
  items: T[],
  idOf: (item: T) => string,
  seg: CombatSegment | null | undefined,
  partyFocus: PartyFocus | undefined,
): T[] {
  if (!seg) return items;
  const out: T[] = [];
  for (let i = 0; i < items.length; i++) {
    if (actorIdInScope(idOf(items[i]), seg, partyFocus)) out.push(items[i]);
  }
  return out;
}

function laneIdFor(actorId: string, names: Record<string, string>): string {
  if (names[actorId]) return actorId;
  const ids = Object.keys(names);
  for (let i = 0; i < ids.length; i++) {
    if (names[ids[i]] === actorId) return ids[i];
  }
  return actorId;
}

/**
 * Always seed in-scope party/visible rows, even with zero events.
 * Virtualization must never drop lanes (empty “0 players” regression).
 */
function seedScopeLanes(
  byId: Record<string, TimelineLane>,
  ensure: (id: string, fallbackName?: string) => TimelineLane,
  seg: CombatSegment | null | undefined,
  partyFocus: PartyFocus | undefined,
): void {
  const meta = getPlayerMeta();
  const metaIds = Object.keys(meta);
  for (let i = 0; i < metaIds.length; i++) {
    const id = metaIds[i];
    if (seg && !actorIdInScope(id, seg, partyFocus)) continue;
    ensure(id, meta[id]?.name);
  }
  if (!seg) return;
  const actorIds = Object.keys(seg.actors);
  for (let i = 0; i < actorIds.length; i++) {
    const id = actorIds[i];
    if (!actorIdInScope(id, seg, partyFocus)) continue;
    const a = seg.actors[id];
    ensure(id, a.name);
  }
}

/**
 * Binary-search the first block whose time (plus max bar) may overlap
 * [viewLeft, viewRight] in content px. Blocks are sorted by atSec.
 */
function firstBlockInView(
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

function lastBlockInView(
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

function blockOverlapsView(
  b: TimelineBlock,
  viewLeft: number,
  viewRight: number,
  pps: number,
  iconPx: number,
): boolean {
  const layout = blockLayoutPx(b, pps, iconPx);
  return layout.left + layout.width > viewLeft && layout.left < viewRight;
}

function isViewUnmeasured(range: { left: number; right: number }): boolean {
  return range.left <= -1e8;
}

/**
 * Follow-now window before the scroller is measured. Mounts ~visible
 * seconds at the live head — never the whole fight, never an empty box.
 */
function estimateViewRange(
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

/** Cheap fingerprint so we rebuild lanes only when events/roster change. */
function laneDataSig(
  casts: CastMarker[],
  conditions: ConditionInterval[],
  gearSwaps: GearSwapEvent[],
  filter: TlFilter,
  start: number,
  rosterSig: string,
  deathCount: number,
): string {
  const c0 = casts.length ? casts[0].at : 0;
  const c1 = casts.length ? casts[casts.length - 1].at : 0;
  const g1 = gearSwaps.length ? gearSwaps[gearSwaps.length - 1].at : 0;
  let ended = 0;
  let lastCond = 0;
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    if (c.endedAt) ended++;
    if (c.startedAt > lastCond) lastCond = c.startedAt;
  }
  return `${filter}|${start}|${rosterSig}|${deathCount}|${casts.length}:${c0}:${c1}|${conditions.length}:${ended}:${lastCond}|${gearSwaps.length}:${g1}`;
}

function rosterSigNow(): string {
  const meta = getPlayerMeta();
  const ids = Object.keys(meta);
  ids.sort();
  let s = "";
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    s += `${id}:${meta[id].name}:${meta[id].ctype || ""};`;
  }
  return s;
}

function conditionsEndedCount(cs: ConditionInterval[]): number {
  let n = 0;
  for (let i = 0; i < cs.length; i++) {
    if (cs[i].endedAt) n++;
  }
  return n;
}

function timelineOriginMs(
  seg: { startedAt?: number; endedAt?: number } | null | undefined,
  casts: CastMarker[],
  conditions: ConditionInterval[],
  deaths: Array<{ at: number }>,
  gearSwaps: Array<{ at: number }>,
  now: number,
): number {
  let start = now;
  if (seg && seg.startedAt) start = seg.startedAt;
  for (let i = 0; i < conditions.length; i++) {
    start = Math.min(start, conditions[i].startedAt);
  }
  for (let i = 0; i < casts.length; i++) {
    start = Math.min(start, casts[i].at);
  }
  for (let i = 0; i < deaths.length; i++) {
    start = Math.min(start, deaths[i].at);
  }
  for (let i = 0; i < gearSwaps.length; i++) {
    start = Math.min(start, gearSwaps[i].at);
  }
  return start;
}

/** Pick axis step so labels stay ~72+ px apart at the current scale. */
function tickStepSec(pps: number): number {
  const candidates = [5, 10, 15, 30, 60, 120];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i] * pps >= TL_TICK_MIN_PX) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

type TlTick = {
  sec: number;
  left: number;
  /** Post-combat end marker only — never a live step tick (avoids is-last flip). */
  isEnd?: boolean;
};

/** Stable ticks from fight start — spacing adapts to px/sec zoom. */
function buildTicks(
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
function axisTickNodes(
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

type TimelineEventProps = {
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

function blockLayoutPx(
  b: TimelineBlock,
  pps: number,
  iconPx: number,
): { left: number; width: number; showBar: boolean } {
  const left = Math.round(Math.max(0, b.atSec * pps));
  if (b.kind === "gear") {
    return { left, width: iconPx, showBar: false };
  }
  const visualDur = visualDurationSec(b);
  const width = Math.max(iconPx, Math.round(visualDur * pps));
  const barSpan = width - Math.round(iconPx / 2);
  const showBar = b.kind !== "death" && barSpan >= TL_BAR_MIN_PX;
  return { left, width, showBar };
}

function timelineEventEqual(
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
 * Hover is icon-centric (Details block is tiny at fit-to-width; our 88 px/s
 * duration strip is hundreds of px). The duration bar is visual-only so empty
 * chrome / bar tails do not dump a lane tooltip.
 */
function TimelineEventInner(props: TimelineEventProps): any {
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
    showMeterTooltip(ev, tip(ev));
  };
  const onMove = (ev: MouseEvent) => {
    showMeterTooltip(ev, tip(ev));
  };
  const onLeave = () => hideMeterTooltip();
  // Later events paint above earlier ones; CSS :hover lifts further.
  const z = props.stackIndex + 1;
  const split = props.subIndex >= 0 && props.subCount >= 2;

  if (b.kind === "death") {
    return e("div", {
      className: "ecu-meter-tl-death",
      style: { left: `${layout.left}px`, zIndex: z },
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
      style: {
        left: `${layout.left}px`,
        width: `${layout.width}px`,
        zIndex: z,
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
    }),
    layout.showBar ? e("div", { className: "ecu-meter-tl-block-bar" }) : null,
    e("div", {
      className: "ecu-meter-tl-block-hit",
      onMouseEnter: onEnter,
      onMouseMove: onMove,
      onMouseLeave: onLeave,
    }),
  );
}

/**
 * Lazy React.memo — never call getReact() at module top-level.
 * The userscript IIFE evaluates imports at inject time (document-start),
 * before the game (or ensureReact) puts React on window.
 */
let TimelineEvent: any = null;

function buildLanes(
  casts: CastMarker[],
  conditions: ConditionInterval[],
  deaths: Array<{ id: string; name: string; at: number }>,
  gearSwaps: GearSwapEvent[],
  start: number,
  filter: TlFilter,
  names: Record<string, string>,
  ctypes: Record<string, string | undefined>,
  seg?: CombatSegment | null,
  partyFocus?: PartyFocus,
): TimelineLane[] {
  const byId: Record<string, TimelineLane> = {};

  const ensure = (id: string, fallbackName?: string): TimelineLane => {
    const lid = laneIdFor(id, names);
    if (!byId[lid]) {
      byId[lid] = {
        id: lid,
        name: names[lid] || fallbackName || names[id] || id,
        ctype: ctypes[lid] || ctypes[id],
        blocks: [],
        cats: [],
      };
    }
    return byId[lid];
  };

  seedScopeLanes(byId, ensure, seg, partyFocus);

  const wantCds = filter === "all" || filter === "cds";
  const wantBuffs = filter === "all" || filter === "buffs";
  const wantDebuffs = filter === "all" || filter === "debuffs";
  const wantGear = filter === "all" || filter === "gear";

  if (wantBuffs || wantDebuffs) {
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      const ck = conditionKind(c.key);
      if (ck === "buff" && !wantBuffs) continue;
      if (ck === "debuff" && !wantDebuffs) continue;
      const lane = ensure(c.actorId);
      const t0 = Math.max(0, (c.startedAt - start) / 1000);
      // Open auras: cooltip uses Date.now(); do not grow durationSec every tick.
      const t1 = c.endedAt ? Math.max(t0, (c.endedAt - start) / 1000) : t0;
      lane.blocks.push({
        kind: "condition",
        domKey: `cond:${c.actorId}:${c.startedAt}:${c.key}`,
        key: c.key,
        label: prettyKey(c.key),
        atSec: t0,
        durationSec: t1 - t0,
        startedAtMs: c.startedAt,
        isOpen: !c.endedAt,
        condKind: ck,
        source: lane.name,
        actorId: c.actorId,
      });
    }
  }

  if (wantCds) {
    // Cooldowns — AL casts stand in for CLEU cooldown hooks.
    for (let i = 0; i < casts.length; i++) {
      const c = casts[i];
      const lane = ensure(c.actorId);
      const t0 = Math.max(0, (c.at - start) / 1000);
      const src = c.source || "attack";
      lane.blocks.push({
        kind: "cast",
        domKey: `cast:${c.actorId}:${c.at}:${c.pid ?? ""}:${src}`,
        key: src,
        label: prettyKey(src),
        atSec: t0,
        durationSec: TL_CAST_EFFECT_SEC,
        source: lane.name,
        actorId: c.actorId,
      });
    }
  }

  if (wantGear) {
    for (let i = 0; i < gearSwaps.length; i++) {
      const g = gearSwaps[i];
      const itemName = g.newName || g.oldName;
      if (!itemName) continue;
      const lane = ensure(g.actorId);
      const t0 = Math.max(0, (g.at - start) / 1000);
      const label = gearItemLabel(
        itemName,
        g.newName ? g.newLevel : g.oldLevel,
      );
      const oldSkin = g.oldName ? itemSkin(g.oldName) || undefined : undefined;
      lane.blocks.push({
        kind: "gear",
        domKey: `gear:${g.actorId}:${g.at}:${g.slot}:${itemName}`,
        key: itemName,
        label,
        atSec: t0,
        durationSec: 0,
        source: lane.name,
        actorId: g.actorId,
        slot: g.slot,
        oldName: g.oldName,
        oldLevel: g.oldLevel,
        oldSkin,
        newName: g.newName,
        newLevel: g.newLevel,
        skin: g.skin || oldSkin || itemSkin(itemName),
      });
    }
  }

  // Death pins on every mode (Details PlaceDeathPins on CD/Debuff rows).
  for (let i = 0; i < deaths.length; i++) {
    const d = deaths[i];
    const lane = ensure(d.id, d.name);
    const t0 = Math.max(0, (d.at - start) / 1000);
    lane.blocks.push({
      kind: "death",
      domKey: `death:${d.id}:${d.at}`,
      key: "death",
      label: `${d.name || lane.name} died`,
      atSec: t0,
      durationSec: 0,
      source: lane.name,
      actorId: d.id,
    });
  }

  const ids = Object.keys(byId);
  ids.sort((a, b) => {
    const na = byId[a].name.toLowerCase();
    const nb = byId[b].name.toLowerCase();
    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
  });
  const lanes: TimelineLane[] = [];
  for (let i = 0; i < ids.length; i++) {
    const lane = byId[ids[i]];
    lane.blocks.sort((x, y) => x.atSec - y.atSec);
    lane.cats = laneCatsFromBlocks(lane.blocks);
    lanes.push(lane);
  }
  return lanes;
}

type TimelineViewInnerProps = {
  result: MeterResult;
  segmentRef?: SegmentRef;
  partyFocus?: PartyFocus;
  rosterSig: string;
  deathCount: number;
  combatLive: boolean;
};

function timelineInnerEqual(
  prev: TimelineViewInnerProps,
  next: TimelineViewInnerProps,
): boolean {
  if (prev.segmentRef !== next.segmentRef) return false;
  if (prev.partyFocus !== next.partyFocus) return false;
  if (prev.rosterSig !== next.rosterSig) return false;
  if (prev.deathCount !== next.deathCount) return false;
  if (prev.combatLive !== next.combatLive) return false;
  const a = prev.result;
  const b = next.result;
  if (a.kind !== b.kind) return false;
  if (a.kind !== "timeline" || b.kind !== "timeline") return true;
  if (a.casts.length !== b.casts.length) return false;
  if (a.conditions.length !== b.conditions.length) return false;
  const ga = a.gearSwaps || [];
  const gb = b.gearSwaps || [];
  if (ga.length !== gb.length) return false;
  if (a.casts.length) {
    if (a.casts[0].at !== b.casts[0].at) return false;
    if (a.casts[a.casts.length - 1].at !== b.casts[b.casts.length - 1].at) {
      return false;
    }
  }
  if (a.conditions.length) {
    if (a.conditions[0].startedAt !== b.conditions[0].startedAt) return false;
    if (
      a.conditions[a.conditions.length - 1].startedAt !==
      b.conditions[b.conditions.length - 1].startedAt
    ) {
      return false;
    }
    if (
      conditionsEndedCount(a.conditions) !== conditionsEndedCount(b.conditions)
    ) {
      return false;
    }
  }
  if (ga.length && ga[ga.length - 1].at !== gb[gb.length - 1].at) return false;
  return true;
}

let MeterTimelineMemo: any = null;

function MeterTimelineViewInner(props: TimelineViewInnerProps): any {
  const React = getReact();
  if (!TimelineEvent) {
    TimelineEvent = React.memo(TimelineEventInner, timelineEventEqual);
  }
  // Default All — show cooldowns + buffs + debuffs together.
  const [filter, setFilter] = React.useState("all" as TlFilter);
  const [selectedId, setSelectedId] = React.useState(null as string | null);
  const [zoom, setZoom] = React.useState(1);
  const [rulerTicks, setRulerTicks] = React.useState([] as TlTick[]);
  const [viewRange, setViewRange] = React.useState(TL_VIEW_OPEN);
  const viewSnapRef = React.useRef("");
  const rootRef = React.useRef(null as HTMLDivElement | null);
  const scrollRef = React.useRef(null as HTMLDivElement | null);
  const gutterRef = React.useRef(null as HTMLDivElement | null);
  const gutterRowsRef = React.useRef(null as HTMLDivElement | null);
  const followRef = React.useRef(true);
  const applyingScrollRef = React.useRef(false);
  const isLiveRef = React.useRef(false);
  const startRef = React.useRef(0);
  const durSecRef = React.useRef(1);
  const tickSigRef = React.useRef("");
  const layoutCacheRef = React.useRef({
    contentW: -1,
    pad: -1,
    trackW: -1,
    pps: -1,
    clock: null as Element | null,
    wall: null as Element | null,
    scale: null as Element | null,
  });
  const laneCacheRef = React.useRef({
    sig: "",
    lanes: [] as TimelineLane[],
  });
  const laneBlocksRef = React.useRef({} as Record<string, TimelineBlock[]>);
  const originPinRef = React.useRef(null as number | null);
  const pps = TL_PPS_BASE * zoom;
  const ppsRef = React.useRef(pps);
  ppsRef.current = pps;

  const isTimeline = props.result.kind === "timeline";
  const seg = resolveSegment(props.segmentRef);
  const isLive = !!(isTimeline && props.combatLive);
  const durationMs =
    props.result.kind === "timeline" ? props.result.durationMs : 0;
  const casts = isTimeline
    ? eventsInScope(
        props.result.casts,
        (c: CastMarker) => c.actorId,
        seg,
        props.partyFocus,
      )
    : [];
  const conditions = isTimeline
    ? eventsInScope(
        props.result.conditions,
        (c: ConditionInterval) => c.actorId,
        seg,
        props.partyFocus,
      )
    : [];
  const deaths = eventsInScope(
    seg ? seg.deaths : [],
    (d: DeathSnapshot) => d.id,
    seg,
    props.partyFocus,
  );
  const gearSwaps = isTimeline
    ? eventsInScope(
        props.result.gearSwaps || [],
        (g: GearSwapEvent) => g.actorId,
        seg,
        props.partyFocus,
      )
    : [];
  const now = seg && seg.endedAt ? seg.endedAt : Date.now();
  // Skip O(n) origin scan once the fight start is pinned.
  const rawStart = !isTimeline
    ? now
    : originPinRef.current != null
      ? originPinRef.current
      : timelineOriginMs(seg, casts, conditions, deaths, gearSwaps, now);
  // Freeze origin once we have a real fight anchor so live ticks never shift X.
  React.useEffect(() => {
    originPinRef.current = null;
  }, [props.segmentRef]);
  if (isTimeline) {
    const hasAnchor =
      !!(seg && seg.startedAt) ||
      casts.length > 0 ||
      conditions.length > 0 ||
      deaths.length > 0 ||
      gearSwaps.length > 0;
    if (hasAnchor && originPinRef.current == null) {
      originPinRef.current = rawStart;
    }
  }
  const start =
    isTimeline && originPinRef.current != null
      ? originPinRef.current
      : rawStart;
  const durSec = isLive
    ? Math.max((now - start) / 1000, 1 / pps)
    : Math.max(durationMs / 1000, 1 / pps);

  isLiveRef.current = isLive;
  startRef.current = start;
  durSecRef.current = durSec;

  const syncGutterY = React.useCallback(() => {
    const rows = gutterRowsRef.current;
    const scroll = scrollRef.current;
    if (!rows || !scroll) return;
    const y = Math.round(scroll.scrollTop);
    rows.style.transform = y ? `translate3d(0, ${-y}px, 0)` : "";
  }, []);

  const publishViewRange = React.useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll || scroll.clientWidth <= 0) return;
    const pad = layoutCacheRef.current.pad > 0 ? layoutCacheRef.current.pad : 0;
    const left = scroll.scrollLeft - pad;
    const right = left + scroll.clientWidth;
    const snap = TL_VIEW_SNAP_PX;
    const buf = TL_VIEW_BUF_PX;
    const qLeft = Math.floor((left - buf) / snap) * snap;
    const qRight = Math.ceil((right + buf) / snap) * snap;
    const sig = `${qLeft}:${qRight}`;
    if (sig === viewSnapRef.current) return;
    viewSnapRef.current = sig;
    setViewRange({ left: qLeft, right: qRight });
  }, []);

  const applyLayout = React.useCallback(() => {
    const root = rootRef.current;
    const scroll = scrollRef.current;
    if (!root || !scroll) return;
    const ppsNow = ppsRef.current;
    const cache = layoutCacheRef.current;
    if (cache.pps !== ppsNow) {
      cache.pps = ppsNow;
      root.style.setProperty("--tl-pps", String(ppsNow));
    }
    const viewTrackW = Math.max(120, scroll.clientWidth);
    const elapsed = isLiveRef.current
      ? Math.max((Date.now() - startRef.current) / 1000, 1 / ppsNow)
      : Math.max(durSecRef.current, 1 / ppsNow);
    const contentWR = Math.ceil(elapsed * ppsNow);
    const padR = followRef.current ? Math.max(0, viewTrackW - contentWR) : 0;
    const trackWR = padR + contentWR;
    // Always re-apply — React style diffs must not leave a stale 100% track
    // width that clips fight history when scrollLeft moves left of “now”.
    if (
      cache.contentW !== contentWR ||
      cache.pad !== padR ||
      cache.trackW !== trackWR
    ) {
      cache.contentW = contentWR;
      cache.pad = padR;
      cache.trackW = trackWR;
    }
    root.style.setProperty("--tl-pad", `${padR}px`);
    root.style.setProperty("--tl-content-w", `${contentWR}px`);
    root.style.setProperty("--tl-track-w", `${trackWR}px`);
    if (!cache.clock || !root.contains(cache.clock)) {
      cache.clock = root.querySelector("[data-tl-clock]");
      cache.wall = root.querySelector("[data-tl-wall]");
      cache.scale = root.querySelector("[data-tl-scale]");
    }
    if (cache.clock) cache.clock.textContent = fmtClock(elapsed);
    if (cache.wall) {
      cache.wall.textContent = fmtWall(startRef.current + elapsed * 1000);
    }
    if (cache.scale) cache.scale.textContent = `${Math.round(ppsNow)} px/s`;
    // Grow the ruler only when the discrete step list changes (not every frame).
    const step = tickStepSec(ppsNow);
    const last = Math.max(0, Math.floor(elapsed + 1e-9));
    const includeEnd = !isLiveRef.current;
    const lastStep = Math.floor(last / step) * step;
    const sig = `${ppsNow}:${step}:${lastStep}:${includeEnd ? last : 0}`;
    if (sig !== tickSigRef.current) {
      tickSigRef.current = sig;
      setRulerTicks(buildTicks(ppsNow, elapsed, includeEnd));
    }
    if (followRef.current) {
      // Pin “now” to the right edge as content grows — only nudge scroll
      // when the target moves >0.5px to avoid subpixel shimmer.
      applyingScrollRef.current = true;
      const target = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      if (Math.abs(scroll.scrollLeft - target) > 0.5) {
        scroll.scrollLeft = target;
      }
      applyingScrollRef.current = false;
    }
    syncGutterY();
    publishViewRange();
  }, [publishViewRange, syncGutterY]);

  React.useEffect(() => {
    injectMeterChromeCss();
    return () => hideMeterTooltip();
  }, []);

  React.useEffect(() => {
    followRef.current = true;
    layoutCacheRef.current = {
      contentW: -1,
      pad: -1,
      trackW: -1,
      pps: -1,
      clock: null,
      wall: null,
      scale: null,
    };
    tickSigRef.current = "";
    viewSnapRef.current = "";
  }, [start]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      syncGutterY();
      publishViewRange();
      if (applyingScrollRef.current) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      if (max <= TL_FOLLOW_SLACK) {
        followRef.current = true;
        return;
      }
      followRef.current = el.scrollLeft >= max - TL_FOLLOW_SLACK;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isTimeline, publishViewRange, syncGutterY]);

  React.useEffect(() => {
    const gutter = gutterRef.current;
    const scroll = scrollRef.current;
    if (!gutter || !scroll) return;
    const onWheel = (ev: WheelEvent) => {
      scroll.scrollTop += ev.deltaY;
      scroll.scrollLeft += ev.deltaX;
      ev.preventDefault();
    };
    gutter.addEventListener("wheel", onWheel, { passive: false });
    return () => gutter.removeEventListener("wheel", onWheel);
  }, [isTimeline]);

  React.useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? TL_ZOOM_STEP : 1 / TL_ZOOM_STEP;
      setZoom((z) => {
        const minZ = TL_PPS_MIN / TL_PPS_BASE;
        const maxZ = TL_PPS_MAX / TL_PPS_BASE;
        return Math.max(minZ, Math.min(maxZ, z * factor));
      });
    };
    scroll.addEventListener("wheel", onWheel, { passive: false });
    return () => scroll.removeEventListener("wheel", onWheel);
  }, [isTimeline]);

  React.useLayoutEffect(() => {
    applyLayout();
    const scroll = scrollRef.current;
    const ro =
      scroll && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => applyLayout())
        : null;
    if (scroll && ro) ro.observe(scroll);
    if (!isLive) return () => ro && ro.disconnect();
    let raf = 0;
    const loop = () => {
      applyLayout();
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [applyLayout, isLive, isTimeline, start, zoom]);

  if (!isTimeline) {
    return e(
      "div",
      { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
      "No timeline",
    );
  }

  const { names, ctypes } = buildActorMaps(props.segmentRef);
  const nextLaneSig = isTimeline
    ? laneDataSig(
        casts,
        conditions,
        gearSwaps,
        filter,
        start,
        props.rosterSig,
        props.deathCount,
      )
    : "";
  if (isTimeline && laneCacheRef.current.sig !== nextLaneSig) {
    laneCacheRef.current = {
      sig: nextLaneSig,
      lanes: buildLanes(
        casts,
        conditions,
        deaths,
        gearSwaps,
        start,
        filter,
        names,
        ctypes,
        seg,
        props.partyFocus,
      ),
    };
  }
  const lanes = isTimeline ? laneCacheRef.current.lanes : [];
  const laneBlocksMap: Record<string, TimelineBlock[]> = {};
  for (let i = 0; i < lanes.length; i++) {
    laneBlocksMap[lanes[i].id] = lanes[i].blocks;
  }
  laneBlocksRef.current = laneBlocksMap;
  // Prefer rAF-synced ruler ticks; fall back for first paint / ended fights.
  const ticks =
    rulerTicks.length > 0 ? rulerTicks : buildTicks(pps, durSec, !isLive);
  const renderRange = isViewUnmeasured(viewRange)
    ? estimateViewRange(durSec, pps, followRef.current)
    : viewRange;

  const selectLane = (laneId: string) => {
    setSelectedId(selectedId === laneId ? null : laneId);
  };

  const gutterLane = (lane: TimelineLane, li: number) => {
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
  };

  const trackLane = (lane: TimelineLane, li: number) => {
    // One kind only → full-height bar + large icons (same as exclusive tabs).
    // Two+ kinds → taller stacked sub-lanes (no empty category slots).
    const split = lane.cats.length >= 2;
    const rowH = laneRowPx(lane.cats);
    const iconPx = split ? TL_ICON_SUB : TL_ICON;
    const from = firstBlockInView(lane.blocks, renderRange.left, pps);
    const to = lastBlockInView(lane.blocks, renderRange.right, pps, from);
    const eventNodes: any[] = [];
    let lastCastKey = "";
    let lastCastAt = -1e9;
    for (let bi = from; bi < to; bi++) {
      const b = lane.blocks[bi];
      if (
        !blockOverlapsView(b, renderRange.left, renderRange.right, pps, iconPx)
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
        e(TimelineEvent, {
          key: b.domKey,
          block: b,
          laneId: lane.id,
          laneBlocksRef,
          originMs: start,
          pps,
          actorName: lane.name,
          stackIndex: bi,
          iconPx,
          subIndex,
          subCount: split ? lane.cats.length : 1,
        }),
      );
    }
    const gridNodes: any[] = [];
    for (let i = 1; i < ticks.length; i++) {
      const t = ticks[i];
      if (t.left < renderRange.left - 8 || t.left > renderRange.right + 8) {
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
          (selectedId === lane.id ? " is-selected" : "") +
          (split ? " is-split" : ""),
        style: {
          height: `${rowH}px`,
          minHeight: `${rowH}px`,
          maxHeight: `${rowH}px`,
        },
        onClick: () => selectLane(lane.id),
      },
      e(
        "div",
        { className: "ecu-meter-tl-track" },
        e(
          "div",
          { className: "ecu-meter-tl-axis" },
          ...gridNodes,
          ...eventNodes,
        ),
      ),
    );
  };

  const filterTabs: Array<{ id: TlFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "cds", label: "Cooldowns" },
    { id: "debuffs", label: "Debuffs" },
    { id: "buffs", label: "Buffs" },
    { id: "gear", label: "Gear" },
  ];

  const legendItems: Array<{ cls: string; label: string }> =
    filter === "cds"
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

  const emptyMsg =
    filter === "all"
      ? "No cast / condition / gear markers yet."
      : filter === "cds"
        ? "No cast / cooldown markers yet."
        : filter === "debuffs"
          ? "No debuffs recorded yet."
          : filter === "gear"
            ? "No gear swaps recorded yet."
            : "No buffs recorded yet.";

  return e(
    "div",
    {
      className: "ecu-meter-timeline",
      ref: rootRef,
      style: { ...PIXEL_TEXT },
    },
    e(
      "div",
      { className: "ecu-meter-timeline-hd" },
      e("div", { className: "ecu-meter-timeline-mark" }, "Time Line"),
      e(
        "div",
        { className: "ecu-meter-timeline-tools" },
        ...filterTabs.map((f) =>
          e(
            "button",
            {
              key: f.id,
              type: "button",
              className:
                "ecu-meter-tl-mode" + (filter === f.id ? " is-active" : ""),
              onClick: () => setFilter(f.id),
            },
            f.label,
          ),
        ),
        e(
          "span",
          { className: "ecu-meter-timeline-meta" },
          e(
            "span",
            {
              "data-tl-clock": "",
              title: "Fight elapsed (from pull start)",
            },
            fmtClock(durSec),
          ),
          " · ",
          e(
            "span",
            {
              "data-tl-wall": "",
              title: "Wall-clock time",
            },
            fmtWall(start + durSec * 1000),
          ),
          e("span", { "data-tl-scale": "" }, `${Math.round(pps)} px/s`),
          isLive ? " · in combat" : "",
          deaths.length ? ` · ${deaths.length} deaths` : "",
          ` · ${lanes.length} players`,
          " · Ctrl+wheel zoom",
        ),
      ),
      e(
        "div",
        { className: "ecu-meter-tl-legend", "aria-label": "Bar colors" },
        ...legendItems.map((item) =>
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
      ),
    ),
    e(
      "div",
      { className: "ecu-meter-tl-body" },
      e(
        "div",
        { className: "ecu-meter-tl-gutter", ref: gutterRef },
        e(
          "div",
          { className: "ecu-meter-tl-gutter-ruler", "aria-hidden": true },
          e(
            "span",
            { className: "ecu-meter-tl-gutter-axis-lab is-fight" },
            "Fight",
          ),
          e(
            "span",
            { className: "ecu-meter-tl-gutter-axis-lab is-clock" },
            "Clock",
          ),
        ),
        e(
          "div",
          { className: "ecu-meter-tl-gutter-rows", ref: gutterRowsRef },
          lanes.length === 0
            ? e("div", { className: "ecu-meter-tl-gutter-empty" })
            : lanes.map(gutterLane),
        ),
      ),
      e(
        "div",
        { className: "ecu-meter-tl-scroll", ref: scrollRef },
        e(
          "div",
          { className: "ecu-meter-tl-canvas" },
          // Live playhead at true “now” X (right edge while follow-pinned).
          // Omit post-combat — end-of-content would read as a permanent
          // gold right-edge chrome bar / fake scrollbar.
          isLive
            ? e("div", { className: "ecu-meter-tl-now", "aria-hidden": true })
            : null,
          e(
            "div",
            { className: "ecu-meter-tl-ruler" },
            e(
              "div",
              { className: "ecu-meter-tl-ruler-track" },
              e(
                "div",
                { className: "ecu-meter-tl-axis is-fight" },
                ...axisTickNodes(
                  ticks,
                  "fight",
                  start,
                  renderRange.left,
                  renderRange.right,
                ),
              ),
              e(
                "div",
                { className: "ecu-meter-tl-axis is-wall" },
                ...axisTickNodes(
                  ticks,
                  "wall",
                  start,
                  renderRange.left,
                  renderRange.right,
                ),
              ),
            ),
          ),
          lanes.length === 0
            ? e("div", { className: "ecu-meter-tl-empty" }, emptyMsg)
            : e(
                "div",
                { className: "ecu-meter-tl-lanes" },
                ...lanes.map(trackLane),
              ),
        ),
      ),
    ),
  );
}

export function MeterTimelineView(props: {
  result: MeterResult;
  segmentRef?: SegmentRef;
  partyFocus?: PartyFocus;
}): any {
  const React = getReact();
  if (!MeterTimelineMemo) {
    MeterTimelineMemo = React.memo(MeterTimelineViewInner, timelineInnerEqual);
  }
  const seg = resolveSegment(props.segmentRef);
  return e(MeterTimelineMemo, {
    result: props.result,
    segmentRef: props.segmentRef,
    partyFocus: props.partyFocus,
    rosterSig: rosterSigNow(),
    deathCount: seg ? seg.deaths.length : 0,
    combatLive: !!(seg && seg.endedAt == null),
  });
}
