/**
 * Shared Comm floating cooltip — buffs, items, and other HUD hover.
 * Meter bar tips keep their own host (Shift/Ctrl live rebuild); call
 * `hideCooltip` / `hideMeterTooltip` cross-dismiss when opening either.
 */

import { COOLTIP_CSS } from "./cooltipCss";

const PAD = 8;
const CURSOR = 14;
const STYLE_ID = "ecu-cooltip-css";
const HOST_ID = "ecu-cooltip";

/** Icon size inside cooltip headers — match meter tip. */
export const COOLTIP_ICON = 22;

/**
 * Monster portraits in cooltips — larger than skill/buff skins so pixel
 * bodies stay readable on the dark tip (stock sprite base is 40×50).
 */
export const COOLTIP_MONSTER_ICON = 40;

export type CooltipPaintOpts = {
  /** Adds `is-item-tip` for stock `.buyitem` flatten CSS. */
  itemTip?: boolean;
};

let tipEl: HTMLDivElement | null = null;
let hoverKey: string | null = null;
let tipX = 0;
let tipY = 0;
let tipRebuild: (() => string) | null = null;
let tipOpts: CooltipPaintOpts = {};
let cssInjected = false;
let crossHideMeter: (() => void) | null = null;

/** Meter tip module registers hide so opening a Comm cooltip clears it. */
export function bindCooltipCrossHide(hideMeter: () => void): void {
  crossHideMeter = hideMeter;
}

export function escapeCooltipHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ensureCooltipCss(): void {
  if (typeof document === "undefined") return;
  if (cssInjected && document.getElementById(STYLE_ID)) return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = COOLTIP_CSS;
  cssInjected = true;
}

function ensureHost(): HTMLDivElement {
  ensureCooltipCss();
  if (tipEl && tipEl.isConnected) return tipEl;
  tipEl = document.createElement("div");
  tipEl.id = HOST_ID;
  tipEl.className = "ecu-cooltip";
  tipEl.setAttribute("role", "tooltip");
  document.body.appendChild(tipEl);
  return tipEl;
}

function placeTip(tip: HTMLDivElement, clientX: number, clientY: number): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = tip.getBoundingClientRect();
  const tw = Math.max(1, rect.width);
  const th = Math.max(1, rect.height);

  let x = clientX + CURSOR;
  let y = clientY + CURSOR;

  if (x + tw > vw - PAD) x = clientX - tw - CURSOR;
  if (y + th > vh - PAD) y = clientY - th - CURSOR;

  x = Math.max(PAD, Math.min(vw - tw - PAD, x));
  y = Math.max(PAD, Math.min(vh - th - PAD, y));

  tip.style.left = Math.round(x) + "px";
  tip.style.top = Math.round(y) + "px";
}

function paintTip(
  html: string,
  clientX: number,
  clientY: number,
  opts?: CooltipPaintOpts,
): void {
  if (crossHideMeter) {
    try {
      crossHideMeter();
    } catch {
      /* ignore */
    }
  }
  const tip = ensureHost();
  tip.innerHTML = html || "";
  tip.classList.toggle("is-item-tip", !!(opts && opts.itemTip));
  tip.classList.add("is-open");
  tip.style.left = "-9999px";
  tip.style.top = "0px";
  placeTip(tip, clientX, clientY);
}

export function showCooltipAt(
  html: string,
  clientX: number,
  clientY: number,
  opts?: CooltipPaintOpts,
): void {
  tipX = clientX;
  tipY = clientY;
  if (opts) tipOpts = opts;
  paintTip(html, clientX, clientY, tipOpts);
}

export function showCooltip(
  ev: MouseEvent,
  html: string,
  opts?: CooltipPaintOpts,
): void {
  showCooltipAt(html, ev.clientX, ev.clientY, opts);
}

export function hideCooltip(): void {
  hoverKey = null;
  tipRebuild = null;
  tipOpts = {};
  if (!tipEl) return;
  tipEl.classList.remove("is-open", "is-item-tip");
  tipEl.innerHTML = "";
}

export function cooltipHandlers(
  key: string,
  rebuild: () => string,
  opts?: CooltipPaintOpts,
): {
  onMouseEnter: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onMouseLeave: () => void;
} {
  return {
    onMouseEnter: (ev: MouseEvent) => {
      hoverKey = key;
      tipRebuild = rebuild;
      tipOpts = opts || {};
      tipX = ev.clientX;
      tipY = ev.clientY;
      showCooltipAt(rebuild(), tipX, tipY, tipOpts);
    },
    onMouseMove: (ev: MouseEvent) => {
      if (hoverKey !== key) return;
      tipX = ev.clientX;
      tipY = ev.clientY;
      if (tipRebuild) showCooltipAt(tipRebuild(), tipX, tipY, tipOpts);
    },
    onMouseLeave: () => {
      if (hoverKey !== key) return;
      hideCooltip();
    },
  };
}

/** Rebuild open tip while hovered (clock / live fields). */
export function refreshCooltip(key: string): void {
  if (hoverKey !== key || !tipRebuild) return;
  showCooltipAt(tipRebuild(), tipX, tipY, tipOpts);
}

/** Hide if this key owns the tip (unmount). Omit key to always hide. */
export function dismissCooltip(key?: string): void {
  if (key != null && hoverKey !== key) return;
  if (!hoverKey && key != null) return;
  hideCooltip();
}

export function isCooltipHovering(key: string): boolean {
  return hoverKey === key;
}
