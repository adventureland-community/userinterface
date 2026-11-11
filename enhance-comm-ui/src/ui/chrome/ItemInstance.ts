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
  cxJarContentSkin,
  cxJarData,
  getItemData,
} from "../../lib/itemInstanceData";
import {
  coerceItemLevel,
  resolveItemLevelBadge,
} from "../../lib/itemLevelBadge";
import { stampNativeItemTitleBorder } from "../../lib/itemTitleBorder";
import { isCommTouchUi } from "../../lib/commTouchUi";
import {
  dismissItemCooltip,
  itemCooltipHandlers,
  itemCooltipHtml,
  nextItemCooltipKey,
  type ItemCooltipActual,
} from "./itemCooltip";
import { stripNativeTitles } from "./stripNativeTitles";
import { wrapIconHtml } from "./wrapIconHtml";

export type ItemInstanceProps = {
  name: string;
  skin?: string;
  /** Numeric level, or a string that coerces (mail / API sometimes stringify). */
  level?: number | string;
  q?: number;
  p?: string;
  /** Free-form instance payload (`ItemInfo.data`, e.g. cxjar cosmetic id). */
  data?: string;
  size?: number;
  className?: string;
  /** Plain-text fallback label; unused when cooltip is on. */
  title?: string;
  /**
   * Prefer stock `item_container` art (borders / rarity), then overlay our
   * readable qty/level badges. Default true.
   */
  stockChrome?: boolean;
  /**
   * When stockChrome: strip item_container margin/space/border so the tile
   * can sit inside our own chrome (glance chips, shrine pickers).
   */
  bare?: boolean;
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
    data,
    size = 40,
    className,
    title,
    stockChrome = true,
    bare = false,
    forceShowQ,
    qtyColor,
    bankQ,
    cooltip = true,
    actual,
  } = props;

  const levelNum = coerceItemLevel(level);
  const resolvedData =
    getItemData({ data }) ||
    getItemData(actual as { data?: unknown } | null | undefined) ||
    undefined;
  const sealedCx = cxJarData({ name, data: resolvedData });
  // Sealed look wins over G.items.cxjar.skin (explorer CxJarItemSprite parity).
  const sealedSkin = sealedCx ? cxJarContentSkin(sealedCx) : undefined;
  const effectiveSkin = sealedSkin || skin;
  /** Corner jar chip — same ratio as al-data-explorer `CxJarItemSprite`. */
  const jarBadgePx = sealedCx
    ? Math.max(14, Math.round(size * 0.45))
    : 0;
  const jarBadgeHtml =
    sealedCx && jarBadgePx
      ? itemIconHtml("cxjar", {
          size: jarBadgePx,
          nativeTitle: false,
        })
      : "";
  const tipActual: ItemCooltipActual = {
    name,
    ...(actual || {}),
  };
  if (tipActual.level == null && level != null) tipActual.level = level;
  if (tipActual.q == null && q != null) tipActual.q = q;
  if (tipActual.p == null && p != null) tipActual.p = p;
  if (resolvedData && tipActual.data == null) tipActual.data = resolvedData;

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
  const actualRef = React.useRef(tipActual);
  actualRef.current = tipActual;
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

  // Touch: tap opens item info / inspect; skip hover tips (no hover).
  const tipHandlers =
    cooltip && !isCommTouchUi()
      ? itemCooltipHandlers(tipKeyRef.current, rebuildTip)
      : null;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = stockChrome
      ? itemInstanceHtml(name, {
          skin: effectiveSkin,
          level: levelNum,
          q,
          p,
          size,
          title: tip,
          nativeTitle: false,
          bare,
        })
      : itemIconHtml(name, {
          skin: effectiveSkin,
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
    // Stock item_container / border wrappers may still carry title= — strip
    // when Comm cooltip owns hover (also clear the React host).
    if (cooltip) {
      stripNativeTitles(el);
      const host = el.parentElement;
      if (host) host.removeAttribute("title");
    }
    return () => {
      if (el) el.innerHTML = "";
    };
  }, [name, effectiveSkin, levelNum, q, p, size, tip, stockChrome, bare, cooltip]);

  React.useEffect(() => {
    if (!cooltip) return;
    const key = tipKeyRef.current;
    return () => {
      dismissItemCooltip(key);
    };
  }, [cooltip]);

  // Stock chrome needs +6 for item_container pad/border; bare/icon crops fit `size`.
  const box = bare || !stockChrome ? size : size + 6;
  return e(
    "span",
    {
      className: ["ecu-item-instance-host", className].filter(Boolean).join(" "),
      style: {
        position: "relative",
        display: "inline-flex",
        width: box,
        height: box,
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
        width: box,
        height: box,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        lineHeight: 0,
      },
    }),
    jarBadgeHtml
      ? e(
          "span",
          {
            className: "ecu-item-badge ecu-item-badge--cxjar",
            "aria-hidden": true,
            style: {
              width: jarBadgePx,
              height: jarBadgePx,
            },
          },
          wrapIconHtml(jarBadgeHtml),
        )
      : null,
    levelBadge && !sealedCx
      ? e(
          "span",
          {
            className: "ecu-item-badge ecu-item-badge--level",
            // Skip native titles when Comm cooltip is on — they stack on hover.
            title: cooltip ? undefined : "Level " + levelBadge.text,
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
            title: cooltip
              ? undefined
              : "Quantity " + (q != null ? q : qtyLabel),
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
            title: cooltip
              ? undefined
              : "Bank ×" + (bankQ != null ? bankQ : bankLabel),
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
.ecu-item-badge--cxjar {
  left: 0;
  bottom: 0;
  z-index: 3;
  min-width: 0;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 2px;
  background: rgba(18, 18, 22, 0.94);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  line-height: 0 !important;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ecu-item-badge--cxjar .ecu-icon-html,
.ecu-item-badge--cxjar .ecu-item-instance,
.ecu-item-badge--cxjar .ecu-meter-icon {
  display: block !important;
  margin: 0 !important;
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
