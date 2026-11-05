/**
 * Shared phone full-screen panel shell + swipe-down-to-close.
 * Used by Chat / Bank / Market / Command / Mail / Bag (and the Windows sheet).
 */

/**
 * Fixed bottom inset: Material dock, or soft-keyboard occlusion
 * (`--ecu-vv-keyboard` from visualViewport), whichever is taller.
 */
export const PHONE_SHELL_EXPAND_BOTTOM =
  "calc(max(var(--ecu-phone-dock-h, 48px), var(--ecu-vv-keyboard, 0px)) + 8px)";

/** Any panel shell currently lifted as a phone bottom sheet. */
export const PHONE_SHELL_EXPANDED_SELECTOR =
  "[data-panel].ecu-chat-shell-expanded," +
  "[data-panel].ecu-command-shell-expanded," +
  "[data-panel].ecu-bank-shell-expanded," +
  "[data-panel].ecu-market-shell-expanded," +
  "[data-panel].ecu-mail-shell-expanded," +
  "[data-panel].ecu-bag-shell-expanded," +
  "[data-panel].ecu-settings-shell-expanded," +
  ".ecu-settings-backdrop.is-phone";

/** Hide camera chrome while a phone sheet covers the world. */
export function syncPhoneSheetOpenClass(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(PHONE_SHELL_EXPANDED_SELECTOR)) {
    document.documentElement.classList.add("ecu-phone-sheet-open");
  } else {
    document.documentElement.classList.remove("ecu-phone-sheet-open");
  }
}

/**
 * Fixed inset above the Material dock / soft keyboard. Pass `innerSelector`
 * (e.g. `.BankPanel`) so the panel fills the lifted shell.
 */
export function phoneShellExpandCss(
  panelAttr: string,
  className: string,
  innerSelector?: string,
): string {
  const inner = innerSelector
    ? `
[data-panel="${panelAttr}"].${className} ${innerSelector} {
  height: 100%;
  min-height: 0;
}
`
    : "";
  return `
[data-panel="${panelAttr}"].${className} {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  top: max(10px, env(safe-area-inset-top, 0px)) !important;
  bottom: ${PHONE_SHELL_EXPAND_BOTTOM} !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  min-width: 0 !important;
  min-height: 0 !important;
  z-index: 480 !important;
  transform: none !important;
  border-radius: 20px 20px 0 0 !important;
  overflow: hidden !important;
  box-shadow: 0 -10px 36px rgba(0, 0, 0, 0.5) !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
}
/* Sheet mode: foot Done replaces window X / expand chrome. */
[data-panel="${panelAttr}"].${className} > .comm-pos-panel-close,
[data-panel="${panelAttr}"].${className} .comm-pos-panel-close,
[data-panel="${panelAttr}"].${className} .ecu-panel-expand,
[data-panel="${panelAttr}"].${className} .CommandPanel-expand,
[data-panel="${panelAttr}"].${className} .BankPanel-expand,
[data-panel="${panelAttr}"].${className} .MarketPanel-expand,
[data-panel="${panelAttr}"].${className} .comm-bag-panel__expand,
[data-panel="${panelAttr}"].${className} .ecu-chat-expand,
[data-panel="${panelAttr}"].${className} .comm-mail__expand {
  display: none !important;
}
html.ecu-phone-sheet-open .ecu-cam-chrome,
html.ecu-phone-sheet-open [data-panel="targetFrame"],
html.ecu-phone-sheet-open .comm-pos-targetFrame {
  visibility: hidden !important;
  pointer-events: none !important;
}
${inner}`;
}

/**
 * Swipe down on `handle` to invoke onClose (threshold ~90px).
 * Returns unsubscribe.
 */
export function bindSwipeDownClose(
  handle: HTMLElement | null,
  onClose: () => void,
): () => void {
  if (!handle) return () => {};

  let startY = 0;
  let dy = 0;
  let active = false;
  const sheet =
    (handle.closest(".ecu-phone-sheet") as HTMLElement | null) ||
    (handle.closest(".ecu-settings-modal") as HTMLElement | null) ||
    (handle.closest("[data-panel]") as HTMLElement | null) ||
    handle;

  const onStart = (ev: TouchEvent) => {
    if (!ev.touches.length) return;
    active = true;
    startY = ev.touches[0].clientY;
    dy = 0;
    sheet.style.transition = "none";
  };

  const onMove = (ev: TouchEvent) => {
    if (!active || !ev.touches.length) return;
    dy = Math.max(0, ev.touches[0].clientY - startY);
    sheet.style.transform = "translateY(" + dy + "px)";
    if (dy > 8) ev.preventDefault();
  };

  const onEnd = () => {
    if (!active) return;
    active = false;
    if (dy > 90) {
      sheet.style.transform = "";
      sheet.style.transition = "";
      onClose();
      return;
    }
    sheet.style.transition = "transform 0.18s ease";
    sheet.style.transform = "translateY(0)";
    window.setTimeout(() => {
      sheet.style.transition = "";
      sheet.style.transform = "";
    }, 200);
    dy = 0;
  };

  handle.style.touchAction = "none";
  handle.addEventListener("touchstart", onStart, { passive: true });
  handle.addEventListener("touchmove", onMove, { passive: false });
  handle.addEventListener("touchend", onEnd, { passive: true });
  handle.addEventListener("touchcancel", onEnd, { passive: true });

  return () => {
    handle.removeEventListener("touchstart", onStart);
    handle.removeEventListener("touchmove", onMove);
    handle.removeEventListener("touchend", onEnd);
    handle.removeEventListener("touchcancel", onEnd);
  };
}
