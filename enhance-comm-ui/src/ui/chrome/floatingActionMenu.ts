/**
 * Desktop floating action menu (comm-bag-ctx chrome).
 */

import { ensureBagItemContextMenuCss } from "../bag/bagItemContextMenuCss";
import type { ActionMenuAction } from "./actionMenuTypes";

let ctxEl: HTMLDivElement | null = null;
let ctxKeyHandler: ((ev: KeyboardEvent) => void) | null = null;
let ctxDocHandler: ((ev: MouseEvent) => void) | null = null;

export function hideFloatingActionMenu(): void {
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

function positionFlyout(wrap: HTMLElement, flyout: HTMLElement): void {
  const btn = wrap.querySelector(".comm-bag-ctx__item") as HTMLElement | null;
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  flyout.style.visibility = "hidden";
  flyout.style.display = "block";
  const fw = flyout.offsetWidth || 200;
  const fh = flyout.offsetHeight || 80;
  let left = rect.right - 2;
  if (left + fw > window.innerWidth - 8) {
    left = Math.max(8, rect.left - fw + 2);
  }
  let top = rect.top;
  if (top + fh > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - fh - 8);
  }
  flyout.style.left = left + "px";
  flyout.style.top = top + "px";
  flyout.style.visibility = "visible";
}

function closeSubmenus(root: HTMLElement, except?: HTMLElement): void {
  const open = root.querySelectorAll(".comm-bag-ctx__subwrap.is-open");
  for (let i = 0; i < open.length; i++) {
    const wrap = open[i] as HTMLElement;
    if (except && (wrap === except || wrap.contains(except))) continue;
    wrap.classList.remove("is-open");
    const flyout = wrap.querySelector(
      ".comm-bag-ctx--flyout",
    ) as HTMLElement | null;
    if (flyout) flyout.style.display = "none";
  }
}

function appendAction(
  root: HTMLElement,
  action: ActionMenuAction,
  onActivate: () => void,
): void {
  if (action.separatorBefore) {
    const sep = document.createElement("div");
    sep.className = "comm-bag-ctx__sep";
    sep.setAttribute("role", "separator");
    root.appendChild(sep);
  }

  const hasChildren =
    Array.isArray(action.children) && action.children.length > 0;

  if (hasChildren) {
    const wrap = document.createElement("div");
    wrap.className = "comm-bag-ctx__subwrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "comm-bag-ctx__item has-submenu";
    btn.setAttribute("role", "menuitem");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-label", action.label);
    if (action.mountLabel) action.mountLabel(btn);
    else btn.textContent = action.label;
    const arrow = document.createElement("span");
    arrow.className = "comm-bag-ctx__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";
    btn.appendChild(arrow);
    if (action.title) btn.title = action.title;
    if (action.disabled) {
      btn.disabled = true;
      btn.className += " is-disabled";
      wrap.appendChild(btn);
      root.appendChild(wrap);
      return;
    }

    const flyout = document.createElement("div");
    flyout.className = "comm-bag-ctx comm-bag-ctx--flyout";
    flyout.setAttribute("role", "menu");
    for (let i = 0; i < action.children!.length; i++) {
      appendAction(flyout, action.children![i], onActivate);
    }

    let closeTimer = 0;
    const openSub = () => {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }
      closeSubmenus(root, wrap);
      wrap.classList.add("is-open");
      positionFlyout(wrap, flyout);
    };
    const scheduleClose = () => {
      if (closeTimer) window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        wrap.classList.remove("is-open");
        flyout.style.display = "none";
        closeTimer = 0;
      }, 160);
    };

    btn.addEventListener("mouseenter", openSub);
    btn.addEventListener("focus", openSub);
    wrap.addEventListener("mouseleave", scheduleClose);
    flyout.addEventListener("mouseenter", () => {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }
    });
    flyout.addEventListener("mouseleave", scheduleClose);

    wrap.appendChild(btn);
    wrap.appendChild(flyout);
    root.appendChild(wrap);
    return;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "comm-bag-ctx__item";
  btn.setAttribute("role", "menuitem");
  btn.setAttribute("aria-label", action.label);
  if (action.mountLabel) action.mountLabel(btn);
  else btn.textContent = action.label;
  if (action.title) btn.title = action.title;
  if (action.disabled) {
    btn.disabled = true;
    btn.className += " is-disabled";
  } else {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      onActivate();
      action.run?.();
    });
  }
  root.appendChild(btn);
}

export function showFloatingActionMenu(opts: {
  clientX: number;
  clientY: number;
  actions: ActionMenuAction[];
}): void {
  hideFloatingActionMenu();
  if (!opts.actions.length) return;
  ensureBagItemContextMenuCss();

  const el = document.createElement("div");
  el.className = "comm-bag-ctx";
  el.setAttribute("role", "menu");
  for (let i = 0; i < opts.actions.length; i++) {
    appendAction(el, opts.actions[i], hideFloatingActionMenu);
  }
  document.body.appendChild(el);
  ctxEl = el;
  clampMenuPosition(el, opts.clientX, opts.clientY);

  ctxKeyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      hideFloatingActionMenu();
    }
  };
  ctxDocHandler = (ev: MouseEvent) => {
    if (ctxEl && ev.target instanceof Node && ctxEl.contains(ev.target)) {
      return;
    }
    hideFloatingActionMenu();
  };
  document.addEventListener("keydown", ctxKeyHandler, true);
  window.setTimeout(() => {
    if (ctxDocHandler) {
      document.addEventListener("mousedown", ctxDocHandler, true);
    }
  }, 0);
}
