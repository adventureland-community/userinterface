/**
 * Ability timeline geometry + chrome — one blob, like meterAppearance.
 * Vertical + icons with a large iconSize is the Better Timeline rail.
 * Frame show/hide is panelVisible, not prefs.
 */

import { getSettings, patchSettings } from "../lib/settings";
import { applyAbilityTimelineOrientFrame } from "../lib/abilityTimelineFrame";

export type AbilityTimelineOrient = "vertical" | "horizontal";
export type AbilityTimelineScope = "all" | "target";
export type AbilityTextAnchor = "left" | "right" | "top" | "bottom";
export type AbilityGrowDir = "left" | "right" | "up" | "down";
export type AbilityHighlightGrow = "up" | "down";

export type AbilityTimelinePrefs = {
  orient: AbilityTimelineOrient;
  /** Mix every visible caster, or only the current / observe target. */
  scope: AbilityTimelineScope;
  /** Static/dynamic split and icon-scroll axis (ms). */
  windowMs: number;
  /** Glow when remaining is under this. Drives BigIcon + highlight + warn color. */
  imminentMs: number;
  iconSize: number;
  /** Flip NOW to the opposite edge (top / left). */
  reverse: boolean;
  /** Keep off-CD icons at NOW. */
  showReady: boolean;
  showLegend: boolean;
  /** 5s axis ticks (Better Timeline TIMELINE_TICKS). */
  showTicks: boolean;
  /** Fraction of the lane reserved for the static pin zone. */
  staticRatio: number;
  /** Gap around rail icons (px). */
  iconMargin: number;
  /** Scroll-lane fill. */
  railTint: string;
  /** Name/countdown side of a rail icon. */
  textAnchor: AbilityTextAnchor;
  bigIconGrow: AbilityGrowDir;
  bigIconMargin: number;
  highlightGrow: AbilityHighlightGrow;
  highlightMargin: number;
};

export const DEFAULT_ABILITY_TIMELINE_PREFS: AbilityTimelinePrefs = {
  orient: "vertical",
  scope: "all",
  windowMs: 10000,
  imminentMs: 5000,
  iconSize: 44,
  reverse: false,
  showReady: true,
  showLegend: false,
  showTicks: true,
  staticRatio: 0.42,
  iconMargin: 4,
  railTint: "transparent",
  textAnchor: "left",
  bigIconGrow: "right",
  bigIconMargin: 8,
  highlightGrow: "up",
  highlightMargin: 4,
};

function clampNum(
  n: unknown,
  lo: number,
  hi: number,
  fallback: number,
): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

export function normalizeAbilityTimelineOrient(
  raw: unknown,
): AbilityTimelineOrient {
  return raw === "horizontal" ? "horizontal" : "vertical";
}

export function normalizeAbilityTimelineScope(
  raw: unknown,
): AbilityTimelineScope {
  return raw === "target" ? "target" : "all";
}

export function normalizeAbilityTextAnchor(
  raw: unknown,
  orient: AbilityTimelineOrient,
): AbilityTextAnchor {
  if (orient === "horizontal") {
    if (raw === "top") return "top";
    return "bottom";
  }
  if (raw === "right") return "right";
  return "left";
}

export function normalizeAbilityGrowDir(raw: unknown): AbilityGrowDir {
  if (raw === "left" || raw === "up" || raw === "down") return raw;
  return "right";
}

export function normalizeAbilityHighlightGrow(
  raw: unknown,
): AbilityHighlightGrow {
  return raw === "down" ? "down" : "up";
}

function normalizeRailTint(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t || t.length > 64) return fallback;
  // Shipped dark fill — treat as unset so the transparent default applies.
  if (t === "rgba(0,0,0,0.42)" || t === "rgba(0, 0, 0, 0.42)") return fallback;
  return t;
}

/** Accept saved blob, plus leftover top-level orient scalar. */
export function normalizeAbilityTimelinePrefs(
  raw: unknown,
  leftover?: unknown,
): AbilityTimelinePrefs {
  const src =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const legacy =
    leftover && typeof leftover === "object"
      ? (leftover as Record<string, unknown>)
      : {};
  const d = DEFAULT_ABILITY_TIMELINE_PREFS;
  const windowMs =
    Math.round(clampNum(src.windowMs, 3000, 30000, d.windowMs) / 100) * 100;
  let imminentMs =
    Math.round(clampNum(src.imminentMs, 1000, 20000, d.imminentMs) / 100) * 100;
  if (imminentMs > windowMs) imminentMs = windowMs;
  const orient = normalizeAbilityTimelineOrient(
    src.orient != null ? src.orient : legacy.abilityTimelineOrient,
  );
  return {
    orient,
    scope: normalizeAbilityTimelineScope(src.scope),
    windowMs,
    imminentMs,
    iconSize: Math.round(clampNum(src.iconSize, 24, 64, d.iconSize)),
    reverse: src.reverse === true,
    showReady: src.showReady !== false,
    showLegend: src.showLegend === true,
    showTicks: src.showTicks !== false,
    staticRatio: clampNum(src.staticRatio, 0.2, 0.7, d.staticRatio),
    iconMargin: Math.round(clampNum(src.iconMargin, 0, 32, d.iconMargin)),
    railTint: normalizeRailTint(src.railTint, d.railTint),
    textAnchor: normalizeAbilityTextAnchor(src.textAnchor, orient),
    bigIconGrow: normalizeAbilityGrowDir(src.bigIconGrow),
    bigIconMargin: Math.round(
      clampNum(src.bigIconMargin, 0, 32, d.bigIconMargin),
    ),
    highlightGrow: normalizeAbilityHighlightGrow(src.highlightGrow),
    highlightMargin: Math.round(
      clampNum(src.highlightMargin, 0, 32, d.highlightMargin),
    ),
  };
}

export function getAbilityTimelinePrefs(): AbilityTimelinePrefs {
  const s = getSettings();
  return normalizeAbilityTimelinePrefs(s.abilityTimeline, s);
}

export function patchAbilityTimelinePrefs(
  partial: Partial<AbilityTimelinePrefs>,
): AbilityTimelinePrefs {
  const prev = getAbilityTimelinePrefs();
  const next = normalizeAbilityTimelinePrefs({
    ...prev,
    ...partial,
  });
  if (partial.orient != null && partial.orient !== prev.orient) {
    const s = getSettings();
    const layouts = { ...s.panelLayoutsByProfile };
    const keys = Object.keys(layouts) as Array<keyof typeof layouts>;
    for (let i = 0; i < keys.length; i++) {
      const profile = keys[i];
      const layout = layouts[profile];
      if (layout) {
        layouts[profile] = applyAbilityTimelineOrientFrame(layout, next.orient);
      }
    }
    patchSettings({
      abilityTimeline: next,
      panelLayoutsByProfile: layouts,
      panelLayout: applyAbilityTimelineOrientFrame(
        { ...s.panelLayout },
        next.orient,
      ),
    });
    return next;
  }
  patchSettings({ abilityTimeline: next });
  return next;
}

/** Saved `showBigIcon: false` hid the glued rail icons — now panelVisible. */
export function legacyShowBigIconHidden(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  return (raw as { showBigIcon?: unknown }).showBigIcon === false;
}
