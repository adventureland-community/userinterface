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
import { getSettings, saveSettings } from "../lib/settings";
import { openItem } from "./infoDialog/api";

const HOST_ID = "bottomleftcorner";
const STYLE_ID = "comm-ui-inventory-host-css";
const MOUNT_ID = "comm-bag-mount";
const SAVED_CHAR = "__ecuInvSavedChar";
const HOLD_CHAR = "__ecuInvHoldChar";
/** Persisted on observe welcome snapshot for backfill when the listener binds late. */
const BAG_SYNC_STAMP_KEY = "__ecuBagSyncedAt";

type InventoryListener = (open: boolean) => void;
type BagSyncListener = () => void;

const listeners: InventoryListener[] = [];
const syncListeners: BagSyncListener[] = [];

/**
 * Wall-clock ms when observe welcome last delivered an inventory snapshot.
 * Opening the bag must not bump this — stock AL only refreshes items on welcome.
 */
let bagSyncedAt: number | null = null;
/** True while Refresh is reconnecting the observer for a fresh welcome. */
let bagRefreshing = false;
/** Observed name we expect after Refresh reconnect. */
let refreshPendingName: string | null = null;
let refreshPollTimer: number | null = null;
/** Socket.id we last bound the welcome listener to (tracks reconnects). */
let bagSyncSocketId: string | null = null;
let bagSyncWelcomePoll: number | null = null;
/**
 * Last refresh outcome for UI honesty:
 * - server: observe reconnect completed (fresh welcome items)
 * - local: re-drew current observing snapshot (no server round-trip)
 */
let bagRefreshKind: "server" | "local" | null = null;

declare global {
  interface Window {
    is_comm?: boolean;
    inventory?: boolean;
    character?: any;
    observing?: any;
    socket?: { id?: string; on?: (event: string, fn: (...args: any[]) => void) => void };
    render_inventory?: (reset?: any) => void;
    inventory_click?: (num: number, event?: any) => void;
    hide_modal?: (force?: any) => void;
    draw_trigger?: (fn: () => void) => void;
    stpr?: (event?: any) => void;
    __ecuInventoryPatched?: boolean;
    __ecuInvClickPatched?: boolean;
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

function notifyBagSync(): void {
  for (let i = 0; i < syncListeners.length; i++) {
    try {
      syncListeners[i]();
    } catch {
      // ignore listener errors
    }
  }
}

function setBagSyncedAt(ts: number | null): void {
  bagSyncedAt = ts;
  notifyBagSync();
}

function setBagRefreshing(next: boolean): void {
  if (bagRefreshing === next) return;
  bagRefreshing = next;
  notifyBagSync();
}

function clearRefreshPoll(): void {
  if (refreshPollTimer != null) {
    window.clearInterval(refreshPollTimer);
    refreshPollTimer = null;
  }
}

/**
 * Stamp / clear bagSyncedAt from stock `welcome` (userscript only — no game edits).
 * `data.character` is the observe snapshot that becomes `window.observing`.
 */
function onObserveWelcome(data: any): void {
  if (data && data.character) {
    const ts = Date.now();
    data.character[BAG_SYNC_STAMP_KEY] = ts;
    setBagSyncedAt(ts);
    return;
  }
  // Spectator reconnect / clearObserve — inventory snapshot is gone.
  if (bagSyncedAt != null) setBagSyncedAt(null);
}

/** Recover bagSyncedAt from an existing observe snapshot (welcome fired before bind). */
function backfillBagSyncedAt(): void {
  if (bagSyncedAt != null) return;
  const obs = window.observing;
  if (!obs || !Array.isArray(obs.items)) return;
  const stamped = obs[BAG_SYNC_STAMP_KEY];
  if (typeof stamped === "number" && stamped > 0) {
    setBagSyncedAt(stamped);
  }
}

function maybeBindBagSyncWelcome(): void {
  const socket = window.socket;
  if (!socket || !socket.id || typeof socket.on !== "function") return;
  if (socket.id !== bagSyncSocketId) {
    bagSyncSocketId = socket.id;
    socket.on("welcome", onObserveWelcome);
  }
  backfillBagSyncedAt();
}

/** Re-bind welcome after init_socket reconnects (same pattern as sockets/hub). */
export function installBagSyncWelcomeWatch(): void {
  maybeBindBagSyncWelcome();
  if (bagSyncWelcomePoll != null) return;
  bagSyncWelcomePoll = window.setInterval(maybeBindBagSyncWelcome, 500);
}

/** Subscribe to bag open/close (inventory flag). Returns unsubscribe. */

export function subscribeInventory(listener: InventoryListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/** Subscribe to bagSyncedAt / refreshing / refresh-kind changes. */

export function subscribeBagSync(listener: BagSyncListener): () => void {
  syncListeners.push(listener);
  return () => {
    const idx = syncListeners.indexOf(listener);
    if (idx >= 0) syncListeners.splice(idx, 1);
  };
}

export function isInventoryOpen(): boolean {
  return !!window.inventory;
}

export function getBagSyncedAt(): number | null {
  return bagSyncedAt;
}

export function isBagRefreshing(): boolean {
  return bagRefreshing;
}

export function getBagRefreshKind(): "server" | "local" | null {
  return bagRefreshKind;
}

/** True when observe welcome has delivered an items array (snapshot present). */
export function hasObservingInventorySnapshot(): boolean {
  const obs = window.observing;
  return !!(obs && Array.isArray(obs.items));
}

function stampBagSyncedFromObserving(obs: any): void {
  if (!obs) return;
  const stamped = obs[BAG_SYNC_STAMP_KEY];
  if (typeof stamped === "number" && stamped > 0) {
    setBagSyncedAt(stamped);
    return;
  }
  setBagSyncedAt(Date.now());
  obs[BAG_SYNC_STAMP_KEY] = bagSyncedAt;
}

function findObserveSecret(name: string): string | null {
  const chars =
    ((window as any).X && (window as any).X.characters) || [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch && ch.name === name && ch.secret) return String(ch.secret);
  }
  return null;
}

/** Close bag DOM without leaving window.character set. */
function closeInventoryHost(): void {
  const host = document.getElementById(HOST_ID);
  if (host) host.innerHTML = "";
  window.inventory = false;
  restoreCharacter();
  notifyInventory(false);
}

/**
 * Re-render open bag from the current observing snapshot (no server fetch).
 * Stock AL has no light inventory pull for observers — items arrive on welcome.
 */
function reRenderLocalSnapshot(): void {
  bagRefreshKind = "local";
  callThroughDraw(() => {
    if (typeof window.render_inventory !== "function") return;
    if (window.inventory) {
      // reset=true → update_inventory() while character is borrowed.
      window.render_inventory(true);
      // Do not bump bagSyncedAt — snapshot age is unchanged.
      notifyBagSync();
    } else {
      window.render_inventory();
    }
  });
}

/**
 * Best-effort refresh of observed inventory.
 * Prefer observe reconnect (`init_socket({secret})`) — the only stock path that
 * replaces `observing.items`. Falls back to local re-render when secret/socket
 * is unavailable.
 */
export function refreshObservedInventory(): void {
  const obs = window.observing;
  const name = obs && obs.name != null ? String(obs.name) : "";
  const secret = name ? findObserveSecret(name) : null;

  if (!name || !secret || typeof (window as any).init_socket !== "function") {
    reRenderLocalSnapshot();
    return;
  }

  clearRefreshPoll();
  bagRefreshKind = null;
  refreshPendingName = name;
  setBagRefreshing(true);

  if (window.inventory) closeInventoryHost();
  // After close: useBagBridge skips preferred-open while refreshing; stamp true here.
  saveSettings({ bagOpenPreferred: true });

  const initSocket = (window as any).init_socket as
    | ((args?: { secret?: string }) => void)
    | undefined;
  if (typeof initSocket !== "function") {
    setBagRefreshing(false);
    refreshPendingName = null;
    reRenderLocalSnapshot();
    return;
  }
  initSocket({ secret });

  let attempts = 0;
  refreshPollTimer = window.setInterval(() => {
    attempts += 1;
    const next = window.observing;
    if (next && next.name === refreshPendingName && next.items) {
      clearRefreshPoll();
      bagRefreshKind = "server";
      refreshPendingName = null;
      backfillBagSyncedAt();
      if (bagSyncedAt == null) stampBagSyncedFromObserving(next);
      // Re-open before clearing refreshing so the Bag panel stays mounted.
      openInventory();
      setBagRefreshing(false);
      return;
    }
    if (attempts > 40) {
      clearRefreshPoll();
      refreshPendingName = null;
      if (window.observing) {
        bagRefreshKind = "server";
        backfillBagSyncedAt();
        if (bagSyncedAt == null) stampBagSyncedFromObserving(window.observing);
        openInventory();
      } else {
        bagRefreshKind = "local";
      }
      setBagRefreshing(false);
    }
  }, 250);
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
 * Stock `inventory_click` early-returns on /comm (`if (is_comm && event) return stpr`).
 * Bridge clicks to CommUI item info from `observing.items` (character stays null).
 */
function installInventoryClickBridge(): void {
  if (window.__ecuInvClickPatched) return;

  const tryPatch = () => {
    const original = window.inventory_click;
    if (typeof original !== "function") return false;
    if (window.__ecuInvClickPatched) return true;
    window.__ecuInvClickPatched = true;

    window.inventory_click = function patchedInventoryClick(
      num: number,
      event?: any,
    ) {
      if (window.is_comm) {
        if (event && typeof window.stpr === "function") window.stpr(event);
        const obs = window.observing;
        const item =
          obs && Array.isArray(obs.items) ? obs.items[num] : null;
        if (!item || !item.name || item.name === "placeholder") return;
        openItem(obs, `inv${num}`, item);
        return;
      }
      return original.call(this, num, event);
    };
    return true;
  };

  if (tryPatch()) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (tryPatch() || attempts > 40) window.clearInterval(timer);
  }, 250);
}

/**
 * Monkey-patch render_inventory so /comm uses the real bottom-left grid
 * instead of show_modal.
 *
 * character is borrowed only during the synchronous original() call, then
 * always restored — even while inventory stays open.
 */
export function installInventoryFix(): void {
  installInventoryClickBridge();
  installBagSyncWelcomeWatch();

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
          // Do not bump bagSyncedAt on open — backfill if welcome was missed.
          backfillBagSyncedAt();
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

if (typeof window !== "undefined") {
  installBagSyncWelcomeWatch();
}
