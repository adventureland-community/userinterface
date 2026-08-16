/**
 * Time Line layout constants, block/lane types, and row geometry.
 */

export const TL_DEATH_W = 4;

/** Skill/condition sprites on the lane. Must match --tl-icon. */
export const TL_ICON = 28;
/**
 * Sprites when All mode splits a row into per-kind sub-lanes.
 * Sized to fill ~TL_SUB_ROW (not crumb-sized).
 */
export const TL_ICON_SUB = 20;
/** Default player-row height (one kind only). Must match --tl-row. */
export const TL_ROW = 36;
/**
 * Per-kind sub-lane height when a player mixes CD / buff / debuff.
 * 2 kinds → 52px row; 3 → 78px; 4 (incl. gear) → 104px.
 */
export const TL_SUB_ROW = 26;
/** Frozen name gutter — match CSS `--tl-name-w` (not inside the x-scroller). */
export const TL_NAME_W = 132;

/**
 * Default live scale. 88 px/s → 1s ≈ 3.1× a 28px icon; 1s-apart attacks
 * sit ~60px past icon overlap instead of stacking on one spot.
 */
export const TL_PPS_BASE = 88;
export const TL_PPS_MIN = 16;
export const TL_PPS_MAX = 176;
export const TL_ZOOM_STEP = 1.12;

/** Hide duration bars thinner than this (avoids 1–2px shimmer slivers). */
export const TL_BAR_MIN_PX = 4;
/** Gap so clipped same-skill CD bars do not touch / read as one strip. */
export const TL_CAST_BAR_GAP_PX = 4;

/** Target minimum px between axis labels. */
export const TL_TICK_MIN_PX = 72;

/** How close to the live head counts as “following now”. */
export const TL_FOLLOW_SLACK = 28;

/**
 * Viewport ± this many px still mounts (covers 20s bars + scroll slack).
 * Quantize so slight scroll does not remount every icon.
 */
export const TL_VIEW_BUF_PX = 480;
export const TL_VIEW_SNAP_PX = 64;
/** First-paint sentinel — never use as a real cull box (would empty the track). */
export const TL_VIEW_OPEN = { left: -1e9, right: 1e9 };
/** Unmeasured follow-window guess so we do not mount a 10-minute fight. */
export const TL_VIEW_ESTIMATE_W = 960;
/**
 * Display-only: skip mounting identical cast icons closer than this.
 * Data stays in `lane.blocks` for cooltips. ~0.3s × 88 px/s ≈ one icon.
 */
export const TL_COALESCE_SEC = 0.3;

/**
 * Lookback when culling off-screen bars. Long CDs (Temporal Surge 60s)
 * and auras must still mount when their start is left of the viewport.
 */
export const TL_CULL_DUR_MAX = 180;
/**
 * Icon stacking band — above every duration-bar hit layer. Later icons
 * sit above earlier icons; no bar can cover an icon’s pointer-events.
 */
export const TL_ICON_Z = 10000;

/**
 * Modes map to Details tabs we can approximate with AL data, plus All
 * (AL-only overlay — Details has no combined tab) and Gear (slot diffs).
 * Default All so cooldowns + buffs + debuffs + gear show together.
 */
export type TlFilter = "all" | "cds" | "debuffs" | "buffs" | "gear";

export type TlCat = "cast" | "buff" | "debuff" | "gear";

export const TL_CAT_ORDER: TlCat[] = ["cast", "buff", "debuff", "gear"];

export type TimelineBlock = {
  kind: "condition" | "cast" | "death" | "gear";
  /** Stable DOM / React key — one icon per event. */
  domKey: string;
  key: string;
  label: string;
  atSec: number;
  /** Real elapsed / G.skills cooldown, or attack_ms for attack-share. */
  durationSec: number;
  /**
   * Next same-skill cast on this lane (casts only). Bar width clips here
   * so shared-CD spam is not one continuous strip.
   */
  nextSameAtSec?: number;
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

export type TimelineLane = {
  id: string;
  name: string;
  ctype?: string;
  blocks: TimelineBlock[];
  /** Distinct CD / buff / debuff kinds on this player (deaths ignored). */
  cats: TlCat[];
};

export function blockCat(b: TimelineBlock): TlCat | "death" {
  if (b.kind === "death") return "death";
  if (b.kind === "cast") return "cast";
  if (b.kind === "gear") return "gear";
  if (b.condKind === "debuff") return "debuff";
  return "buff";
}

export function laneCatsFromBlocks(blocks: TimelineBlock[]): TlCat[] {
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
export function laneRowPx(cats: TlCat[]): number {
  if (cats.length >= 2) return cats.length * TL_SUB_ROW;
  return TL_ROW;
}

export function skillKey(b: TimelineBlock): string {
  // Each gear swap is unique (slot + time) — don't collapse by item name
  // or hovering one pin stacks every nearby equipped item as a “loadout”.
  if (b.kind === "gear") return b.domKey;
  return `${b.kind}:${b.key}`;
}

/**
 * Same-`at` multi-slot gear pins share one X. Boost mainhand so a weapon
 * swap is not buried under an offhand lollipop drawn later in slot order.
 */
export function gearPinZBoost(slot: string | undefined): number {
  if (slot === "mainhand") return 30;
  if (slot === "offhand") return 20;
  return 0;
}

/** Cooltip elapsed — live open auras tick at hover time, not last render. */
export function conditionElapsedSec(b: TimelineBlock): number {
  if (b.kind !== "condition") return b.durationSec;
  if (b.isOpen && b.startedAtMs) {
    return Math.max(0, (Date.now() - b.startedAtMs) / 1000);
  }
  return b.durationSec;
}

export function visualDurationSec(b: TimelineBlock): number {
  if (b.kind === "death" || b.kind === "gear") return 0;
  if (b.kind === "condition") {
    return Math.max(0, conditionElapsedSec(b));
  }
  // Cast/CD: G.skills cooldown, or round(1000/frequency) for attack-share.
  return Math.max(0, b.durationSec);
}
