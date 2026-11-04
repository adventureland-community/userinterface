/**
 * Performance / phone HUD prefs — cadences and lite visibility.
 * Does not pause meter/socket trackers on document.hidden (desktop farm).
 */

import type { PanelId } from "./layout";
import { detectViewportProfile, type ViewportProfile } from "./viewport";

/** Auto = lite on phone, full elsewhere. */
export type HudDensity = "auto" | "full" | "lite";

export const HUD_DENSITIES: readonly HudDensity[] = ["auto", "full", "lite"];

export function normalizeHudDensity(raw: unknown): HudDensity {
  if (raw === "full" || raw === "lite" || raw === "auto") return raw;
  return "auto";
}

export function hudDensityLabel(d: HudDensity): string {
  switch (d) {
    case "auto":
      return "Auto (lite on phone)";
    case "full":
      return "Full HUD";
    case "lite":
      return "Lite HUD";
    default: {
      const _exhaustive: never = d;
      return _exhaustive;
    }
  }
}

/**
 * Closable panels that stay off under lite HUD unless the user re-opens them
 * (stored in settings.phoneHudVisible). Desktop "lite" uses the same list.
 */
export const LITE_HUD_DEFAULT_OFF: ReadonlySet<PanelId> = new Set([
  "abilityTimeline",
  "abilityTimelineBigIcon",
  "abilityTimelineHighlight",
  "minimap",
  "threat",
  "kills",
  "playerFrame",
  "targetFrame",
  "instance",
  "instanceRun",
  "enemies",
  // Phone home — keep party + boss + map/zoom; hide the rest until Menu.
  "paperdoll",
  "events",
  "eventScore",
  "eventRoster",
  "bag",
]);

export function resolveLiteHud(
  density: HudDensity,
  profile?: ViewportProfile,
): boolean {
  if (density === "lite") return true;
  if (density === "full") return false;
  const p = profile || detectViewportProfile();
  return p === "phone";
}

/** True when the active viewport is a phone (for poll slowing). */
export function isPhoneViewport(profile?: ViewportProfile): boolean {
  const p = profile || detectViewportProfile();
  return p === "phone";
}

/**
 * Stretch poll intervals on phone to cut battery / main-thread work.
 * `data` = bank age, mail observe, mail unread, market observe.
 * `ui` = softer stretch for cosmetic clocks.
 */
export function scalePollMs(
  baseMs: number,
  kind: "data" | "ui" = "data",
  profile?: ViewportProfile,
): number {
  if (!Number.isFinite(baseMs) || baseMs <= 0) return baseMs;
  if (!isPhoneViewport(profile)) return Math.round(baseMs);
  const mult = kind === "data" ? 2.5 : 1.5;
  return Math.max(Math.round(baseMs), Math.round(baseMs * mult));
}

/**
 * Effective panel visibility under lite HUD.
 * `panelVisible` is the merged closable map; `phoneHudVisible` holds
 * explicit re-shows (and hides) while lite is active.
 */
export function liteAwarePanelVisible(
  id: PanelId,
  panelVisible: Partial<Record<PanelId, boolean>>,
  opts: {
    lite: boolean;
    phoneHudVisible?: Partial<Record<PanelId, boolean>> | null;
  },
): boolean {
  if (panelVisible[id] === false) return false;
  if (!opts.lite || !LITE_HUD_DEFAULT_OFF.has(id)) return true;
  const ov = opts.phoneHudVisible;
  if (!ov) return false;
  const forced = ov[id];
  if (typeof forced === "boolean") return forced;
  return false;
}
