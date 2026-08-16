/**
 * Reusable AL item instance — art + readable level / quantity chrome.
 * Prefer this over raw stock `item_container` HTML in Comm UI (mail inherits
 * a UI font that makes stock `.iqui` / `.iuui` badges unreadable).
 */

import { getReact, e } from "../../host/react";
import {
  itemDisplayName,
  itemIconHtml,
  itemInstanceHtml,
} from "../../lib/gameIcon";

export type ItemInstanceProps = {
  name: string;
  skin?: string;
  level?: number;
  q?: number;
  p?: string;
  size?: number;
  className?: string;
  title?: string;
  /**
   * Prefer stock `item_container` art (borders / rarity), then overlay our
   * readable qty/level badges. Default true.
   */
  stockChrome?: boolean;
};

function formatQty(q: number | undefined): string | null {
  if (q == null || !Number.isFinite(q) || q <= 1) return null;
  if (q >= 1_000_000) return Math.floor(q / 1_000_000) + "m";
  if (q >= 10_000) return Math.floor(q / 1000) + "k";
  return String(Math.floor(q));
}

function formatLevel(level: number | undefined): string | null {
  if (level == null || !Number.isFinite(level) || level <= 0) return null;
  return String(Math.floor(level));
}

export function ItemInstance(props: ItemInstanceProps): any {
  const React = getReact();
  const ref = React.useRef(null as HTMLSpanElement | null);
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
  } = props;

  const tip = title || itemDisplayName(name) || name;
  const qtyLabel = formatQty(q);
  const levelLabel = formatLevel(level);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = stockChrome
      ? itemInstanceHtml(name, {
          skin,
          level,
          q,
          p,
          size,
          title: tip,
          nativeTitle: false,
        })
      : itemIconHtml(name, { skin, size, title: tip, nativeTitle: false });
    el.innerHTML = html || "";
    // Hide stock qty/level pip — we draw readable overlays in React.
    const stockBadges = el.querySelectorAll(".iqui, .iuui");
    for (let i = 0; i < stockBadges.length; i++) {
      const node = stockBadges[i] as HTMLElement;
      node.style.display = "none";
    }
    const root = el.querySelector(
      ".ecu-item-instance > *, .ecu-meter-icon",
    ) as HTMLElement | null;
    if (root) {
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
    }
    return () => {
      if (el) el.innerHTML = "";
    };
  }, [name, skin, level, q, p, size, tip, stockChrome]);

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
      },
      title: tip,
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
    levelLabel
      ? e(
          "span",
          {
            className: "ecu-item-badge ecu-item-badge--level",
            title: "Level " + levelLabel,
          },
          levelLabel,
        )
      : null,
    qtyLabel
      ? e(
          "span",
          {
            className: "ecu-item-badge ecu-item-badge--qty",
            title: "Quantity " + (q != null ? q : qtyLabel),
          },
          qtyLabel,
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
`;
