/**
 * Bag slot chrome when a nearby player has a matching buy order.
 */

import { getEntitiesList } from "../../host/al";
import { fingerprintFromSlot } from "../../host/mail/itemFingerprint";
import {
  buyOrderItemKey,
  formatTradeGold,
  indexNearbyBuyOrders,
} from "../../lib/tradeHelpers";

const HOST_ID = "bottomleftcorner";
const BADGE_CLASS = "ecu-bag-buy-badge";
const MARK_CLASS = "ecu-bag-buy-order";

const BAG_BUY_ORDER_CSS = `
#${HOST_ID} [data-cnum].${MARK_CLASS} {
  position: relative;
}
#${HOST_ID} .${BADGE_CLASS} {
  position: absolute;
  top: 1px;
  right: 1px;
  z-index: 2;
  min-width: 13px;
  height: 13px;
  padding: 0 2px;
  box-sizing: border-box;
  background: #1a3a4a;
  border: 1px solid #8fd4ff;
  color: #fff;
  font-size: 9px;
  line-height: 11px;
  font-family: "Press Start 2P", monospace;
  text-align: center;
  pointer-events: none;
}
`;

let cssInjected = false;

function ensureCss(): void {
  if (cssInjected) return;
  cssInjected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ecu-bag-buy-css", "1");
  el.textContent = BAG_BUY_ORDER_CSS;
  document.head.appendChild(el);
}

function clearBuyOrderChrome(node: HTMLElement): void {
  node.classList.remove(MARK_CLASS);
  const badge = node.querySelector(`.${BADGE_CLASS}`);
  if (badge) badge.remove();
}

/** Stamp buy-order badges on bag slots after render_inventory. */
export function refreshBagBuyOrderIndicators(): void {
  if (!window.inventory) return;
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  const obs = window.observing;
  const items = obs && Array.isArray(obs.items) ? obs.items : null;
  if (!obs || !items) return;

  ensureCss();
  const index = indexNearbyBuyOrders(getEntitiesList(), obs);
  const nodes = host.querySelectorAll("[data-cnum]");

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLElement;
    clearBuyOrderChrome(node);

    const raw = node.getAttribute("data-cnum");
    if (raw == null || raw === "") continue;
    const num = parseInt(raw, 10);
    if (!Number.isFinite(num) || num < 0 || num >= items.length) continue;

    const item = items[num];
    const fp = fingerprintFromSlot(num, item);
    if (!fp) continue;

    const key = buyOrderItemKey(fp.name, fp.level, fp.p);
    const matches = index.get(key);
    if (!matches || !matches.length) continue;

    const best = matches[0];
    const priceLabel = formatTradeGold(best.listing.price);
    const tip = `Nearby buy order — ${best.entityName} ${priceLabel}g · right-click → Sell to buy order…`;

    node.classList.add(MARK_CLASS);
    const badge = document.createElement("span");
    badge.className = BADGE_CLASS;
    badge.textContent = "B";
    badge.title = tip;
    node.appendChild(badge);

    const existing = node.getAttribute("title") || "";
    if (existing.indexOf("Nearby buy order") < 0) {
      node.setAttribute("title", existing ? `${existing} · ${tip}` : tip);
    }
    const inner = node.querySelector(".rclick") as HTMLElement | null;
    if (inner) {
      const innerTip = inner.getAttribute("title") || existing;
      if (innerTip.indexOf("Nearby buy order") < 0) {
        inner.setAttribute(
          "title",
          innerTip ? `${innerTip} · ${tip}` : tip,
        );
      }
    }
  }
}
