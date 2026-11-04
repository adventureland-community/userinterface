/**
 * Bag panel phone shell + touch chrome.
 */

import { phoneShellExpandCss } from "../chrome/phoneShell";

const STYLE_ID = "ecu-bag-panel-css";

const CSS = `
.comm-bag-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
  background: #0c0c0c;
}
.comm-bag-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 6px 8px 4px;
}
.comm-bag-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: #ffe08a;
}
.comm-bag-panel__headGrow {
  flex: 1 1 auto;
  min-width: 0;
}
.comm-bag-panel__empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
  text-align: center;
  color: #a8aeb6;
  font-size: 14px;
}
.comm-bag-panel__empty-btn {
  appearance: none;
  border: 1px solid #a86;
  background: #2a2410;
  color: #ffe08a;
  min-height: 44px;
  padding: 10px 16px;
  font: inherit;
  font-size: 15px;
  border-radius: 8px;
  cursor: pointer;
}
.comm-bag-panel.is-phone .comm-bag-sync-chrome {
  min-height: 48px;
  height: auto;
  padding: 8px 10px;
  gap: 10px;
  flex: 0 0 auto;
  width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box;
}
.comm-bag-panel.is-phone .comm-bag-sync-chrome button {
  min-height: 40px;
  padding: 8px 12px;
  font-size: 14px;
}
/* Phone expand: sync/actions sit as a foot so the sheet isn’t an empty void under the grid. */
.comm-bag-panel.is-phone.is-expanded .comm-bag-panel__head {
  order: 1;
}
.comm-bag-panel.is-phone.is-expanded .comm-bag-mount {
  order: 2;
}
.comm-bag-panel.is-phone.is-expanded .comm-bag-sync-chrome {
  order: 3;
  margin-top: auto;
  margin-bottom: 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
  border-top: 1px solid #333;
  background: #121212;
}
.comm-bag-panel.is-expanded {
  width: 100% !important;
  min-width: 0 !important;
  height: 100% !important;
}
.comm-bag-panel.is-expanded .comm-bag-mount {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 8px 4px 16px;
  background: #0a0a0a;
}
.comm-bag-panel.is-phone.is-expanded .comm-bag-mount #bottomleftcorner {
  /* zoom (not transform) grows layout box so the sheet isn’t left empty under the board. */
  min-width: 0;
  max-width: none;
  max-height: none;
  width: max-content;
  margin: 0 auto;
  flex: 0 0 auto;
  zoom: 1.45;
}
.comm-bag-panel.is-phone.is-expanded .comm-bag-mount {
  /* Pin the board to the sync foot — empty flex space stays under the title. */
  align-items: flex-end;
  justify-content: center;
  padding: 8px 4px 10px;
}
` + phoneShellExpandCss("bag", "ecu-bag-shell-expanded", ".comm-bag-panel");

let injected = false;

export function ensureBagPanelCss(): void {
  if (typeof document === "undefined") return;
  if (injected || document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
  injected = true;
}
