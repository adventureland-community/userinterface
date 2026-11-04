/**
 * Bottom action sheet for touch — nested rows expand inline on tap.
 */

import { bindSwipeDownClose } from "./phoneShell";
import type { ActionMenuAction } from "./actionMenuTypes";
import { ensurePhoneNavCss } from "../frames/comm/phoneNavCss";

const STYLE_ID = "ecu-phone-action-sheet-css";

let sheetRoot: HTMLElement | null = null;
let unbindSwipe: (() => void) | null = null;
let keyHandler: ((ev: KeyboardEvent) => void) | null = null;

function ensureActionSheetCss(): void {
  ensurePhoneNavCss();
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.ecu-phone-action-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 560;
  max-height: min(72vh, 560px);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  background: #1c1b1f;
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.5);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  font-family: Roboto, "Segoe UI", system-ui, sans-serif;
  color: #e6e1e5;
}
.ecu-phone-action-sheet__scrim {
  position: fixed;
  inset: 0;
  z-index: 550;
  background: rgba(0, 0, 0, 0.45);
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
}
.ecu-phone-action-sheet__handle {
  align-self: center;
  width: 48px;
  height: 20px;
  margin: 6px 0 2px;
  flex-shrink: 0;
  touch-action: none;
  position: relative;
}
.ecu-phone-action-sheet__handle::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  top: 8px;
  height: 4px;
  border-radius: 2px;
  background: rgba(230, 225, 229, 0.35);
}
.ecu-phone-action-sheet__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 16px 10px;
  flex-shrink: 0;
}
.ecu-phone-action-sheet__title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}
.ecu-phone-action-sheet__done {
  min-height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 18px;
  background: rgba(157, 212, 236, 0.16);
  color: #9dd4ec;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.ecu-phone-action-sheet__body {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 8px 16px;
  flex: 1 1 auto;
  min-height: 0;
}
.ecu-phone-action-sheet__sep {
  height: 1px;
  margin: 6px 12px;
  background: rgba(230, 225, 229, 0.12);
}
.ecu-phone-action-sheet__row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  margin: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #e6e1e5;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ecu-phone-action-sheet__row:active {
  background: rgba(157, 212, 236, 0.12);
}
.ecu-phone-action-sheet__row.is-disabled {
  opacity: 0.45;
  cursor: default;
}
.ecu-phone-action-sheet__row.has-kids .ecu-phone-action-sheet__chev {
  margin-left: auto;
  opacity: 0.7;
}
.ecu-phone-action-sheet__kids {
  display: none;
  padding: 0 0 4px 12px;
}
.ecu-phone-action-sheet__group.is-open > .ecu-phone-action-sheet__kids {
  display: block;
}
.ecu-phone-action-sheet__group.is-open > .ecu-phone-action-sheet__row .ecu-phone-action-sheet__chev {
  transform: rotate(90deg);
}
`;
  document.head.appendChild(style);
}

export function hidePhoneActionSheet(): void {
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler, true);
    keyHandler = null;
  }
  if (unbindSwipe) {
    unbindSwipe();
    unbindSwipe = null;
  }
  if (sheetRoot) {
    sheetRoot.remove();
    sheetRoot = null;
  }
}

function appendRows(
  host: HTMLElement,
  actions: ActionMenuAction[],
  onDone: () => void,
): void {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.separatorBefore) {
      const sep = document.createElement("div");
      sep.className = "ecu-phone-action-sheet__sep";
      sep.setAttribute("role", "separator");
      host.appendChild(sep);
    }

    const hasKids =
      Array.isArray(action.children) && action.children.length > 0;

    if (hasKids) {
      const group = document.createElement("div");
      group.className = "ecu-phone-action-sheet__group";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ecu-phone-action-sheet__row has-kids";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", action.label);
      if (action.mountLabel) action.mountLabel(btn);
      else btn.textContent = action.label;
      const chev = document.createElement("span");
      chev.className = "ecu-phone-action-sheet__chev";
      chev.setAttribute("aria-hidden", "true");
      chev.textContent = "›";
      btn.appendChild(chev);
      if (action.title) btn.title = action.title;
      if (action.disabled) {
        btn.disabled = true;
        btn.className += " is-disabled";
      } else {
        btn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const open = !group.classList.contains("is-open");
          group.classList.toggle("is-open", open);
          btn.setAttribute("aria-expanded", open ? "true" : "false");
        });
      }

      const kids = document.createElement("div");
      kids.className = "ecu-phone-action-sheet__kids";
      appendRows(kids, action.children!, onDone);

      group.appendChild(btn);
      group.appendChild(kids);
      host.appendChild(group);
      continue;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ecu-phone-action-sheet__row";
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
        onDone();
        action.run?.();
      });
    }
    host.appendChild(btn);
  }
}

export function showPhoneActionSheet(opts: {
  title?: string;
  actions: ActionMenuAction[];
}): void {
  hidePhoneActionSheet();
  if (!opts.actions.length) return;
  ensureActionSheetCss();

  const wrap = document.createElement("div");
  wrap.className = "ecu-phone-action-sheet-root";

  const scrim = document.createElement("button");
  scrim.type = "button";
  scrim.className = "ecu-phone-action-sheet__scrim";
  scrim.setAttribute("aria-label", "Dismiss");
  scrim.addEventListener("click", () => hidePhoneActionSheet());

  const sheet = document.createElement("div");
  sheet.className = "ecu-phone-action-sheet ecu-phone-sheet";
  sheet.setAttribute("role", "menu");

  const handle = document.createElement("div");
  handle.className = "ecu-phone-action-sheet__handle";

  const hd = document.createElement("div");
  hd.className = "ecu-phone-action-sheet__hd";
  const title = document.createElement("h2");
  title.className = "ecu-phone-action-sheet__title";
  title.textContent = opts.title || "Actions";
  const done = document.createElement("button");
  done.type = "button";
  done.className = "ecu-phone-action-sheet__done";
  done.textContent = "Done";
  done.addEventListener("click", () => hidePhoneActionSheet());
  hd.appendChild(title);
  hd.appendChild(done);

  const body = document.createElement("div");
  body.className = "ecu-phone-action-sheet__body";
  appendRows(body, opts.actions, hidePhoneActionSheet);

  sheet.appendChild(handle);
  sheet.appendChild(hd);
  sheet.appendChild(body);
  wrap.appendChild(scrim);
  wrap.appendChild(sheet);
  document.body.appendChild(wrap);
  sheetRoot = wrap;

  unbindSwipe = bindSwipeDownClose(handle, hidePhoneActionSheet);
  keyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      hidePhoneActionSheet();
    }
  };
  document.addEventListener("keydown", keyHandler, true);
}
