/**
 * /comm disconnect banner — stock DISCONNECTED lives in #bottom as a
 * .gamebutton and is easy to miss under meters. This overlay sits above
 * every HUD layer (same idea as the in-game centered DISCONNECTED).
 */

import { subscribeTick } from "../tick";

export const DISCONNECT_OVERLAY_CLASS = "ecu-disconnect-overlay";
export const DISCONNECT_OVERLAY_Z = 2147483647;

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

/** Grace period before showing the overlay (ms). Avoids flashing on observer switch. */
const DISCONNECT_GRACE_MS = 2000;
let disconnectedSince: number | null = null;

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

function reloadComm(): void {
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
    overlayEl.addEventListener("click", () => reloadComm());
    const card = document.createElement("div");
    card.className = `${DISCONNECT_OVERLAY_CLASS}-card`;
    const title = document.createElement("div");
    title.className = `${DISCONNECT_OVERLAY_CLASS}-title`;
    const reasonEl = document.createElement("div");
    reasonEl.className = `${DISCONNECT_OVERLAY_CLASS}-reason`;
    const hint = document.createElement("div");
    hint.className = `${DISCONNECT_OVERLAY_CLASS}-hint`;
    hint.textContent = "Click anywhere to reload";
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

function syncOverlay(): void {
  if (isCommDisconnected()) {
    const now = Date.now();
    if (disconnectedSince === null) disconnectedSince = now;
    if (now - disconnectedSince >= DISCONNECT_GRACE_MS) {
      showDisconnectOverlay(currentReason());
    }
  } else {
    disconnectedSince = null;
    hideDisconnectOverlay();
  }
}

function wrapDisconnect(): void {
  const prev = window.disconnect;
  if (prev === wrappedDisconnect) return;
  origDisconnect = typeof prev === "function" ? prev : undefined;
  window.disconnect = wrappedDisconnect;
}

function wrappedDisconnect(): void {
  everConnected = true;
  try {
    if (typeof origDisconnect === "function") origDisconnect();
  } finally {
    const reason = currentReason();
    if (reason) {
      // Explicit server kick — show immediately, no grace period
      disconnectedSince = null;
      showDisconnectOverlay(reason);
    } else {
      // Possibly transient (observer switch); let syncOverlay handle the delay
      if (disconnectedSince === null) disconnectedSince = Date.now();
    }
  }
}

/** Watch socket loss and wrap stock `disconnect()`. */
export function installDisconnectOverlay(): void {
  if (installed) return;
  installed = true;
  if (liveSocket(typeof window !== "undefined" ? window.socket : undefined)) {
    everConnected = true;
  }
  ensureCss();
  wrapDisconnect();
  syncOverlay();
  unsubTick = subscribeTick(() => {
    wrapDisconnect();
    syncOverlay();
  });
}

/** Test helper. */
export function resetDisconnectOverlayForTests(): void {
  if (unsubTick) {
    unsubTick();
    unsubTick = null;
  }
  hideDisconnectOverlay();
  if (typeof window !== "undefined" && origDisconnect) {
    window.disconnect = origDisconnect;
  }
  origDisconnect = undefined;
  installed = false;
  everConnected = false;
  disconnectedSince = null;
}
