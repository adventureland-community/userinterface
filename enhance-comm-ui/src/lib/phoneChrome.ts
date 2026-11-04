/**
 * Phone dock clearance — CSS vars for the Material dock + HUD clamp insets.
 * Character/server live on the dock; stock #bottom chrome stack is hidden.
 */

export const PHONE_DOCK_FALLBACK_PX = 48;
export const PHONE_DOCK_CSS_VAR = "--ecu-phone-dock-h";
/** Dock + #bottom chrome — free-floating panels/meters must clear this. */
export const PHONE_HUD_BOTTOM_CSS_VAR = "--ecu-phone-hud-bottom";
export const PHONE_DOCK_BODY_CLASS = "ecu-phone-dock-on";
/** When #bottom is not measurable yet. */
export const PHONE_CHROME_FALLBACK_PX = 120;

let appliedPx = 0;
let appliedHudBottomPx = 0;

/** Apply dock height so character strip / action keys sit above the bar. */
export function applyPhoneDockChrome(dockHeightPx: number): void {
  if (typeof document === "undefined") return;
  const px = Math.max(
    0,
    Math.round(Number.isFinite(dockHeightPx) ? dockHeightPx : 0),
  );
  appliedPx = px || PHONE_DOCK_FALLBACK_PX;
  document.documentElement.style.setProperty(
    PHONE_DOCK_CSS_VAR,
    appliedPx + "px",
  );
  document.documentElement.classList.add(PHONE_DOCK_BODY_CLASS);
  document.body.classList.add(PHONE_DOCK_BODY_CLASS);
  refreshPhoneHudBottomInset();
}

export function clearPhoneDockChrome(): void {
  if (typeof document === "undefined") return;
  appliedPx = 0;
  appliedHudBottomPx = 0;
  document.documentElement.style.setProperty(PHONE_DOCK_CSS_VAR, "0px");
  document.documentElement.style.setProperty(PHONE_HUD_BOTTOM_CSS_VAR, "0px");
  document.documentElement.classList.remove(PHONE_DOCK_BODY_CLASS);
  document.body.classList.remove(PHONE_DOCK_BODY_CLASS);
}

export function phoneDockHeightPx(): number {
  return appliedPx;
}

/**
 * Bottom inset for panel/meter clamp on phone: Material dock + #bottom strip.
 * Returns 0 when the phone dock is not active.
 */
export function phoneHudBottomInsetPx(): number {
  if (typeof document === "undefined") return 0;
  if (!document.documentElement.classList.contains(PHONE_DOCK_BODY_CLASS)) {
    return 0;
  }
  if (appliedHudBottomPx > 0) return appliedHudBottomPx;
  return measurePhoneHudBottomInset();
}

export const PHONE_HUD_INSET_EVENT = "ecu-phone-hud-inset";

/** Re-measure #bottom + dock and publish --ecu-phone-hud-bottom. */
export function refreshPhoneHudBottomInset(): number {
  if (typeof document === "undefined") return 0;
  const inset = measurePhoneHudBottomInset();
  appliedHudBottomPx = inset;
  document.documentElement.style.setProperty(
    PHONE_HUD_BOTTOM_CSS_VAR,
    inset + "px",
  );
  // Always notify — panels may mount after the first inset write.
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(PHONE_HUD_INSET_EVENT));
    } catch {
      /* ignore */
    }
  }
  return inset;
}

function measurePhoneHudBottomInset(): number {
  if (typeof document === "undefined") return 0;
  if (!document.documentElement.classList.contains(PHONE_DOCK_BODY_CLASS)) {
    return 0;
  }
  const dock = appliedPx || PHONE_DOCK_FALLBACK_PX;
  const bottom = document.getElementById("bottom");
  let chromeH = 0;
  if (bottom) {
    chromeH = Math.round(bottom.getBoundingClientRect().height);
  }
  // Character/server strip is hidden on phone — only count real #bottom height
  // (e.g. disconnect). Do not invent a tall chrome fallback.
  if (!(chromeH > 0)) chromeH = 0;
  return dock + chromeH;
}

/** Bottom pad for clampPanelPosInRoot when the phone dock is on. */
export function layoutClampBottomPad(): number {
  return phoneHudBottomInsetPx();
}
