import {
  ATTR_ICONS_DATA_URI,
  TOOLBAR_ICONS_DATA_URI,
} from "./meterToolbarIcons";
import { METER_BODY_CORE_CSS } from "./css/meterBodyCoreCss";
import { METER_VIEWS_CSS } from "./css/meterViewsCss";
import { METER_COOLTIP_CSS } from "./css/meterCooltipCss";
import { METER_SHELL_CSS } from "./css/meterShellCss";
import { METER_TITLEBAR_CSS } from "./css/meterTitlebarCss";

/**
 * Meter chrome CSS — Details Minimalistic vibes + AL-readable type.
 * Inject always refreshes so hot-reloads apply.
 */

const STYLE_ID = "ecu-meter-chrome-css";

const CSS = [
  METER_SHELL_CSS,
  METER_TITLEBAR_CSS,
  METER_COOLTIP_CSS,
  METER_BODY_CORE_CSS,
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
