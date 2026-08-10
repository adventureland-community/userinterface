/**
 * /comm mounts inventory via show_modal (5 columns, odd margins, no #bottomleftcorner).
 * Prefer the in-game path: item grid into a layout-hosted #bottomleftcorner with 7 columns.
 *
 * CRITICAL: never leave window.character set while inventory stays open on /comm.
 * character=null is required for observer vision culling (draw_entities). Leaving
 * character=observing marks entities dead="vision", drops combat rows, and clears
 * the target frame until Bag closes and character is restored.
 */
import { mergeLayout, panelStyle, type PanelPos } from "../lib/layout";
import { getSettings } from "../lib/settings";

const HOST_ID = "bottomleftcorner";
const STYLE_ID = "comm-ui-inventory-host-css";
const MOUNT_ID = "comm-bag-mount";
const SAVED_CHAR = "__ecuInvSavedChar";
const HOLD_CHAR = "__ecuInvHoldChar";

type InventoryListener = (open: boolean) => void;

const listeners: InventoryListener[] = [];

declare global {
  interface Window {
    is_comm?: boolean;
    inventory?: boolean;
    character?: any;
    observing?: any;
    render_inventory?: (reset?: any) => void;
    hide_modal?: (force?: any) => void;
    draw_trigger?: (fn: () => void) => void;
    __ecuInventoryPatched?: boolean;
    __ecuInvSavedChar?: any;
    __ecuInvHoldChar?: boolean;
  }
}

function injectHostCss(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  // Positioning comes from PositionedPanel / applyBagLayoutPos.
  // Keep host as a content shell only (no fixed bottom-left).
  style.textContent = `
#${HOST_ID} {
  position: relative;
  left: auto;
  bottom: auto;
  z-index: auto;
  pointer-events: auto;
  max-width: min(96vw, 420px);
  max-height: min(70vh, calc(100vh - 72px));
  overflow: auto;
}
#${HOST_ID} .theinventory {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
.imodal .theinventory {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
#${MOUNT_ID} {
  pointer-events: auto;
}
`;
  document.head.append(style);
}

function notifyInventory(open: boolean): void {
  for (let i = 0; i < listeners.length; i++) {
    try {
      listeners[i](open);
    } catch {
      // ignore listener errors
    }
  }
}

/** Subscribe to bag open/close (inventory flag). Returns unsubscribe. */

export function subscribeInventory(listener: InventoryListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function isInventoryOpen(): boolean {
  return !!window.inventory;
}

/** Apply saved/default bag panel position onto a free-floating host (pre-mount). */

export function applyBagLayoutPos(pos?: PanelPos | null): void {
  const host = document.getElementById(HOST_ID) as HTMLElement | null;
  if (!host) return;
  // When hosted inside the React bag mount, PositionedPanel owns placement.
  if (host.parentElement && host.parentElement.id === MOUNT_ID) {
    host.style.position = "relative";
    host.style.left = "";
    host.style.top = "";
    host.style.transform = "";
    host.style.zIndex = "";
    return;
  }
  const layout = mergeLayout(getSettings().panelLayout);
  const p = pos || layout.bag;
  const style = panelStyle(p, false);
  host.style.position = "fixed";
  host.style.left = String(style.left);
  host.style.top = String(style.top);
  host.style.transform = String(style.transform);
  host.style.zIndex = "240";
  host.style.pointerEvents = "auto";
  host.style.maxWidth = "min(96vw, 420px)";
  host.style.maxHeight = "min(70vh, calc(100vh - 72px))";
  host.style.overflow = "auto";
}

/** Ensure the in-game inventory mount point exists on /comm. */

export function ensureInventoryHost(): HTMLElement {
  injectHostCss();
  let el = document.getElementById(HOST_ID) as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = HOST_ID;
    el.className = "bpclicks enableclicks";
    document.body.append(el);
  }
  applyBagLayoutPos();
  return el;
}

/**
 * Reparent #bottomleftcorner into the CommUI bag mount so PositionedPanel
 * controls placement. Safe to call repeatedly.
 */

export function attachInventoryToMount(mount: HTMLElement | null): void {
  if (!mount) return;
  mount.id = MOUNT_ID;
  const host = ensureInventoryHost();
  if (host.parentElement !== mount) {
    mount.append(host);
  }
  applyBagLayoutPos();
}

function callThroughDraw(fn: () => void): void {
  if (typeof window.draw_trigger === "function") {
    window.draw_trigger(fn);
  } else {
    fn();
  }
}

function restoreCharacter(): void {
  if (!window[HOLD_CHAR]) return;
  window.character = window[SAVED_CHAR];
  delete window[SAVED_CHAR];
  window[HOLD_CHAR] = false;
}

/**
 * Borrow observing as window.character ONLY for the synchronous render_inventory
 * call (non-comm branch reads window.character for items/gold).
 */

function prepareObservingCharacter(): boolean {
  const obs = window.observing;
  if (!window[HOLD_CHAR]) {
    window[SAVED_CHAR] = window.character;
    window[HOLD_CHAR] = true;
  }
  if (obs) {
    window.character = obs;
  }
  const ch = window.character;
  if (!ch) return false;
  if (!ch.items) ch.items = [];
  if (ch.isize == null) ch.isize = 42;
  if (!ch.q) ch.q = {};
  return true;
}

/** Open/toggle observed inventory using the patched host renderer. */
export function openInventory(): void {
  callThroughDraw(() => {
    if (typeof window.render_inventory === "function") {
      window.render_inventory();
    }
  });
}

/**
 * Restore bagOpenPreferred once the inventory patch is ready.
 * Owned here (not CommUI snap.now polling) so one bridge owns open state.
 */
function restorePreferredBagOpen(): void {
  const preferOpen = !!getSettings().bagOpenPreferred;
  if (!preferOpen) return;
  if (isInventoryOpen()) return;
  window.setTimeout(() => {
    if (isInventoryOpen()) return;
    if (typeof window.render_inventory === "function") {
      openInventory();
    }
  }, 600);
}

/**
 * Monkey-patch render_inventory so /comm uses the real bottom-left grid
 * instead of show_modal.
 *
 * character is borrowed only during the synchronous original() call, then
 * always restored — even while inventory stays open.
 */
export function installInventoryFix(): void {
  if (window.__ecuInventoryPatched) return;

  const tryPatch = () => {
    const original = window.render_inventory;
    if (typeof original !== "function") return false;
    if (window.__ecuInventoryPatched) return true;
    window.__ecuInventoryPatched = true;

    ensureInventoryHost();

    window.render_inventory = function patchedRenderInventory(reset?: any) {
      ensureInventoryHost();

      // Toggle close — match in-game behaviour; character must already be null.
      if (window.inventory && !reset) {
        const host = document.getElementById(HOST_ID);
        if (host) host.innerHTML = "";
        window.inventory = false;
        restoreCharacter();
        notifyInventory(false);
        return;
      }

      const savedComm = window.is_comm;
      if (!prepareObservingCharacter()) {
        restoreCharacter();
        return;
      }

      // Force non-comm branch: 7 columns, #bottomleftcorner, inventory=true.
      window.is_comm = false;

      let opened = false;
      try {
        if (typeof window.hide_modal === "function") {
          try {
            window.hide_modal();
          } catch {
            // ignore modal teardown races
          }
        }
        const result = original.call(this, reset);
        opened = !!window.inventory;
        return result;
      } finally {
        window.is_comm = savedComm;
        // ALWAYS restore — never leave character set across draw frames.
        restoreCharacter();
        if (opened) {
          applyBagLayoutPos();
          notifyInventory(true);
        } else if (!window.inventory) {
          notifyInventory(false);
        }
      }
    };

    restorePreferredBagOpen();
    return true;
  };

  if (tryPatch()) return;

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (tryPatch() || attempts > 40) {
      window.clearInterval(timer);
    }
  }, 250);
}
