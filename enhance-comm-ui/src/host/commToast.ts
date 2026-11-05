/**
 * Lightweight body toast for /comm (mail alerts, shortcut hints).
 */

import { getReactDOM } from "./react";

const TOAST_CLASS = "ecu-mail-toast";
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export type CommToastMessage =
  | string
  | {
      text: string;
      /** Trusted HTML (legacy / simple). Prefer `node` for item icons. */
      html?: string;
      /** React element tree (ItemInstance, etc.). */
      node?: unknown;
      durationMs?: number;
    };

function unmountToastReact(el: HTMLElement): void {
  try {
    const ReactDOM = getReactDOM();
    if (typeof ReactDOM.unmountComponentAtNode === "function") {
      ReactDOM.unmountComponentAtNode(el);
    }
  } catch {
    /* React not ready / already empty */
  }
}

export function showCommToast(message: CommToastMessage, ms = 3200): void {
  if (typeof document === "undefined") return;

  let text = "";
  let html: string | null = null;
  let node: unknown = null;
  let duration = ms;
  if (typeof message === "string") {
    text = String(message || "").trim();
  } else if (message && typeof message === "object") {
    text = String(message.text || "").trim();
    if (message.html) html = String(message.html);
    if (message.node != null) node = message.node;
    if (message.durationMs != null && Number.isFinite(message.durationMs)) {
      duration = Math.max(800, Number(message.durationMs));
    }
  }
  if (!text && !html && node == null) return;

  let el = document.querySelector("." + TOAST_CLASS) as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.className = TOAST_CLASS;
    document.body.appendChild(el);
  }
  unmountToastReact(el);
  if (node != null) {
    el.textContent = "";
    try {
      getReactDOM().render(node, el);
    } catch {
      el.textContent = text || "New mail";
    }
  } else if (html) {
    el.innerHTML = html;
  } else {
    el.textContent = text;
  }
  el.classList.add("is-on");
  if (hideTimer != null) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (el) {
      el.classList.remove("is-on");
      unmountToastReact(el);
    }
    hideTimer = null;
  }, Math.max(800, duration));
}
