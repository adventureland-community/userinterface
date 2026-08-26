import { getReact, getReactDOM, e } from "./host/react";
import { snapshotUiKey, startTick, type GameSnapshot } from "./tick";
import { startSocketHub } from "./sockets/hub";
import { startInstanceTracker } from "./instance/tracker";
import { startMeterEngine, updateMeterContext } from "./meters/meterEngine";
import { isMeterInCombat } from "./meters/meterSession";
import { startSessionKills, updateKillContext } from "./kpi/sessionKills";
import { installCommanderHook } from "./host/commander";
import { installUpdateNotesHooks } from "./host/updateNotes";
import { installCommChrome } from "./host/commChrome";
import { ensureDialogHost } from "./host/dialogHost";
import { installInventoryFix } from "./host/inventory";
import { installPageTitle } from "./host/pageTitle";
import { installDisconnectOverlay } from "./host/disconnectOverlay";
import { installMailUnreadWatch, subscribeMailToast } from "./host/mail";
import { ensureMailCss } from "./ui/frames/mail/mailCss";
import { publishEcuBuildInfo } from "./buildMeta";
import { CommUI } from "./ui/frames/CommUI";
import { startWorldOverlay } from "./viz/startWorldOverlay";

publishEcuBuildInfo();

function showMailToast(message: string): void {
  let el = document.querySelector(".ecu-mail-toast") as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.className = "ecu-mail-toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("is-on");
  window.setTimeout(() => {
    el && el.classList.remove("is-on");
  }, 3200);
}

const POPUP_CSS = `
/* Popup container */
.popup {
  position: relative;
  display: inline;
  cursor: pointer;
}

/* The actual popup (appears on top) */
.popup .popuptext {
  visibility: hidden;
  width: 160px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 8px 0;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  margin-left: -80px;
}

/* Popup arrow */
.popup .popuptext::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #555 transparent transparent transparent;
}

/* Toggle this class when clicking on the popup container (hide and show the popup) */
.popup .show {
  visibility: visible;
  -webkit-animation: fadeIn 1s;
  animation: fadeIn 1s
}

/* Add animation (fade in the popup) */
@-webkit-keyframes fadeIn {
  from {opacity: 0;}
  to {opacity: 1;}
}

@keyframes fadeIn {
  from {opacity: 0;}
  to {opacity:1 ;}
}
`;

const PROGRESS_CSS = `
progress.comm-ui-hp-bar {
  border-radius: 0;
  height: 1em;
}
progress.comm-ui-hp-bar::-webkit-progress-bar {
  background-color: gray;
}
progress.comm-ui-hp-bar::-webkit-progress-value {
  background-color: red;
}
progress.comm-ui-mp-bar {
  border-radius: 0;
  height: 1em;
}
progress.comm-ui-mp-bar::-webkit-progress-bar {
  background-color: gray;
}
progress.comm-ui-mp-bar::-webkit-progress-value {
  background-color: blue;
}

/* Defeat Adventure Land global pixel-font thickening inside our overlay.
 * Form controls must inherit — UA styles otherwise swap in a system font. */
#comm-ui, #comm-ui * {
  text-shadow: none !important;
  font-weight: normal !important;
}
#comm-ui button,
#comm-ui input,
#comm-ui select,
#comm-ui textarea {
  font-family: inherit;
}

/* HP threshold marks on boss/unit frames */
.comm-hp-threshold {
  pointer-events: none;
}
`;

function injectCss(id: string, css: string): void {
  if (document.querySelector(`#${id}`)) return;
  const style = document.createElement("style");
  style.id = id;
  style.innerText = css;
  (document.head || document.documentElement).append(style);
}

/** Userscript / early head inject can finish React before <body> exists. */
function whenBodyReady(fn: () => void): void {
  if (document.body) {
    fn();
    return;
  }
  let done = false;
  const finish = () => {
    if (done || !document.body) return;
    done = true;
    window.clearInterval(poll);
    document.removeEventListener("DOMContentLoaded", finish);
    fn();
  };
  document.addEventListener("DOMContentLoaded", finish);
  const poll = window.setInterval(finish, 16);
  window.setTimeout(() => {
    window.clearInterval(poll);
    document.removeEventListener("DOMContentLoaded", finish);
  }, 15000);
}

function ensureReact(onReady: () => void): void {
  const go = () => whenBodyReady(onReady);
  if (window.React && window.ReactDOM) {
    go();
    return;
  }

  if (!document.querySelector("#react")) {
    const reactScript = document.createElement("script");
    reactScript.id = "react";
    reactScript.src = "https://unpkg.com/react@18/umd/react.development.js";
    reactScript.crossOrigin = "";
    (document.head || document.documentElement).append(reactScript);
  }

  const existingDom = document.querySelector(
    "#react-dom",
  ) as HTMLScriptElement | null;
  if (!existingDom) {
    const reactDomScript = document.createElement("script");
    reactDomScript.id = "react-dom";
    reactDomScript.src =
      "https://unpkg.com/react-dom@18/umd/react-dom.development.js";
    reactDomScript.crossOrigin = "";
    reactDomScript.addEventListener("load", go);
    (document.head || document.documentElement).append(reactDomScript);
  } else {
    existingDom.addEventListener("load", go);
  }
}

function Root(): any {
  const React = getReact();
  const [snap, setSnap] = React.useState(null as GameSnapshot | null);

  React.useEffect(() => {
    let lastKey = "";
    const stopTick = startTick((s) => {
      updateMeterContext(s.entities);
      updateKillContext(s.entities);
      const key = `${snapshotUiKey(s)}|${isMeterInCombat() ? 1 : 0}`;
      if (key === lastKey) return;
      lastKey = key;
      setSnap(s);
    });
    return () => stopTick();
  }, []);

  if (!snap) return null;
  return e(CommUI, { snap });
}

function onLoad(): void {
  injectCss("comm-copy-popup-css", POPUP_CSS);
  injectCss("comm-ui-css", PROGRESS_CSS);

  // Stock /comm chrome + inventory — prefer in-game / observe-hud patterns.
  ensureDialogHost();
  installCommChrome();
  installInventoryFix();
  installDisconnectOverlay();
  installPageTitle();
  installCommanderHook();
  installUpdateNotesHooks();
  ensureMailCss();
  installMailUnreadWatch();
  subscribeMailToast((message) => showMailToast(message));
  startSocketHub();
  startInstanceTracker();
  startMeterEngine();
  startSessionKills();
  startWorldOverlay();

  let domContainer = document.querySelector("#comm-ui") as HTMLElement | null;
  if (!domContainer) {
    domContainer = document.createElement("div");
    domContainer.id = "comm-ui";
    document.body.append(domContainer);
  }
  // HACK(comm-ui): above /comm #bottom (z-index 201) so panels receive clicks;
  // empty overlay stays pointer-events:none so map + #bottom buttons still work.
  domContainer.style.zIndex = "220";
  domContainer.style.position = "fixed";
  domContainer.style.width = "100%";
  domContainer.style.height = "100%";
  domContainer.style.pointerEvents = "none";

  const ReactDOM = getReactDOM();
  const root = ReactDOM.createRoot(domContainer);
  root.render(e(Root));
}

(function bootstrap() {
  "use strict";
  ensureReact(onLoad);
})();
