/**
 * /comm bottom chrome — stacked observe controls:
 *   [Follow|Bag|Command]  ← secondary action bar
 *   character chips | server▾  ← primary strip
 *
 * Does NOT restyle stock #observeui .gamebutton.block (those become
 * huge grey vertical bands). Stock observeui is hidden; we call the
 * same host APIs from our own buttons.
 *
 * Split modules live under ./commChrome/.
 */

import "./commChrome/types";
import { injectChromeCss } from "./commChrome/chromeCss";
import {
  clearObserve,
  currentServerKey,
  ensureChromeShell,
  isCharOnCurrentServer,
  syncActionsEnabled,
  toggleObserve,
} from "./commChrome/chromeActions";
import {
  invalidateCharacterCache,
  renderCharactersHud,
} from "./commChrome/characterChips";
import { syncServerPingHud } from "./commChrome/pingHud";
import {
  bindServerDdDoc,
  closeServerDd,
  renderServersHud,
  selectServer,
  toggleServerDd,
} from "./commChrome/serverDropdown";
import { eventsCacheFingerprint } from "./commChrome/serverEvents";
import { installCommKeyboardPolicy } from "./keyboardPolicy";
import { subscribeTick } from "../tick";

export { clearObserve, currentServerKey, isCharOnCurrentServer, toggleObserve };

function suppressObserveUi(): void {
  const el = document.getElementById("observeui");
  if (el && el.style.display !== "none") {
    el.style.display = "none";
    el.classList.add("hidden");
  }
}

function watchObserveUiHidden(): () => void {
  const bottom = document.getElementById("bottom") || document.body;
  const mo = new MutationObserver(() => suppressObserveUi());
  mo.observe(bottom, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"],
  });
  suppressObserveUi();
  return () => mo.disconnect();
}

/** Install HUD chrome for characters + servers strip. */
export function installCommChrome(): void {
  if (window.__ecuCommChromePatched) return;
  window.__ecuCommChromePatched = true;

  injectChromeCss();
  bindServerDdDoc();
  installCommKeyboardPolicy({});

  window.__ecuToggleObserve = toggleObserve;
  window.__ecuClearObserve = clearObserve;
  window.close_comm_server_dd = closeServerDd;
  window.toggle_comm_server_dd = toggleServerDd;
  window.select_comm_server = selectServer;

  // Persistent strip — no hide/show toggle of whole panes.
  window.hide_nav = function () {};
  window.toggle_ui = function () {
    const trigger = document.querySelector(
      ".ecu-server-dd-trigger",
    ) as HTMLElement | null;
    if (trigger) trigger.click();
  };

  window.render_characters = renderCharactersHud;
  window.render_servers = renderServersHud;

  const boot = () => {
    ensureChromeShell();
    renderCharactersHud();
    renderServersHud();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  const stopObserveWatch = watchObserveUiHidden();

  let lastObs = "";
  let lastServer = "";
  let lastPingAt = 0;
  let lastEventsFp = "";
  const unsubTick = subscribeTick((snap) => {
    const name =
      (snap.observing && snap.observing.name) ||
      (window.observing && window.observing.name) ||
      "";
    const server =
      (snap.serverRegion || "") + " " + (snap.serverIdentifier || "");
    if (name !== lastObs || server !== lastServer) {
      lastObs = name;
      lastServer = server;
      invalidateCharacterCache();
      renderCharactersHud();
    } else {
      syncActionsEnabled();
    }
    // Match prior ~1s ping refresh cadence (deduped inside syncServerPingHud).
    if (snap.now - lastPingAt >= 1000) {
      lastPingAt = snap.now;
      syncServerPingHud();
      const evFp = eventsCacheFingerprint();
      if (evFp !== lastEventsFp) {
        lastEventsFp = evFp;
        renderServersHud();
      }
    }
  });

  window.addEventListener("unload", () => {
    stopObserveWatch();
    unsubTick();
  });
}
