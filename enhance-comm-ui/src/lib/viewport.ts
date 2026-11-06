/** Viewport layout profiles for desktop / tablet / phone. */

export type ViewportProfile = "desktop" | "tablet" | "phone";

/** Width below this → phone (portrait & landscape handsets). */
export const PHONE_MAX_WIDTH = 700;
/** Width below this (and ≥ phone) → tablet / small laptop. */
export const TABLET_MAX_WIDTH = 1100;

/**
 * Detect layout profile from viewport size.
 * Tuned for Edge/Firefox Android and Safari iOS /comm userscripts.
 */
export function detectViewportProfile(
  width?: number,
  height?: number,
): ViewportProfile {
  const w =
    typeof width === "number" && width > 0
      ? width
      : typeof window !== "undefined"
        ? window.innerWidth
        : 1280;
  const h =
    typeof height === "number" && height > 0
      ? height
      : typeof window !== "undefined"
        ? window.innerHeight
        : 800;
  const short = Math.min(w, h);
  // Tall narrow = phone even if landscape width creeps up.
  if (w <= PHONE_MAX_WIDTH || (short <= 480 && w < 980)) return "phone";
  if (w <= TABLET_MAX_WIDTH || (short <= 820 && w < 1280)) return "tablet";
  return "desktop";
}

export function isTouchishProfile(profile: ViewportProfile): boolean {
  return profile === "tablet" || profile === "phone";
}

/**
 * Phone UI for overlay panels (Mail/Market/Chat/…). Prefer CommUI's resolved
 * `viewportProfile` / `#comm-ui[data-viewport]` so `layoutProfileMode: desktop`
 * stays desktop even when DevTools device mode shrinks the window — raw
 * `detectViewportProfile()` alone caused desktop chrome + phone sheet expand.
 */
export function resolveCommPhoneUi(
  viewportProfile?: ViewportProfile | null,
): boolean {
  if (viewportProfile === "phone") return true;
  if (viewportProfile === "desktop" || viewportProfile === "tablet") {
    return false;
  }
  if (typeof document !== "undefined") {
    const attr = document
      .getElementById("comm-ui")
      ?.getAttribute("data-viewport");
    if (attr === "phone") return true;
    if (attr === "desktop" || attr === "tablet") return false;
  }
  return detectViewportProfile() === "phone";
}

export const VIEWPORT_PROFILES: ViewportProfile[] = [
  "desktop",
  "tablet",
  "phone",
];

export function profileLabel(profile: ViewportProfile): string {
  switch (profile) {
    case "desktop":
      return "Desktop";
    case "tablet":
      return "Tablet";
    case "phone":
      return "Phone";
    default: {
      const _exhaustive: never = profile;
      return _exhaustive;
    }
  }
}
