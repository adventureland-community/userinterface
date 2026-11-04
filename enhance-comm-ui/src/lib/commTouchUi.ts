/**
 * Touch-first Comm UI gate — phone + tablet profiles, or live `#comm-ui.comm-ui-touch`.
 */

import { detectViewportProfile, isTouchishProfile } from "./viewport";

/** True when Comm should use long-press / action sheets instead of hover + RMB. */
export function isCommTouchUi(): boolean {
  if (typeof document !== "undefined") {
    const root = document.getElementById("comm-ui");
    if (root && root.classList.contains("comm-ui-touch")) return true;
  }
  return isTouchishProfile(detectViewportProfile());
}
