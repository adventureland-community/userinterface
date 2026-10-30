/**
 * Fear / aggro cooltip row: aggro count over courage capacity (X/Y).
 * Overrun (X>Y) gets `.ecu-cooltip-over` for a red value tint.
 */
import { escapeCooltipHtml } from "./cooltip";

export function couragePoolLine(
  label: string,
  aggro: number,
  capacity: number,
): string {
  const over = aggro > capacity;
  const cls = over ? "line ecu-cooltip-over" : "line";
  return `<div class="${cls}"><span>${escapeCooltipHtml(label)}</span><b>${aggro}/${capacity}</b></div>`;
}
