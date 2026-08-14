/**
 * Custom hover flyout — native `title` blinks on meter ticks and steals hover.
 * pointer-events: none so the tip never covers the row.
 */

import { e, getReactDOM } from "../../host/react";
import { COOLTIP_Z } from "./meterCooltipMenu";

export type HoverDetailPos = { top: number; left: number };

const DETAIL_EST_W = 260;
const DETAIL_EST_H = 120;

/** Place flyout beside `el`; flip left near the right edge; clamp to viewport. */
export function hoverDetailPosFromEl(
  el: HTMLElement,
  opts?: { preferLeft?: boolean; estWidth?: number; estHeight?: number },
): HoverDetailPos {
  const r = el.getBoundingClientRect();
  const pad = 8;
  const gap = 6;
  const w = opts?.estWidth ?? DETAIL_EST_W;
  const h = opts?.estHeight ?? DETAIL_EST_H;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const preferLeft = !!opts?.preferLeft || r.right + gap + w > vw - pad;
  let left = preferLeft ? r.left - w - gap : r.right + gap;
  left = Math.max(pad, Math.min(left, vw - w - pad));
  let top = r.top;
  top = Math.max(pad, Math.min(top, vh - pad - Math.min(h, vh - 2 * pad)));
  return { top: Math.round(top), left: Math.round(left) };
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
    zIndex: COOLTIP_Z + 1,
  });
  if (!ReactDOM.createPortal) return node;
  return ReactDOM.createPortal(node, document.body);
}
