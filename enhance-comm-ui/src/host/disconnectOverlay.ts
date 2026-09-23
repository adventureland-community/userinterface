/**
 * /comm disconnect banner — stock DISCONNECTED lives in #bottom as a
 * .gamebutton and is easy to miss under meters. This overlay sits above
 * every HUD layer (same idea as the in-game centered DISCONNECTED).
 *
 * Character / server switches destroy the socket via init_socket; Asia-slow
 * handshakes can take many seconds. We suppress the banner while that
 * intentional reconnect is in flight, clear it as soon as the socket is
 * live again, and prefer socket reconnect over a full page reload on click.
 */

import { subscribeTick } from "../tick";

export const DISCONNECT_OVERLAY_CLASS = "ecu-disconnect-overlay";
export const DISCONNECT_OVERLAY_Z = 2147483647;

/** Grace before showing overlay on unexpected (reason-less) drops. */
export const DISCONNECT_GRACE_MS = 10_000;

/**
 * Max time an intentional init_socket reconnect may suppress the overlay
 * (Asia ~1.3s RTT + spikes). After this, treat as a real disconnect.
 */
export const RECONNECT_HARD_TIMEOUT_MS = 25_000;

const STYLE_ID = "ecu-disconnect-overlay-css";

const CSS = `
/* Hide stock disconnect button entirely — ECU overlay handles display after a grace period. */
#bottom > .gamebutton.disconnected {
  display: none !important;
}
.${DISCONNECT_OVERLAY_CLASS} {
  position: fixed;
  inset: 0;
  z-index: ${DISCONNECT_OVERLAY_Z};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 0, 0, 0.88);
  pointer-events: auto;
  cursor: pointer;
}
.${DISCONNECT_OVERLAY_CLASS}-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: min(92vw, 560px);
  padding: 22px 36px 20px;
  background: #140404;
  border: 4px solid #ff2e46;
  color: #ff2e46;
  font-family: Pixel, "Segoe UI", Tahoma, Arial, sans-serif;
  text-align: center;
  box-shadow: 0 0 0 1px #4a0008, 0 18px 48px rgba(0, 0, 0, 0.65);
  animation: ecu-disconnect-pulse 1.15s ease-in-out infinite;
}
.${DISCONNECT_OVERLAY_CLASS}-title {
  font-size: clamp(32px, 7vw, 56px);
  line-height: 1.05;
  letter-spacing: 0.08em;
  font-weight: 700;
}
.${DISCONNECT_OVERLAY_CLASS}-reason {
  font-size: clamp(16px, 2.6vw, 22px);
  line-height: 1.35;
  color: #f3d0d4;
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: pre-wrap;
}
.${DISCONNECT_OVERLAY_CLASS}-reason.is-empty {
  display: none;
}
.${DISCONNECT_OVERLAY_CLASS}-hint {
  font-size: clamp(16px, 2.4vw, 22px);
  color: #c9b4b6;
  letter-spacing: 0.04em;
}
body > .comm-disconnect-overlay {
  z-index: ${DISCONNECT_OVERLAY_Z} !important;
  background: rgba(8, 0, 0, 0.88) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 12px !important;
  pointer-events: auto !important;
}
body > .comm-disconnect-overlay .comm-disconnect-reason {
  max-width: min(92vw, 520px);
  font-size: clamp(16px, 2.6vw, 22px);
  line-height: 1.35;
  color: #f3d0d4;
}
@keyframes ecu-disconnect-pulse {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.03); filter: brightness(1.18); }
}
`;

let installed = false;
let everConnected = false;
let overlayEl: HTMLElement | null = null;
let unsubTick: (() => void) | null = null;
let origDisconnect: (() => void) | undefined;
let origInitSocket: ((args?: { secret?: string }) => void) | undefined;

let disconnectedSince: number | null = null;
let reconnectInFlight = false;
let reconnectStartedAt: number | null = null;
/** Last observe secret seen (init_socket args or roster while observing). */
let lastObserveSecret: string | null = null;

function canUseDom(): boolean {
  return typeof document !== "undefined" && !!document.body;
}

function ensureCss(): void {
  if (!canUseDom()) return;
  const existing = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = CSS;
    return;
  }
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

function liveSocket(
  socket: { id?: string; connected?: boolean } | null | undefined,
): boolean {
  if (!socket) return false;
  if (socket.connected === false) return false;
  return true;
}

function removeStockDisconnectOverlay(): void {
  if (!canUseDom()) return;
  const nodes = document.querySelectorAll(".comm-disconnect-overlay");
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].remove();
  }
}

/** Hide ECU + stock disconnect UI and reset timers. */
export function clearDisconnectUi(opts?: { clearReason?: boolean }): void {
  hideDisconnectOverlay();
  removeStockDisconnectOverlay();
  disconnectedSince = null;
  reconnectInFlight = false;
  reconnectStartedAt = null;
  if (opts?.clearReason === false) return;
  if (typeof window !== "undefined" && "disconnect_reason" in window) {
    delete window.disconnect_reason;
  }
}

function beginReconnectInFlight(now = Date.now()): void {
  hideDisconnectOverlay();
  removeStockDisconnectOverlay();
  disconnectedSince = null;
  if (typeof window !== "undefined" && "disconnect_reason" in window) {
    delete window.disconnect_reason;
  }
  reconnectInFlight = true;
  reconnectStartedAt = now;
}

/** True while an intentional init_socket reconnect should suppress the banner. */
export function isReconnectInFlight(now = Date.now()): boolean {
  if (!reconnectInFlight || reconnectStartedAt == null) return false;
  if (now - reconnectStartedAt >= RECONNECT_HARD_TIMEOUT_MS) return false;
  return true;
}

function rememberObserveSecretFromRoster(): void {
  if (typeof window === "undefined") return;
  const obs = window.observing;
  const name = obs && obs.name != null ? String(obs.name) : "";
  if (!name) return;
  const chars = (window.X && window.X.characters) || [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch && ch.name === name && ch.secret) {
      lastObserveSecret = String(ch.secret);
      return;
    }
  }
}

/** True after a socket was seen and then dropped (not first-load empty). */
export function isCommDisconnected(): boolean {
  const sock = typeof window !== "undefined" ? window.socket : undefined;
  if (liveSocket(sock)) {
    everConnected = true;
    return false;
  }
  if (everConnected) return true;
  if (typeof document === "undefined") return false;
  if (document.querySelector(".comm-disconnect-overlay")) return true;
  const stock = document.querySelector(".disconnected");
  return !!(stock && !stock.classList.contains("hidden"));
}

export function disconnectBannerLabel(reason?: string | null): string {
  return reason === "limits" ? "REJECTED" : "DISCONNECTED";
}

/** Human text for `window.disconnect_reason` — empty when the drop has no cause. */
export function disconnectBannerDetail(reason?: string | null): string {
  const raw = reason == null ? "" : String(reason).trim();
  if (!raw) return "";
  switch (raw) {
    case "limits":
      return "You can have 3 characters and one merchant online at most.";
    case "limitdc":
      return "Too many actions in a short time.";
    case "blocked":
      return "This account is blocked.";
    case "hardcore_downrank":
      return "Hardcore downrank.";
    default: {
      return raw;
    }
  }
}

function currentReason(): string | undefined {
  return typeof window !== "undefined" ? window.disconnect_reason : undefined;
}

/** Prefer socket reconnect; fall back to full page reload. */
export function reconnectComm(): void {
  if (typeof window === "undefined") return;
  const init = window.init_socket;
  if (typeof init === "function" && window.server_address) {
    if (lastObserveSecret) {
      init({ secret: lastObserveSecret });
    } else {
      init({});
    }
    return;
  }
  if (typeof window.refresh_page === "function") {
    window.refresh_page();
    return;
  }
  window.location.reload();
}

export function hideDisconnectOverlay(): void {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  if (canUseDom()) {
    document.body.classList.remove(`${DISCONNECT_OVERLAY_CLASS}-on`);
  }
}

export function showDisconnectOverlay(reason?: string | null): void {
  if (!canUseDom()) return;
  ensureCss();
  const label = disconnectBannerLabel(reason);
  const detail = disconnectBannerDetail(reason);
  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.className = DISCONNECT_OVERLAY_CLASS;
    overlayEl.setAttribute("role", "alertdialog");
    overlayEl.setAttribute("aria-live", "assertive");
    overlayEl.setAttribute("aria-modal", "true");
    overlayEl.addEventListener("click", () => reconnectComm());
    const card = document.createElement("div");
    card.className = `${DISCONNECT_OVERLAY_CLASS}-card`;
    const title = document.createElement("div");
    title.className = `${DISCONNECT_OVERLAY_CLASS}-title`;
    const reasonEl = document.createElement("div");
    reasonEl.className = `${DISCONNECT_OVERLAY_CLASS}-reason`;
    const hint = document.createElement("div");
    hint.className = `${DISCONNECT_OVERLAY_CLASS}-hint`;
    hint.textContent = "Click anywhere to reconnect";
    card.appendChild(title);
    card.appendChild(reasonEl);
    card.appendChild(hint);
    overlayEl.appendChild(card);
    document.body.appendChild(overlayEl);
  }
  const titleEl = overlayEl.querySelector(
    `.${DISCONNECT_OVERLAY_CLASS}-title`,
  ) as HTMLElement | null;
  if (titleEl) titleEl.textContent = label;
  const reasonEl = overlayEl.querySelector(
    `.${DISCONNECT_OVERLAY_CLASS}-reason`,
  ) as HTMLElement | null;
  if (reasonEl) {
    reasonEl.textContent = detail;
    reasonEl.classList.toggle("is-empty", !detail);
  }
  overlayEl.setAttribute("aria-label", detail ? `${label}. ${detail}` : label);
  document.body.classList.add(`${DISCONNECT_OVERLAY_CLASS}-on`);
}

function syncOverlay(now = Date.now()): void {
  const sock = typeof window !== "undefined" ? window.socket : undefined;
  if (liveSocket(sock)) {
    everConnected = true;
    rememberObserveSecretFromRoster();
    clearDisconnectUi();
    return;
  }

  if (
    reconnectInFlight &&
    reconnectStartedAt != null &&
    now - reconnectStartedAt >= RECONNECT_HARD_TIMEOUT_MS
  ) {
    reconnectInFlight = false;
    reconnectStartedAt = null;
  }

  if (isReconnectInFlight(now)) {
    hideDisconnectOverlay();
    removeStockDisconnectOverlay();
    return;
  }

  if (isCommDisconnected()) {
    if (disconnectedSince === null) disconnectedSince = now;
    if (now - disconnectedSince >= DISCONNECT_GRACE_MS) {
      showDisconnectOverlay(currentReason());
    }
  } else {
    clearDisconnectUi();
  }
}

function wrapDisconnect(): void {
  const prev = window.disconnect;
  if (prev === wrappedDisconnect) return;
  origDisconnect = typeof prev === "function" ? prev : undefined;
  window.disconnect = wrappedDisconnect;
}

function wrapInitSocket(): void {
  const prev = window.init_socket;
  if (prev === wrappedInitSocket) return;
  origInitSocket = typeof prev === "function" ? prev : undefined;
  window.init_socket = wrappedInitSocket;
}

function wrappedInitSocket(args?: { secret?: string }): void {
  if (args && args.secret) {
    lastObserveSecret = String(args.secret);
  }
  if (typeof window !== "undefined" && window.server_address) {
    beginReconnectInFlight();
  }
  if (typeof origInitSocket === "function") {
    origInitSocket(args);
  }
}

function wrappedDisconnect(): void {
  everConnected = true;
  try {
    if (typeof origDisconnect === "function") origDisconnect();
  } finally {
    const reason = currentReason();
    if (reason) {
      // Explicit server kick — show immediately, no grace / no reconnect suppress
      reconnectInFlight = false;
      reconnectStartedAt = null;
      disconnectedSince = null;
      showDisconnectOverlay(reason);
    } else if (reconnectInFlight) {
      // Intentional init_socket tear-down — strip stock flash, stay suppressed
      hideDisconnectOverlay();
      removeStockDisconnectOverlay();
    } else if (disconnectedSince === null) {
      disconnectedSince = Date.now();
    }
  }
}

/** Watch socket loss and wrap stock `disconnect` / `init_socket`. */
export function installDisconnectOverlay(): void {
  if (installed) return;
  installed = true;
  if (liveSocket(typeof window !== "undefined" ? window.socket : undefined)) {
    everConnected = true;
    rememberObserveSecretFromRoster();
  }
  ensureCss();
  wrapDisconnect();
  wrapInitSocket();
  syncOverlay();
  unsubTick = subscribeTick(() => {
    wrapDisconnect();
    wrapInitSocket();
    syncOverlay();
  });
}

/** Drive overlay sync from tests (optional `now` for timer control). */
export function syncDisconnectOverlayForTests(now = Date.now()): void {
  syncOverlay(now);
}

/** Test helper. */
export function resetDisconnectOverlayForTests(): void {
  if (unsubTick) {
    unsubTick();
    unsubTick = null;
  }
  hideDisconnectOverlay();
  removeStockDisconnectOverlay();
  if (typeof window !== "undefined") {
    if (origDisconnect) window.disconnect = origDisconnect;
    if (origInitSocket) window.init_socket = origInitSocket;
  }
  origDisconnect = undefined;
  origInitSocket = undefined;
  installed = false;
  everConnected = false;
  disconnectedSince = null;
  reconnectInFlight = false;
  reconnectStartedAt = null;
  lastObserveSecret = null;
}
