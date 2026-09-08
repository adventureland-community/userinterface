import { closeTopLeftDialog, isTopLeftDialogOpen } from "./dialogHost";
import { closeServerDd, isServerDdOpen } from "./commChrome/serverDropdown";
import { openInventory } from "./inventory";
import { openChat } from "./chat";
import { openMail } from "./mail";
import { getObservingId } from "./al";
import { showCommToast } from "./commToast";

export type CommKeyboardHandlers = {
  /** Clear paperdoll / xtarget / spectator focus. Return true if handled. */
  clearPaperdoll?: () => boolean;
  /** Toggle layout edit (Ctrl+Shift+L). */
  toggleLayoutEdit?: () => void;
  /** Exit layout edit on Esc. Return true if it was on (consumed the Esc). */
  exitLayoutEdit?: () => boolean;
  /**
   * Toggle paperdoll for the observed character (stock C).
   * Return true if handled (even if no observing target).
   */
  toggleObservedPaperdoll?: () => boolean;
};

const BOUND = "__ecuCommKeyboardBound";

export type CommUiShortcut =
  | "escape"
  | "toggle_layout_edit"
  | "toggle_inventory"
  | "toggle_character"
  | "focus_chat"
  | "toggle_mail";

/** True when keystrokes should stay in an editable field. */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  const t = target as HTMLElement | null;
  if (!t || t.tagName == null) return false;
  const tag = String(t.tagName).toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((t as { isContentEditable?: boolean }).isContentEditable) return true;
  return false;
}

type ShortcutKeyEvent = {
  key?: string;
  keyCode?: number;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

/**
 * Map a keydown to a /comm UI shortcut, or null.
 * Ignores modifier chords except Ctrl+Shift+L (layout edit).
 */
export function resolveCommUiShortcut(
  ev: ShortcutKeyEvent,
): CommUiShortcut | null {
  const key = ev.key || "";
  const code = ev.keyCode;
  const ctrl = !!ev.ctrlKey;
  const meta = !!ev.metaKey;
  const alt = !!ev.altKey;
  const shift = !!ev.shiftKey;

  if (key === "Escape" || code === 27) return "escape";

  if ((key === "l" || key === "L") && ctrl && shift && !alt && !meta) {
    return "toggle_layout_edit";
  }

  // Stock game skills are unchorded — leave browser/Monaco chords alone.
  if (ctrl || meta || alt) return null;

  if (key === "i" || key === "I" || code === 73) return "toggle_inventory";
  if (key === "c" || key === "C" || code === 67) return "toggle_character";
  if (key === "m" || key === "M" || code === 77) return "toggle_mail";
  if (key === "Enter" || code === 13) return "focus_chat";

  return null;
}

/** Shared hint when Bag / paperdoll shortcuts need an observe target. */
export function notifyObserveRequired(): void {
  showCommToast("Observe a character first");
}

/**
 * One Esc / shortcut policy for /comm UI:
 *   Esc → blur focused input/chat → close buff/item info → close server dropdown
 *        → clear paperdoll/focus → exit layout edit → leave observe
 *   I → toggle bag (stock toggle_inventory)
 *   C → toggle observed paperdoll (stock toggle_character)
 *   Enter → open / focus Chat
 *   M → toggle Mail
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
    const shortcut = resolveCommUiShortcut(ev);
    if (!shortcut) return;

    const h =
      ((window as any).__ecuCommKeyHandlers as CommKeyboardHandlers) || {};

    if (shortcut === "escape") {
      // Stock esc_pressed blurs chat first so Enter→type→Esc returns to the map.
      if (isEditableKeyboardTarget(ev.target)) {
        const t = ev.target as HTMLElement;
        if (typeof t.blur === "function") t.blur();
        ev.preventDefault();
        return;
      }
      if (isTopLeftDialogOpen() && closeTopLeftDialog()) return;
      if (isServerDdOpen()) {
        closeServerDd();
        return;
      }
      if (h.clearPaperdoll && h.clearPaperdoll()) return;
      if (h.exitLayoutEdit && h.exitLayoutEdit()) return;
      if (window.observing && window.__ecuClearObserve) {
        window.__ecuClearObserve();
      }
      return;
    }

    // Esc still works while typing; letter/chat shortcuts do not.
    if (isEditableKeyboardTarget(ev.target)) return;

    if (shortcut === "toggle_layout_edit") {
      if (!h.toggleLayoutEdit) return;
      ev.preventDefault();
      h.toggleLayoutEdit();
      return;
    }

    if (shortcut === "toggle_inventory") {
      ev.preventDefault();
      if (!getObservingId()) {
        notifyObserveRequired();
        return;
      }
      openInventory();
      return;
    }

    if (shortcut === "toggle_character") {
      if (!h.toggleObservedPaperdoll) return;
      ev.preventDefault();
      if (!h.toggleObservedPaperdoll()) {
        notifyObserveRequired();
      }
      return;
    }

    if (shortcut === "focus_chat") {
      ev.preventDefault();
      openChat({});
      return;
    }

    if (shortcut === "toggle_mail") {
      ev.preventDefault();
      openMail({ toggle: true });
    }
  });
}

export function updateCommKeyboardHandlers(
  handlers: CommKeyboardHandlers,
): void {
  (window as any).__ecuCommKeyHandlers = handlers;
}
