/**
 * Lightweight body toast for /comm (mail alerts, shortcut hints).
 */

const TOAST_CLASS = "ecu-mail-toast";
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function showCommToast(message: string, ms = 3200): void {
  if (typeof document === "undefined") return;
  const text = String(message || "").trim();
  if (!text) return;

  let el = document.querySelector("." + TOAST_CLASS) as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.className = TOAST_CLASS;
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add("is-on");
  if (hideTimer != null) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    el && el.classList.remove("is-on");
    hideTimer = null;
  }, Math.max(800, ms));
}
