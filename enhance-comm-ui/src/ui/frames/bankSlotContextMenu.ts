/**
 * Bank panel slot context menu — Withdraw / Inspect (reuses bag menu chrome).
 */

import { canEditObservedBag } from "../../host/gearObserved";
import { bankRetrieveCommand } from "../../host/bank/bankCommands";
import { ensureBagItemContextMenuCss } from "../bag/bagItemContextMenuCss";

export type BankSlotMenuItem = {
  name: string;
  level?: number;
  q?: number;
  p?: string | null;
};

let ctxEl: HTMLDivElement | null = null;
let ctxKeyHandler: ((ev: KeyboardEvent) => void) | null = null;
let ctxDocHandler: ((ev: MouseEvent) => void) | null = null;

function hideBankCtx(): void {
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

export type ShowBankItemFn = (item: BankSlotMenuItem) => void;

/** Right-click menu on a vault stack. */
export function showBankSlotContextMenu(opts: {
  clientX: number;
  clientY: number;
  pack: string;
  index: number;
  item: BankSlotMenuItem;
  showItem: ShowBankItemFn;
}): void {
  hideBankCtx();
  ensureBagItemContextMenuCss();

  const el = document.createElement("div");
  el.className = "comm-bag-ctx";
  el.setAttribute("role", "menu");

  const editable = canEditObservedBag();

  if (editable) {
    const withdraw = document.createElement("button");
    withdraw.type = "button";
    withdraw.className = "comm-bag-ctx__item";
    withdraw.setAttribute("role", "menuitem");
    withdraw.textContent = "Withdraw to bag";
    withdraw.title =
      "bank_retrieve — smart_moves to the vault floor if needed";
    withdraw.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      hideBankCtx();
      bankRetrieveCommand(opts.pack, opts.index, {
        expectName: opts.item.name,
      });
    });
    el.appendChild(withdraw);

    const sep = document.createElement("div");
    sep.className = "comm-bag-ctx__sep";
    sep.setAttribute("role", "separator");
    el.appendChild(sep);
  }

  const inspect = document.createElement("button");
  inspect.type = "button";
  inspect.className = "comm-bag-ctx__item";
  inspect.setAttribute("role", "menuitem");
  inspect.textContent = "Inspect";
  inspect.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    hideBankCtx();
    opts.showItem(opts.item);
  });
  el.appendChild(inspect);

  if (!editable) {
    const hint = document.createElement("div");
    hint.className = "comm-bag-ctx__item is-disabled";
    hint.style.opacity = "0.55";
    hint.style.cursor = "default";
    hint.textContent = "Observe a character to withdraw";
    el.insertBefore(hint, inspect);
  }

  document.body.appendChild(el);
  ctxEl = el;
  clampMenuPosition(el, opts.clientX, opts.clientY);

  ctxKeyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      hideBankCtx();
    }
  };
  ctxDocHandler = (ev: MouseEvent) => {
    if (ctxEl && ev.target instanceof Node && ctxEl.contains(ev.target)) {
      return;
    }
    hideBankCtx();
  };
  document.addEventListener("keydown", ctxKeyHandler, true);
  window.setTimeout(() => {
    if (ctxDocHandler) {
      document.addEventListener("mousedown", ctxDocHandler, true);
    }
  }, 0);
}
