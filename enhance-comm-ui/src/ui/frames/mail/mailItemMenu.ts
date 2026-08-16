import {
  fingerprintFromSlot,
  openMail,
  type ItemFingerprint,
  type MailItem,
} from "../../../host/mail";
import { openItem } from "../../../host/infoDialog/api";
import { ensureMailCss } from "./mailCss";

let ctxEl: HTMLDivElement | null = null;
let ctxKeyHandler: ((ev: KeyboardEvent) => void) | null = null;
let ctxDocHandler: ((ev: MouseEvent) => void) | null = null;

export type MailBagMenuAction = {
  id: string;
  label: string;
  title?: string;
  /** Visual divider above this row. */
  separatorBefore?: boolean;
  run: () => void;
};

function hideCtx(): void {
  if (ctxKeyHandler) {
    document.removeEventListener("keydown", ctxKeyHandler, true);
    ctxKeyHandler = null;
  }
  if (ctxDocHandler) {
    document.removeEventListener("mousedown", ctxDocHandler, true);
    ctxDocHandler = null;
  }
  if (ctxEl) {
    ctxEl.remove();
    ctxEl = null;
  }
}

function clampMenuPosition(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  const pad = 8;
  const w = el.offsetWidth || 200;
  const h = el.offsetHeight || 80;
  const maxX = Math.max(pad, window.innerWidth - w - pad);
  const maxY = Math.max(pad, window.innerHeight - h - pad);
  el.style.left = Math.min(Math.max(pad, clientX), maxX) + "px";
  el.style.top = Math.min(Math.max(pad, clientY), maxY) + "px";
}

/**
 * Observed bag inventory lives on `window.observing.items` (the /comm snap).
 * Do not use getObserving() — that prefers the live entity, which has no items.
 */
function observingBagItem(slot: number): MailItem | null {
  const obs = window.observing;
  if (!obs || !Array.isArray(obs.items)) return null;
  const item = obs.items[slot] as MailItem | undefined;
  if (!item || !item.name || item.name === "placeholder") return null;
  return item;
}

/** Item info dialog for observers (stock on_rclick needs character and is N/A on /comm). */
function openObservingItemInfo(slot: number): void {
  const obs = window.observing;
  const item = observingBagItem(slot);
  if (!obs || !item) return;
  openItem(obs, `inv${slot}`, item, { dialogOnly: true });
}

/**
 * Build the bag-slot context actions. Keep this the single place to add
 * more useful entries later.
 */
export function buildMailBagMenuActions(
  fp: ItemFingerprint,
  _slotEl: HTMLElement | null,
): MailBagMenuAction[] {
  const actions: MailBagMenuAction[] = [
    {
      id: "send-mail",
      label: "Send mail / queue attach",
      title:
        "Opens compose and queues this item. Right-click more items to batch (one mail each).",
      run: () => {
        openMail({ compose: true, attach: fp });
      },
    },
    {
      id: "item-info",
      label: "Item info…",
      title:
        "Open the Comm item info dialog for this slot (same as left-click).",
      separatorBefore: true,
      run: () => {
        openObservingItemInfo(fp.slot);
      },
    },
  ];
  return actions;
}

export function showMailItemContextMenu(
  clientX: number,
  clientY: number,
  fp: ItemFingerprint,
  slotEl?: HTMLElement | null,
): void {
  hideCtx();
  ensureMailCss();
  const actions = buildMailBagMenuActions(fp, slotEl || null);
  if (!actions.length) return;

  const el = document.createElement("div");
  el.className = "comm-mail-ctx";
  el.setAttribute("role", "menu");
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.separatorBefore) {
      const sep = document.createElement("div");
      sep.className = "comm-mail-ctx__sep";
      sep.setAttribute("role", "separator");
      el.appendChild(sep);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "comm-mail-ctx__item";
    btn.setAttribute("role", "menuitem");
    btn.textContent = action.label;
    if (action.title) btn.title = action.title;
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      hideCtx();
      action.run();
    });
    el.appendChild(btn);
  }
  document.body.appendChild(el);
  ctxEl = el;
  clampMenuPosition(el, clientX, clientY);

  ctxKeyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      hideCtx();
    }
  };
  ctxDocHandler = (ev: MouseEvent) => {
    if (ctxEl && ev.target instanceof Node && ctxEl.contains(ev.target)) {
      return;
    }
    hideCtx();
  };
  document.addEventListener("keydown", ctxKeyHandler, true);
  window.setTimeout(() => {
    if (ctxDocHandler) {
      document.addEventListener("mousedown", ctxDocHandler, true);
    }
  }, 0);
}

function resolveInventorySlotNum(
  start: HTMLElement,
  host: HTMLElement,
): number | null {
  let node: HTMLElement | null = start;
  while (node && host.contains(node)) {
    const cnum = node.getAttribute && node.getAttribute("data-cnum");
    if (cnum != null && cnum !== "") {
      const n = parseInt(cnum, 10);
      if (Number.isFinite(n)) return n;
    }
    const id = node.id || "";
    const idMatch = /^citem(\d+)$/.exec(id);
    if (idMatch) return parseInt(idMatch[1], 10);
    const oc = node.getAttribute && node.getAttribute("onclick");
    if (oc) {
      const m = /inventory_click\((\d+)/.exec(oc);
      if (m) return parseInt(m[1], 10);
    }
    const om = node.getAttribute && node.getAttribute("onmousedown");
    if (om) {
      const m = /inventory_click\((\d+)/.exec(om);
      if (m) return parseInt(m[1], 10);
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Plain right-click a bag slot → Comm context menu (extensible actions).
 * Shift+right-click is left alone for any stock handler.
 */
export function installBagMailContextMenu(host: HTMLElement): () => void {
  ensureMailCss();
  const onCtx = (ev: MouseEvent) => {
    if (ev.shiftKey) return;

    const t = ev.target as HTMLElement | null;
    if (!t || !host.contains(t)) return;
    const num = resolveInventorySlotNum(t, host);
    if (num == null || !Number.isFinite(num)) return;

    const item = observingBagItem(num);
    const fp = fingerprintFromSlot(num, item);
    if (!fp) return;

    ev.preventDefault();
    ev.stopPropagation();
    showMailItemContextMenu(ev.clientX, ev.clientY, fp, t);
  };
  host.addEventListener("contextmenu", onCtx, true);
  return () => {
    hideCtx();
    host.removeEventListener("contextmenu", onCtx, true);
  };
}
