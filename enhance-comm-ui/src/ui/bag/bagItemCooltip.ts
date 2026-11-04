/**
 * Comm item cooltip on the stock bag grid (#bottomleftcorner).
 * Stock slots are not React ItemInstance — bind via host delegation.
 */

import { isCommTouchUi } from "../../lib/commTouchUi";
import {
  dismissItemCooltip,
  itemCooltipHandlers,
  itemCooltipHtml,
  type ItemCooltipActual,
} from "../chrome/itemCooltip";
import { stripNativeTitles } from "../chrome/stripNativeTitles";
import {
  observingBagItem,
  resolveInventorySlotNum,
} from "./bagItemContextMenu";

function slotRoot(host: HTMLElement, num: number): HTMLElement | null {
  const nodes = host.querySelectorAll("[data-cnum]");
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLElement;
    if (node.getAttribute("data-cnum") === String(num)) return node;
  }
  const byId = document.getElementById("citem" + num);
  if (byId && host.contains(byId)) return byId as HTMLElement;
  return null;
}

/**
 * Hover bag slots → stock `render_item` Comm cooltip (same as ItemInstance).
 * Clears native `title` on the active slot so the browser tip does not stack.
 */
export function installBagItemCooltip(host: HTMLElement): () => void {
  // Phone: tap opens item info; long-press opens actions — no hover tip.
  if (isCommTouchUi()) return () => {};

  let activeSlot: number | null = null;
  let activeKey: string | null = null;
  let handlers: ReturnType<typeof itemCooltipHandlers> | null = null;

  const dismiss = () => {
    if (activeKey) dismissItemCooltip(activeKey);
    activeSlot = null;
    activeKey = null;
    handlers = null;
  };

  const showForSlot = (num: number, ev: MouseEvent) => {
    const item = observingBagItem(num);
    if (!item || !item.name) {
      dismiss();
      return;
    }
    const root = slotRoot(host, num);
    if (root) stripNativeTitles(root);

    const key = "bag:" + num + ":" + item.name;
    if (activeSlot === num && activeKey === key && handlers) {
      handlers.onMouseMove(ev);
      return;
    }
    if (activeKey && activeKey !== key) dismissItemCooltip(activeKey);

    activeSlot = num;
    activeKey = key;
    const actual = item as ItemCooltipActual;
    handlers = itemCooltipHandlers(key, () =>
      itemCooltipHtml({
        name: String(item.name),
        level: actual.level,
        q: actual.q,
        p: actual.p != null ? String(actual.p) : undefined,
        actual,
      }),
    );
    handlers.onMouseEnter(ev);
  };

  const onOver = (ev: MouseEvent) => {
    const t = ev.target as HTMLElement | null;
    if (!t || !host.contains(t)) return;
    const num = resolveInventorySlotNum(t, host);
    if (num == null || !Number.isFinite(num)) return;
    showForSlot(num, ev);
  };

  const onMove = (ev: MouseEvent) => {
    if (activeSlot == null || !handlers) return;
    const t = ev.target as HTMLElement | null;
    if (!t || !host.contains(t)) return;
    const num = resolveInventorySlotNum(t, host);
    if (num !== activeSlot) return;
    handlers.onMouseMove(ev);
  };

  const onOut = (ev: MouseEvent) => {
    if (activeSlot == null) return;
    const related = ev.relatedTarget as Node | null;
    const root = slotRoot(host, activeSlot);
    if (root && related && root.contains(related)) return;
    if (related && host.contains(related as Node)) {
      const next = resolveInventorySlotNum(related as HTMLElement, host);
      if (next === activeSlot) return;
      // Moving onto another slot — onOver will replace; avoid flash.
      if (next != null) return;
    }
    dismiss();
  };

  host.addEventListener("pointerover", onOver);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerout", onOut);
  return () => {
    dismiss();
    host.removeEventListener("pointerover", onOver);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerout", onOut);
  };
}
