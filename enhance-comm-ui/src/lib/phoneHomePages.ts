/**
 * Phone combat-home screens — Samsung-style pages with configurable widgets
 * (panels + meters). Page 0 is a clean fight surface by default.
 */

import type { PanelId } from "./panelCatalog";
import { isPanelId } from "./panelCatalog";

/** Persist active screen index across remounts. */
export const PHONE_HOME_PAGE_KEY = "ecu-phone-home-page";

/**
 * Overlay "apps" — dock / shade / swipe-up drawer. Not tied to home screens.
 */
export const PHONE_OVERLAY_PANEL_IDS: ReadonlySet<PanelId> = new Set([
  "chat",
  "command",
  "mail",
  "bank",
  "market",
  "bag",
  "buffInfo",
  "itemInfo",
  "paperdoll",
  "toggles",
]);

export type PhoneHomeScreen = {
  id: string;
  label: string;
  /** Home widgets on this page (Players, boss bar, frames, …). */
  panels: PanelId[];
  /** Meter instance ids pinned to this page. */
  meters: string[];
};

export function defaultPhoneHomeScreens(): PhoneHomeScreen[] {
  return [
    { id: "home", label: "Home", panels: [], meters: [] },
    {
      id: "players",
      label: "Players",
      panels: ["players", "playerFrame", "targetFrame"],
      meters: [],
    },
    {
      id: "coop",
      label: "Coop",
      panels: [],
      meters: ["meter-coop_v2"],
    },
  ];
}

export function isPhoneOverlayPanel(id: PanelId): boolean {
  return PHONE_OVERLAY_PANEL_IDS.has(id);
}

/** True when this panel is a home-screen widget (gated by the active page). */
export function isPhoneHomeWidget(id: PanelId): boolean {
  return !isPhoneOverlayPanel(id);
}

export function normalizePhoneHomeScreens(raw: unknown): PhoneHomeScreen[] {
  if (!Array.isArray(raw) || !raw.length) return defaultPhoneHomeScreens();
  const out: PhoneHomeScreen[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const id =
      typeof (row as { id?: string }).id === "string" && (row as { id: string }).id
        ? (row as { id: string }).id
        : "screen-" + i;
    const label =
      typeof (row as { label?: string }).label === "string" &&
      (row as { label: string }).label.trim()
        ? (row as { label: string }).label.trim()
        : "Page " + (i + 1);
    const panels: PanelId[] = [];
    const rawPanels = (row as { panels?: unknown }).panels;
    if (Array.isArray(rawPanels)) {
      for (let p = 0; p < rawPanels.length; p++) {
        const pid = rawPanels[p];
        if (typeof pid === "string" && isPanelId(pid) && isPhoneHomeWidget(pid)) {
          if (panels.indexOf(pid) < 0) panels.push(pid);
        }
      }
    }
    const meters: string[] = [];
    const rawMeters = (row as { meters?: unknown }).meters;
    if (Array.isArray(rawMeters)) {
      for (let m = 0; m < rawMeters.length; m++) {
        const mid = rawMeters[m];
        if (typeof mid === "string" && mid && meters.indexOf(mid) < 0) {
          meters.push(mid);
        }
      }
    }
    out.push({ id, label, panels, meters });
  }
  return out.length ? out : defaultPhoneHomeScreens();
}

export function phoneHomeScreenIndices(screens: PhoneHomeScreen[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < screens.length; i++) out.push(i);
  return out;
}

export function clampPhoneHomePage(page: number, pages: number[]): number {
  if (!pages.length) return 0;
  if (pages.indexOf(page) >= 0) return page;
  let best = pages[0];
  let bestDist = Math.abs(page - best);
  for (let i = 1; i < pages.length; i++) {
    const d = Math.abs(page - pages[i]);
    if (d < bestDist) {
      best = pages[i];
      bestDist = d;
    }
  }
  return best;
}

export function activePhoneHomeScreen(
  screens: PhoneHomeScreen[],
  page: number,
): PhoneHomeScreen | null {
  if (!screens.length) return null;
  const idx = clampPhoneHomePage(page, phoneHomeScreenIndices(screens));
  return screens[idx] || null;
}

export function panelOnPhoneHomeScreen(
  id: PanelId,
  screen: PhoneHomeScreen | null,
): boolean {
  if (!screen) return true;
  if (!isPhoneHomeWidget(id)) return true;
  return screen.panels.indexOf(id) >= 0;
}

export function meterOnPhoneHomeScreen(
  meterId: string,
  screen: PhoneHomeScreen | null,
): boolean {
  if (!screen) return true;
  return screen.meters.indexOf(meterId) >= 0;
}

/** @deprecated Prefer meterOnPhoneHomeScreen — kept for older call sites. */
export function meterOnPhoneHomePage(
  m: { id: string },
  _page: number,
  screen?: PhoneHomeScreen | null,
): boolean {
  if (screen) return meterOnPhoneHomeScreen(m.id, screen);
  return true;
}

export function readStoredPhoneHomePage(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(PHONE_HOME_PAGE_KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function storePhoneHomePage(page: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PHONE_HOME_PAGE_KEY, String(Math.max(0, page)));
  } catch {
    /* ignore */
  }
}

/**
 * Step to prev/next page. dir &lt; 0 = previous (swipe right),
 * &gt; 0 = next (swipe left) — Samsung home.
 */
export function stepPhoneHomePage(
  current: number,
  pages: number[],
  dir: number,
): number {
  if (!pages.length) return current;
  const cur = clampPhoneHomePage(current, pages);
  const idx = pages.indexOf(cur);
  if (idx < 0) return pages[0];
  if (dir < 0) return idx > 0 ? pages[idx - 1] : cur;
  if (dir > 0) return idx < pages.length - 1 ? pages[idx + 1] : cur;
  return cur;
}

export function togglePanelOnScreen(
  screens: PhoneHomeScreen[],
  screenIndex: number,
  panelId: PanelId,
  on: boolean,
): PhoneHomeScreen[] {
  if (!isPhoneHomeWidget(panelId)) return screens;
  const next = screens.slice();
  const screen = next[screenIndex];
  if (!screen) return screens;
  const panels = screen.panels.slice();
  const at = panels.indexOf(panelId);
  if (on && at < 0) panels.push(panelId);
  if (!on && at >= 0) panels.splice(at, 1);
  next[screenIndex] = { ...screen, panels };
  return next;
}

export function toggleMeterOnScreen(
  screens: PhoneHomeScreen[],
  screenIndex: number,
  meterId: string,
  on: boolean,
): PhoneHomeScreen[] {
  const next = screens.slice();
  const screen = next[screenIndex];
  if (!screen) return screens;
  const meters = screen.meters.slice();
  const at = meters.indexOf(meterId);
  if (on && at < 0) meters.push(meterId);
  if (!on && at >= 0) meters.splice(at, 1);
  next[screenIndex] = { ...screen, meters };
  return next;
}

export function addPhoneHomeScreen(
  screens: PhoneHomeScreen[],
  label?: string,
): PhoneHomeScreen[] {
  const n = screens.length + 1;
  return screens.concat([
    {
      id: "screen-" + Date.now(),
      label: label && label.trim() ? label.trim() : "Page " + n,
      panels: [],
      meters: [],
    },
  ]);
}

export function removePhoneHomeScreen(
  screens: PhoneHomeScreen[],
  screenIndex: number,
): PhoneHomeScreen[] {
  if (screens.length <= 1) return screens;
  if (screenIndex < 0 || screenIndex >= screens.length) return screens;
  const next = screens.slice();
  next.splice(screenIndex, 1);
  return next;
}
