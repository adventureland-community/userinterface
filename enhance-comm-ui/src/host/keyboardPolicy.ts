import { closeTopLeftDialog, isTopLeftDialogOpen } from "./dialogHost";
import { closeServerDd, isServerDdOpen } from "./commChrome/serverDropdown";

export type CommKeyboardHandlers = {
  /** Clear paperdoll / xtarget selection. Return true if handled. */
  clearPaperdoll?: () => boolean;
  /** Toggle layout edit (Ctrl+Shift+L). */
  toggleLayoutEdit?: () => void;
};

const BOUND = "__ecuCommKeyboardBound";

/**
 * One Esc / shortcut policy for /comm UI:
 *   Esc → close buff/item info → close server dropdown → clear paperdoll → leave observe
 *   Ctrl+Shift+L → toggle layout edit (when registered)
 *
 * Handlers may be updated after install (React mounts later than chrome).
 */
export function installCommKeyboardPolicy(
  handlers: CommKeyboardHandlers,
): void {
  (window as any).__ecuCommKeyHandlers = handlers;
  if ((window as any)[BOUND]) return;
  (window as any)[BOUND] = true;

  document.addEventListener("keydown", (ev: KeyboardEvent) => {
    const key = ev.key || "";
    const code = (ev as any).keyCode;
    const h =
      ((window as any).__ecuCommKeyHandlers as CommKeyboardHandlers) || {};

    if (key === "Escape" || code === 27) {
      if (isTopLeftDialogOpen() && closeTopLeftDialog()) return;
      if (isServerDdOpen()) {
        closeServerDd();
        return;
      }
      if (h.clearPaperdoll && h.clearPaperdoll()) return;
      if (window.observing && window.__ecuClearObserve) {
        window.__ecuClearObserve();
      }
      return;
    }

    if (
      (key === "l" || key === "L") &&
      ev.ctrlKey &&
      ev.shiftKey &&
      !ev.altKey
    ) {
      const t = ev.target as HTMLElement | null;
      const tag = t && t.tagName ? t.tagName.toLowerCase() : "";
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (t && (t as any).isContentEditable)
      ) {
        return;
      }
      if (!h.toggleLayoutEdit) return;
      ev.preventDefault();
      h.toggleLayoutEdit();
    }
  });
}

export function updateCommKeyboardHandlers(
  handlers: CommKeyboardHandlers,
): void {
  (window as any).__ecuCommKeyHandlers = handlers;
}
