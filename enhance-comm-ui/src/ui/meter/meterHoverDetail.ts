/**
 * Custom hover flyout — native `title` blinks on meter ticks and steals hover.
 * pointer-events: none so the tip never covers the row.
 */

import { e, getReactDOM } from "../../host/react";
import { COOLTIP_Z } from "./meterCooltipMenu";

export type HoverDetailPos = { top: number; left: number };

export function hoverDetailPosFromEl(el: HTMLElement): HoverDetailPos {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.right + 6 };
}

export function meterHoverDetailNode(
  text: string,
  style?: Record<string, string | number>,
): any {
  return e(
    "div",
    {
      className: "ecu-meter-cooltip-detail",
      role: "tooltip",
      style: style || undefined,
    },
    text,
  );
}

export function portalHoverDetail(text: string, pos: HoverDetailPos): any {
  const ReactDOM = getReactDOM();
  const node = meterHoverDetailNode(text, {
    position: "fixed",
    top: Math.round(pos.top),
    left: Math.round(pos.left),
    zIndex: COOLTIP_Z,
  });
  if (!ReactDOM.createPortal) return node;
  return ReactDOM.createPortal(node, document.body);
}
