/**
 * Reusable AL item instance — art + readable level / quantity chrome.
 * Prefer this over raw stock `item_container` HTML in Comm UI (mail inherits
 * a UI font that makes stock `.iqui` / `.iuui` badges unreadable).
 */

import { getReact, e } from "../../host/react";
import {
  itemIconHtml,
  itemInstanceHtml,
  itemInstanceLabel,
} from "../../lib/gameIcon";
import {
  coerceItemLevel,
  resolveItemLevelBadge,
} from "../../lib/itemLevelBadge";
import { stampNativeItemTitleBorder } from "../../lib/itemTitleBorder";
import {
  dismissItemCooltip,
  itemCooltipHandlers,
  itemCooltipHtml,
  nextItemCooltipKey,
  type ItemCooltipActual,
} from "./itemCooltip";

export type ItemInstanceProps = {
  name: string;
  skin?: string;
  /** Numeric level, or a string that coerces (mail / API sometimes stringify). */
  level?: number | string;
  q?: number;
  p?: string;
  size?: number;
  className?: string;
  /** Plain-text fallback label; unused when cooltip is on. */
  title?: string;
  /**
   * Prefer stock `item_container` art (borders / rarity), then overlay our
   * readable qty/level badges. Default true.
   */
  stockChrome?: boolean;
  /** Show quantity badge even when q is 0 or 1 (recipe cards). */
  forceShowQ?: boolean;
  /** Override qty badge color (e.g. missing reagents). */
  qtyColor?: string;
  /** Account bank quantity — top-right badge (Market / bag overlays). */
  bankQ?: number;
  /**
   * Rich Comm cooltip via stock `render_item` (default true).
   * Set false for chrome-only tiles that should stay tip-free.
   */
  cooltip?: boolean;
  /** Full item/slot object when available (compound props beyond level/q/p). */
  actual?: ItemCooltipActual | null;
};

function formatQty(
  q: number | undefined,
  forceShowQ?: boolean,
): string | null {
  if (q == null || !Number.isFinite(q)) return null;
  if (!forceShowQ && q <= 1) return null;
  if (q >= 1_000_000) return Math.floor(q / 1_000_000) + "m";
  if (q >= 10_000) return Math.floor(q / 1000) + "k";
  return String(Math.floor(q));
}

export function ItemInstance(props: ItemInstanceProps): any {
  const React = getReact();
  ensureItemInstanceBadgeCss();
  const ref = React.useRef(null as HTMLSpanElement | null);
  const tipKeyRef = React.useRef("");
  const {
    name,
    skin,
    level,
    q,
    p,
    size = 40,
    className,
    title,
    stockChrome = true,
    forceShowQ,
    qtyColor,
    bankQ,
    cooltip = true,
    actual,
  } = props;

  const levelNum = coerceItemLevel(level);
  // Match stock hovername: G.titles prefix + upgrade/compound suffixes.
  const tip =
    title || itemInstanceLabel(name, { p, level: levelNum }) || name;
  const qtyLabel = formatQty(q, forceShowQ);
  const levelBadge = resolveItemLevelBadge(name, level);
  const bankLabel =
    bankQ != null && Number.isFinite(bankQ) && bankQ > 0
      ? formatQty(bankQ, true)
      : null;

  if (!tipKeyRef.current) tipKeyRef.current = nextItemCooltipKey(name);

  const nameRef = React.useRef(name);
  nameRef.current = name;
  const levelRef = React.useRef(level);
  levelRef.current = level;
  const qRef = React.useRef(q);
  qRef.current = q;
  const pRef = React.useRef(p);
  pRef.current = p;
  const actualRef = React.useRef(actual);
  actualRef.current = actual;
  const tipLabelRef = React.useRef(tip);
  tipLabelRef.current = tip;

  const rebuildTip = React.useCallback(() => {
    return itemCooltipHtml({
      name: nameRef.current,
      level: levelRef.current,
      q: qRef.current,
      p: pRef.current,
      actual: actualRef.current,
    });
  }, []);

  const tipHandlers = cooltip
    ? itemCooltipHandlers(tipKeyRef.current, rebuildTip)
    : null;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = stockChrome
      ? itemInstanceHtml(name, {
          skin,
          level: levelNum,
          q,
          p,
          size,
          title: tip,
          nativeTitle: false,
        })
      : itemIconHtml(name, {
          skin,
          size,
          title: tip,
          nativeTitle: false,
          p,
        });
    el.innerHTML = html || "";
    // Hide stock qty/level pip — we draw readable overlays in React.
    const stockBadges = el.querySelectorAll(".iqui, .iuui");
    for (let i = 0; i < stockBadges.length; i++) {
      const node = stockBadges[i] as HTMLElement;
      node.style.display = "none";
    }
    const root = el.querySelector(
      ".ecu-item-instance > div, .ecu-item-title-frame, .ecu-meter-icon",
    ) as HTMLElement | null;
    if (root) {
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
      // DOM stamp — survives box-sizing quirks / missed regex recolors.
      if (p) stampNativeItemTitleBorder(root, p);
    }
    return () => {
      if (el) el.innerHTML = "";
    };
  }, [name, skin, levelNum, q, p, size, tip, stockChrome]);

  React.useEffect(() => {
    if (!cooltip) return;
    const key = tipKeyRef.current;
    return () => {
      dismissItemCooltip(key);
    };
  }, [cooltip]);

  return e(
    "span",
    {
      className: ["ecu-item-instance-host", className].filter(Boolean).join(" "),
      style: {
        position: "relative",
        display: "inline-flex",
        width: size + 6,
        height: size + 6,
        flex: "0 0 auto",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
        verticalAlign: "middle",
        cursor: cooltip ? "help" : undefined,
      },
      title: cooltip ? undefined : tip,
      onMouseEnter: tipHandlers ? tipHandlers.onMouseEnter : undefined,
      onMouseMove: tipHandlers ? tipHandlers.onMouseMove : undefined,
      onMouseLeave: tipHandlers ? tipHandlers.onMouseLeave : undefined,
    },
    e("span", {
      ref,
      className: "ecu-item-instance-art",
      style: {
        display: "inline-flex",
        width: size + 6,
        height: size + 6,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        lineHeight: 0,
      },
    }),
    levelBadge
      ? e(
          "span",
          {
            className: "ecu-item-badge ecu-item-badge--level",
            title: "Level " + levelBadge.text,
            style: { color: levelBadge.color, borderColor: levelBadge.color },
          },
          levelBadge.text,
        )
      : null,
    qtyLabel
      ? e(
          "span",
          {
            className: "ecu-item-badge ecu-item-badge--qty",
            title: "Quantity " + (q != null ? q : qtyLabel),
            style: qtyColor
              ? { color: qtyColor, borderColor: qtyColor }
              : undefined,
          },
          qtyLabel,
        )
      : null,
    bankLabel
      ? e(
          "span",
          {
            className: "ecu-item-badge ecu-item-badge--bank",
            title: "Bank ×" + (bankQ != null ? bankQ : bankLabel),
          },
          bankLabel,
        )
      : null,
  );
}

/** Shared badge CSS — inject once from mail (or any host that uses ItemInstance). */
export const ITEM_INSTANCE_BADGE_CSS = `
.ecu-item-instance-host {
  position: relative;
  overflow: visible;
}
.ecu-item-badge {
  position: absolute;
  z-index: 2;
  min-width: 14px;
  padding: 0 4px;
  border: 1px solid #666;
  background: rgba(0, 0, 0, 0.92);
  color: #fff;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif !important;
  font-size: 11px !important;
  font-weight: 700;
  line-height: 14px !important;
  height: 14px;
  text-align: center;
  box-sizing: border-box !important;
  pointer-events: none;
  letter-spacing: 0;
}
.ecu-item-badge--qty {
  right: -2px;
  bottom: -2px;
  color: #fff;
}
.ecu-item-badge--level {
  left: -2px;
  bottom: -2px;
  color: #cfcfcf;
}
.ecu-item-badge--bank {
  right: -2px;
  top: -2px;
  color: #e8c96a;
  border-color: #8a7340;
}
`;

const BADGE_STYLE_ID = "ecu-item-instance-badge-css";

let itemInstanceBadgeCssInjected = false;

/** Idempotent — safe from ItemInstance / TradeSlotCell / mail hosts. */
export function ensureItemInstanceBadgeCss(): void {
  if (typeof document === "undefined") return;
  if (itemInstanceBadgeCssInjected) {
    if (document.getElementById(BADGE_STYLE_ID)) return;
    itemInstanceBadgeCssInjected = false;
  }
  let el = document.getElementById(BADGE_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = BADGE_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = ITEM_INSTANCE_BADGE_CSS;
  itemInstanceBadgeCssInjected = true;
}
