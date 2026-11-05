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
  align-items: stretch;
  justify-content: flex-start;
  gap: 12px;
  padding: 20px 16px 16px;
  text-align: left;
  color: #a8aeb6;
  font-size: 14px;
  min-height: 0;
}
.comm-bag-panel__empty-icon {
  align-self: center;
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: #2a2410;
  border: 1px solid #a86;
  color: #ffe08a;
  font-size: 34px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
.comm-bag-panel__empty-title {
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #e8eef4;
}
.comm-bag-panel__empty-copy {
  text-align: center;
  line-height: 1.45;
  color: #a8aeb6;
}
.comm-bag-panel__empty-steps {
  margin: 4px 0 0;
  padding: 14px 14px 14px 14px;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  background: #121212;
  color: #c8cdd4;
  font-size: 14px;
  line-height: 1.5;
  list-style: none;
  counter-reset: ecu-bag-step;
}
.comm-bag-panel__empty-steps li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  counter-increment: ecu-bag-step;
}
.comm-bag-panel__empty-steps li::before {
  content: counter(ecu-bag-step);
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #2a2410;
  border: 1px solid #a86;
  color: #ffe08a;
  font-size: 14px;
  font-weight: 700;
  line-height: 26px;
  text-align: center;
}
.comm-bag-panel__empty-steps li + li {
  margin-top: 10px;
}
.comm-bag-panel__empty-btn {
  appearance: none;
  border: 1px solid #a86;
  background: #2a2410;
  color: #ffe08a;
  min-height: 48px;
  padding: 12px 16px;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  margin-top: auto;
  width: 100%;
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
  min-height: 48px;
  min-width: 88px;
  padding: 10px 16px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
}
/* Phone expand: grid fills the sheet; actions live in the foot. */
.comm-bag-panel.is-phone {
  display: flex;
  flex-direction: column;
}
.comm-bag-panel.is-phone.is-expanded .comm-bag-panel__head {
  order: 1;
}
.comm-bag-panel.is-phone.is-expanded .comm-bag-sync-chrome {
  order: 2;
  margin-top: 0;
  margin-bottom: 0;
}
.comm-bag-panel.is-phone.is-expanded .comm-bag-mount {
  order: 3;
  flex: 1 1 auto;
  min-height: 0;
}
.comm-bag-panel.is-phone .comm-bag-panel__phoneFoot {
  order: 40;
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
  /* Pack the board under the title — avoid a black void above the grid. */
  align-items: flex-start;
  justify-content: center;
  padding: 8px 4px 10px;
}
.comm-bag-panel.is-phone .comm-bag-panel__phoneFoot {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid #3a3a3a;
  background: rgba(12, 12, 12, 0.96);
}
.comm-bag-panel.is-phone .comm-bag-panel__phoneActs {
  display: flex;
  gap: 8px;
}
.comm-bag-panel.is-phone .comm-bag-panel__phoneAct {
  appearance: none;
  flex: 1 1 0;
  min-height: 48px;
  border: 1px solid #555;
  border-radius: 12px;
  background: #1c1c1c;
  color: #eee;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.comm-bag-panel.is-phone .comm-bag-panel__phoneAct:disabled {
  opacity: 0.55;
  cursor: wait;
}
.comm-bag-panel.is-phone .comm-bag-panel__phoneDone {
  appearance: none;
  width: 100%;
  min-height: 48px;
  border: 1px solid #4a6a7a;
  border-radius: 12px;
  background: rgba(157, 212, 236, 0.14);
  color: #9dd4ec;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
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
