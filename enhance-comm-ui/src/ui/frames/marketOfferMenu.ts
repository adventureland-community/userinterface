/**
 * Market Focus offer overflow menu — Mirror / Undercut / Reprice / Delist.
 * Reuses bag context-menu chrome. Also hosts the giveaway participants popover.
 */

import { ensureBagItemContextMenuCss } from "../bag/bagItemContextMenuCss";

export type MarketOfferMenuAction = {
  id: string;
  label: string;
  title?: string;
  disabled?: boolean;
  run?: () => void;
};

let ctxEl: HTMLDivElement | null = null;
let ctxKeyHandler: ((ev: KeyboardEvent) => void) | null = null;
let ctxDocHandler: ((ev: MouseEvent) => void) | null = null;

function hideMarketOfferMenu(): void {
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

function attachDismissHandlers(): void {
  ctxKeyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      hideMarketOfferMenu();
    }
  };
  ctxDocHandler = (ev: MouseEvent) => {
    if (ctxEl && !ctxEl.contains(ev.target as Node)) hideMarketOfferMenu();
  };
  document.addEventListener("keydown", ctxKeyHandler, true);
  document.addEventListener("mousedown", ctxDocHandler, true);
}

/** Open offer actions at a screen point (⋯ button or right-click). */
export function showMarketOfferMenu(opts: {
  clientX: number;
  clientY: number;
  actions: MarketOfferMenuAction[];
}): void {
  hideMarketOfferMenu();
  if (!opts.actions.length) return;
  ensureBagItemContextMenuCss();

  const el = document.createElement("div");
  el.className = "comm-bag-ctx";
  el.setAttribute("role", "menu");

  for (let i = 0; i < opts.actions.length; i++) {
    const act = opts.actions[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "comm-bag-ctx__item" + (act.disabled ? " is-disabled" : "");
    btn.setAttribute("role", "menuitem");
    btn.textContent = act.label;
    if (act.title) btn.title = act.title;
    if (act.disabled) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        hideMarketOfferMenu();
        act.run?.();
      });
    }
    el.appendChild(btn);
  }

  document.body.appendChild(el);
  ctxEl = el;
  clampMenuPosition(el, opts.clientX, opts.clientY);
  attachDismissHandlers();
}

/** Read-only popover listing giveaway entrants. */
export function showGiveawayParticipants(opts: {
  clientX: number;
  clientY: number;
  merchant: string;
  names: string[];
}): void {
  hideMarketOfferMenu();
  ensureBagItemContextMenuCss();

  const el = document.createElement("div");
  el.className = "comm-bag-ctx MarketPanel-giveawayPop";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Giveaway participants");

  const head = document.createElement("div");
  head.className = "MarketPanel-giveawayPopHead";
  const count = opts.names.length;
  head.textContent =
    count === 0
      ? "No participants yet"
      : count + (count === 1 ? " participant" : " participants");
  el.appendChild(head);

  if (opts.merchant) {
    const sub = document.createElement("div");
    sub.className = "MarketPanel-giveawayPopSub";
    sub.textContent = opts.merchant + "'s giveaway";
    el.appendChild(sub);
  }

  if (opts.names.length) {
    const list = document.createElement("ul");
    list.className = "MarketPanel-giveawayPopList";
    for (let i = 0; i < opts.names.length; i++) {
      const li = document.createElement("li");
      li.textContent = opts.names[i];
      list.appendChild(li);
    }
    el.appendChild(list);
  }

  document.body.appendChild(el);
  ctxEl = el;
  clampMenuPosition(el, opts.clientX, opts.clientY);
  attachDismissHandlers();
}

export function hideMarketOfferMenuIfOpen(): void {
  hideMarketOfferMenu();
}
