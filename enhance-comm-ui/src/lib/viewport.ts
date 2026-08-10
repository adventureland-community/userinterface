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
