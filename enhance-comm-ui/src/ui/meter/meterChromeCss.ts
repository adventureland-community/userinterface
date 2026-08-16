import {
  ATTR_ICONS_DATA_URI,
  TOOLBAR_ICONS_DATA_URI,
} from "./meterToolbarIcons";
import {
  METER_BODY_CORE_CSS,
  METER_BODY_WHO_CSS,
} from "./css/meterBodyCoreCss";
import { METER_REPORT_CSS } from "./css/meterReportCss";
import { METER_HOVER_TIP_CSS } from "./css/meterHoverTipCss";
import { METER_TIMELINE_CLUSTER_CSS } from "./css/meterTimelineClusterCss";
import { METER_TIMELINE_TRACK_CSS } from "./css/meterTimelineTrackCss";
import { METER_INSPECTOR_DRILL_CSS } from "./css/meterInspectorDrillCss";
import { METER_INSPECTOR_MAIN_CSS } from "./css/meterInspectorMainCss";
import { METER_INSPECTOR_TAIL_CSS } from "./css/meterInspectorTailCss";
import { METER_VIEWS_CSS } from "./css/meterViewsCss";
import { METER_COOLTIP_CSS } from "./css/meterCooltipCss";
import { METER_CHROME_SCALE_CSS } from "./css/meterChromeScaleCss";
import { METER_SHELL_CSS } from "./css/meterShellCss";
import { METER_TITLEBAR_CSS } from "./css/meterTitlebarCss";

/**
 * Meter chrome CSS — Details Minimalistic vibes + AL-readable type.
 * Inject always refreshes so hot-reloads apply.
 *
 * Body-core slices join in original selector order so cascade is unchanged.
 */

const STYLE_ID = "ecu-meter-chrome-css";

/** Template strings include a leading/trailing newline; strip so join matches the old blob. */
function cssSlice(part: string): string {
  return part.replace(/^\n/, "").replace(/\n$/, "");
}

function joinBodyCore(...parts: string[]): string {
  return `\n${parts.map(cssSlice).join("\n")}\n`;
}

const CSS = [
  METER_CHROME_SCALE_CSS,
  METER_SHELL_CSS,
  METER_TITLEBAR_CSS,
  METER_COOLTIP_CSS,
  joinBodyCore(
    METER_BODY_CORE_CSS,
    METER_REPORT_CSS,
    METER_INSPECTOR_DRILL_CSS,
    METER_BODY_WHO_CSS,
    METER_HOVER_TIP_CSS,
    METER_TIMELINE_CLUSTER_CSS,
    METER_INSPECTOR_MAIN_CSS,
    METER_TIMELINE_TRACK_CSS,
    METER_INSPECTOR_TAIL_CSS,
  ),
  METER_VIEWS_CSS,
].join("\n");

export function injectMeterChromeCss(): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = CSS.replace(
    "__TOOLBAR__",
    TOOLBAR_ICONS_DATA_URI,
  ).replace("__ATTR__", ATTR_ICONS_DATA_URI);
}
