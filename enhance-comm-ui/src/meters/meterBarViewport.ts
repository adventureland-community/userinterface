/**
 * Ranked-bar viewport constants — keep in sync with
 * `--meter-bar-row-h` in meterViewsCss / meterInspectorMainCss.
 */

import { getMeterAppearance } from "./meterAppearance";

/** Default ranked bar row height (px). Matches CSS `--meter-bar-row-h`. */
export const METER_BAR_ROW_H = 18;

/** Effective row height from Options (Bar height × Window scale). */
export function meterBarRowHeightPx(): number {
  const app = getMeterAppearance();
  const base =
    typeof app.barHeight === "number" && app.barHeight > 0
      ? app.barHeight
      : METER_BAR_ROW_H;
  const scale =
    typeof app.windowScale === "number" && app.windowScale > 0
      ? app.windowScale
      : 1;
  return Math.max(12, Math.round(base * scale));
}
