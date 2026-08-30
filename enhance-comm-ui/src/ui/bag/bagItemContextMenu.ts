import {
  fingerprintFromSlot,
  type ItemFingerprint,
  type MailItem,
} from "../../host/mail";
import { ensureBagItemContextMenuCss } from "./bagItemContextMenuCss";

export type BagMenuAction = {
  id: string;
  label: string;
  title?: string;
  /** Visual divider above this row. */
  separatorBefore?: boolean;
  /** Non-interactive row (e.g. empty nearby list). */
  disabled?: boolean;
  run?: () => void;
  /** Nested flyout items (parent row opens submenu on hover). */
  children?: BagMenuAction[];
};

export type BagMenuContext = {
  fp: ItemFingerprint;
  slotEl: HTMLElement | null;
  item: MailItem;
};

export type BagMenuProvider = (ctx: BagMenuContext) => BagMenuAction[];

const providers: BagMenuProvider[] = [];

/** Register bag-slot context menu actions (mail, send item, etc.). */
export function registerBagMenuProvider(provider: BagMenuProvider): () => void {
  providers.push(provider);
  return () => {
    const idx = providers.indexOf(provider);
    if (idx >= 0) providers.splice(idx, 1);
  };
}

function buildBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  const actions: BagMenuAction[] = [];
  for (let i = 0; i < providers.length; i++) {
    const rows = providers[i](ctx);
    for (let j = 0; j < rows.length; j++) actions.push(rows[j]);
  }
  return actions;
}

let ctxEl: HTMLDivElement | null = null;
let ctxKeyHandler: ((ev: KeyboardEvent) => void) | null = null;
let ctxDocHandler: ((ev: MouseEvent) => void) | null = null;

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

function closeBagSubmenus(root: HTMLElement, except?: HTMLElement): void {
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

function appendBagMenuAction(
  root: HTMLElement,
  action: BagMenuAction,
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
    btn.textContent = action.label;
    const arrow = document.createElement("span");
    arrow.className = "comm-bag-ctx__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";
    btn.appendChild(arrow);
    if (action.title) btn.title = action.title;
    if (action.disabled) {
      btn.disabled = true;
      btn.className += " is-disabled";
    } else {
      const flyout = document.createElement("div");
      flyout.className = "comm-bag-ctx comm-bag-ctx--flyout";
      flyout.setAttribute("role", "menu");
      for (let i = 0; i < action.children!.length; i++) {
        appendBagMenuAction(flyout, action.children![i], onActivate);
      }

      let closeTimer = 0;
      const openSub = () => {
        if (closeTimer) {
          window.clearTimeout(closeTimer);
          closeTimer = 0;
        }
        closeBagSubmenus(root, wrap);
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
    }

    if (action.disabled) wrap.appendChild(btn);
    root.appendChild(wrap);
    return;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "comm-bag-ctx__item";
  btn.setAttribute("role", "menuitem");
  btn.textContent = action.label;
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

function renderBagMenuActions(
  root: HTMLElement,
  actions: BagMenuAction[],
  onActivate: () => void,
): void {
  for (let i = 0; i < actions.length; i++) {
    appendBagMenuAction(root, actions[i], onActivate);
  }
}

/**
 * Observed bag inventory lives on `window.observing.items` (the /comm snap).
 * Do not use getObserving() — that prefers the live entity, which has no items.
 */
export function observingBagItem(slot: number): MailItem | null {
  const obs = window.observing;
  if (!obs || !Array.isArray(obs.items)) return null;
  const item = obs.items[slot] as MailItem | undefined;
  if (!item || !item.name || item.name === "placeholder") return null;
  return item;
}

export function showBagItemContextMenu(
  clientX: number,
  clientY: number,
  fp: ItemFingerprint,
  slotEl?: HTMLElement | null,
  item?: MailItem | null,
): void {
  hideCtx();
  ensureBagItemContextMenuCss();
  const resolvedItem = item || observingBagItem(fp.slot);
  if (!resolvedItem) return;

  const ctx: BagMenuContext = {
    fp,
    slotEl: slotEl || null,
    item: resolvedItem,
  };
  const actions = buildBagMenuActions(ctx);
  if (!actions.length) return;

  const el = document.createElement("div");
  el.className = "comm-bag-ctx";
  el.setAttribute("role", "menu");
  renderBagMenuActions(el, actions, hideCtx);
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

export function resolveInventorySlotNum(
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
 * Plain right-click a bag slot → Comm context menu (extensible via providers).
 * Shift+right-click is left alone for any stock handler.
 */
export function installBagItemContextMenu(host: HTMLElement): () => void {
  ensureBagItemContextMenuCss();
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
    showBagItemContextMenu(ev.clientX, ev.clientY, fp, t, item);
  };
  host.addEventListener("contextmenu", onCtx, true);
  return () => {
    hideCtx();
    host.removeEventListener("contextmenu", onCtx, true);
  };
}
