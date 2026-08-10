import { getReact, getReactDOM, e } from "./host/react";
import { startTick, type GameSnapshot } from "./tick";
import { startSocketHub } from "./sockets/hub";
import { startCryptTracker } from "./crypt/tracker";
import { startCombatMeter } from "./meters/combatMeter";
import { startSessionKills } from "./kpi/sessionKills";
import { CommUI } from "./ui/frames/CommUI";

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
`;

function injectCss(id: string, css: string): void {
  if (document.querySelector(`#${id}`)) return;
  const style = document.createElement("style");
  style.id = id;
  style.innerText = css;
  document.head.append(style);
}

function ensureReact(onReady: () => void): void {
  if (window.React && window.ReactDOM) {
    onReady();
    return;
  }

  if (!document.querySelector("#react")) {
    const reactScript = document.createElement("script");
    reactScript.id = "react";
    reactScript.src = "https://unpkg.com/react@18/umd/react.development.js";
    reactScript.crossOrigin = "";
    document.head.append(reactScript);
  }

  const existingDom = document.querySelector("#react-dom") as HTMLScriptElement | null;
  if (!existingDom) {
    const reactDomScript = document.createElement("script");
    reactDomScript.id = "react-dom";
    reactDomScript.src =
      "https://unpkg.com/react-dom@18/umd/react-dom.development.js";
    reactDomScript.crossOrigin = "";
    reactDomScript.addEventListener("load", onReady);
    document.head.append(reactDomScript);
  } else {
    existingDom.addEventListener("load", onReady);
  }
}

function Root(): any {
  const React = getReact();
  const [snap, setSnap] = React.useState(null as GameSnapshot | null);

  React.useEffect(() => {
    const stopTick = startTick((s) => setSnap(s));
    return () => stopTick();
  }, []);

  if (!snap) return null;
  return e(CommUI, { snap });
}

function onLoad(): void {
  injectCss("comm-copy-popup-css", POPUP_CSS);
  injectCss("comm-ui-css", PROGRESS_CSS);

  startSocketHub();
  startCryptTracker();
  startCombatMeter();
  startSessionKills();

  let domContainer = document.querySelector("#comm-ui") as HTMLElement | null;
  if (!domContainer) {
    domContainer = document.createElement("div");
    domContainer.id = "comm-ui";
    domContainer.style.zIndex = "10";
    domContainer.style.position = "fixed";
    domContainer.style.width = "100%";
    domContainer.style.height = "100%";
    document.body.append(domContainer);
  }

  const ReactDOM = getReactDOM();
  const root = ReactDOM.createRoot(domContainer);
  root.render(e(Root));

  const bottom = document.getElementById("bottom");
  // HACK(comm-ui): #bottom pointer-events none so meter toggles receive clicks
  if (bottom) {
    bottom.style.pointerEvents = "none";
  }
}

(function bootstrap() {
  "use strict";
  ensureReact(onLoad);
})();
