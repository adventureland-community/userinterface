/**
 * Injected once for the Command panel editor host + snippets side tree.
 */

import { phoneShellExpandCss } from "../chrome/phoneShell";

export const COMMAND_PANEL_CSS = `
.CommandPanel {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  /* Floor when the shell is still hugging / first paint before frame fill. */
  min-height: 420px;
  max-height: 100%;
  overflow: hidden;
}
.CommandPanel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  flex: 0 0 auto;
}
.CommandPanel-title {
  font-size: 20px;
  color: #ffe08a;
}
.CommandPanel-sub {
  font-size: 12px;
  color: #aaa;
  flex: 1 1 auto;
  min-width: 0;
}
.CommandPanel-headGrow {
  flex: 1 1 auto;
  min-width: 0;
}
.CommandPanel-expand {
  flex: 0 0 auto;
}
.CommandPanel-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  flex: 0 0 auto;
}
.CommandPanel-tabs {
  display: flex;
  gap: 4px;
  flex: 0 0 auto;
  padding: 2px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 10px;
}
.CommandPanel-tab {
  flex: 1 1 0;
  min-height: 40px;
  appearance: none;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #bbb;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
}
.CommandPanel-tab.is-active {
  background: #2a2410;
  color: #ffe08a;
}
.CommandPanel-tabCount {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  background: #111;
  border-radius: 999px;
  padding: 1px 7px;
}
.CommandPanel-tab.is-active .CommandPanel-tabCount {
  color: #c9a227;
  background: #1a1608;
}
.CommandPanel-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  gap: 10px;
  align-items: stretch;
}
.CommandPanel-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.CommandPanel-editor {
  position: relative;
  flex: 1 1 auto;
  min-height: 240px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  pointer-events: auto;
}
.CommandPanel-editor .CodeMirror {
  width: 100% !important;
  height: 100% !important;
  box-sizing: border-box;
  pointer-events: auto;
}
.CommandPanel-editor .CodeMirror-scroll {
  /* Keep vertical scroll inside the editor — never clip mid-line. */
  overflow-x: auto !important;
  overflow-y: scroll !important;
}
.CommandPanel-editor textarea {
  width: 100%;
  height: 100%;
  min-height: 240px;
  resize: none;
  box-sizing: border-box;
}
.CommandPanel-side {
  flex: 0 0 260px;
  width: 260px;
  max-width: 42%;
  min-width: 200px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-left: 1px solid #333;
  padding-left: 10px;
  box-sizing: border-box;
}
.CommandPanel-side__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 0 0 auto;
}
.CommandPanel-side__title {
  font-size: 14px;
  color: #ccc;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.CommandPanel-tree {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-right: 2px;
}
.CommandPanel-folder {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: 0;
  background: transparent;
  color: #a86;
  font: inherit;
  font-size: 15px;
  text-align: left;
  padding: 5px 4px;
  cursor: pointer;
}
.CommandPanel-folder:hover {
  background: rgba(40, 36, 20, 0.55);
}
.CommandPanel-folder__twist {
  flex: 0 0 14px;
  color: #888;
  font-size: 12px;
}
.CommandPanel-snip {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  background: transparent;
  padding: 4px 2px 4px 4px;
}
.CommandPanel-snip.is-on {
  border-color: #a86;
  background: rgba(60, 50, 20, 0.55);
}
.CommandPanel-snip.is-hi:not(.is-on) {
  background: rgba(40, 40, 40, 0.65);
}
.CommandPanel-snip.is-last .CommandPanel-snip__pick {
  color: #cfc;
}
.CommandPanel-snip__pin {
  flex: 0 0 auto;
  appearance: none;
  border: 0;
  background: transparent;
  color: #777;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  padding: 2px 3px;
  cursor: pointer;
}
.CommandPanel-snip__pin:hover {
  color: #ffe08a;
}
.CommandPanel-snip.is-on .CommandPanel-snip__pin,
.CommandPanel-snip__pin[title="Unpin"] {
  color: #ffe08a;
}
.CommandPanel-snip__pick {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
  padding: 3px 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.CommandPanel-snip__pick:hover {
  color: #ffe08a;
}
.CommandPanel-snip__last {
  color: #8a8;
  font-size: 12px;
  margin-left: 4px;
}
.CommandPanel-snip__run,
.CommandPanel-snip__del {
  flex: 0 0 auto;
  appearance: none;
  border: 1px solid #555;
  background: #1a1a1a;
  color: #ccc;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  padding: 4px 7px;
  cursor: pointer;
}
.CommandPanel-snip__run {
  border-color: #a86;
  background: #2a2410;
  color: #ffe08a;
}
.CommandPanel-snip__del {
  border-color: #844;
  background: #2a1515;
  color: #eaa;
}
.CommandPanel-snip__del.is-confirm {
  border-color: #c66;
  background: #4a2020;
  color: #fcc;
  font-weight: 600;
}
.CommandPanel-dirty {
  color: #c9a;
  font-size: 14px;
  font-weight: normal;
  letter-spacing: 0;
  text-transform: none;
}
.CommandPanel-rerun {
  appearance: none;
  border: 1px solid #555;
  background: #1a1a1a;
  color: #ccc;
  font: inherit;
  font-size: 12px;
  padding: 2px 7px;
  cursor: pointer;
}
.CommandPanel-rerun:hover {
  border-color: #a86;
  color: #ffe08a;
}
.CommandPanel-side:focus {
  outline: 1px solid #555;
  outline-offset: 2px;
}
.CommandPanel-empty {
  color: #777;
  font-size: 14px;
  padding: 8px 4px;
  line-height: 1.35;
}
.CommandPanel-side input[type="search"] {
  font-size: 15px !important;
}
.CommandPanel-hints {
  position: fixed;
  z-index: 100000;
  min-width: 220px;
  max-width: 360px;
  max-height: 240px;
  overflow: auto;
  box-sizing: border-box;
  border: 1px solid #666;
  background: rgba(12, 12, 12, 0.96);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
  padding: 3px;
  pointer-events: auto;
}
.CommandPanel-hint {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  appearance: none;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-size: 14px;
  text-align: left;
  padding: 5px 8px;
  cursor: pointer;
}
.CommandPanel-hint.is-active,
.CommandPanel-hint:hover {
  background: rgba(60, 50, 20, 0.85);
  color: #ffe08a;
}
.CommandPanel-hint__label {
  flex: 0 1 auto;
  min-width: 4.5em;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.CommandPanel-hint__meta {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: right;
}
.CommandPanel-hint[data-kind="api"] .CommandPanel-hint__meta {
  color: #a86;
}
.CommandPanel-hint[data-kind="item"] .CommandPanel-hint__meta {
  color: #8ac;
}
.CommandPanel-hint[data-kind="monster"] .CommandPanel-hint__meta {
  color: #c88;
}
.CommandPanel-hint[data-kind="npc"] .CommandPanel-hint__meta {
  color: #8c8;
}
.CommandPanel-hint[data-kind="map"] .CommandPanel-hint__meta,
.CommandPanel-hint[data-kind="shortcut"] .CommandPanel-hint__meta {
  color: #ca8;
}
.CommandPanel-hint[data-kind="skill"] .CommandPanel-hint__meta {
  color: #c9a;
}
.CommandPanel-hint[data-kind="prop"] .CommandPanel-hint__meta {
  color: #9aa;
}

/* Phone / narrow — tabbed Code | Snippets (full height each). */
.CommandPanel.is-narrow {
  min-height: 0;
}
.CommandPanel.is-narrow .CommandPanel-body {
  flex-direction: column;
  gap: 8px;
}
.CommandPanel.is-narrow .CommandPanel-editor {
  min-height: 240px;
  flex: 1 1 auto;
}
.CommandPanel.is-phone {
  background: #0e0e10;
}
.CommandPanel.is-phone .CommandPanel-side,
.CommandPanel.is-phone .CommandPanel-main {
  background: #0e0e10;
}
.CommandPanel.is-phone .CommandPanel-editor {
  min-height: 200px;
  font-size: 16px;
  line-height: 1.5;
}
/* Code tab: editor fills leftover space; Run + Save template stay in the foot. */
.CommandPanel.is-phone.tab-code .CommandPanel-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: 8px;
  overflow: hidden;
}
.CommandPanel.is-phone.tab-code .CommandPanel-editor,
.CommandPanel.is-phone.tab-code .CodeMirror {
  flex: 1 1 auto;
  min-height: 120px;
  max-height: 100%;
  height: 100%;
}
.CommandPanel.is-phone.tab-code .CommandPanel-toolbar,
.CommandPanel.is-phone.tab-code .CommandPanel-status {
  flex: 0 0 auto;
}
.CommandPanel.is-narrow .CommandPanel-side {
  flex: 1 1 auto;
  width: 100%;
  max-width: none;
  min-width: 0;
  min-height: 0;
  border-left: none;
  border-top: none;
  padding-left: 0;
  padding-top: 0;
}
.CommandPanel.is-narrow .CommandPanel-snip,
.CommandPanel.is-narrow .CommandPanel-folder {
  min-height: 48px;
  padding-top: 10px;
  padding-bottom: 10px;
}
.CommandPanel.is-narrow .CommandPanel-snip__pick {
  font-size: 16px;
  padding: 10px 8px;
}
.CommandPanel.is-narrow .CommandPanel-run,
.CommandPanel.is-narrow .CommandPanel-toolbar button {
  min-height: 44px;
  padding: 10px 14px;
  font-size: 15px;
}
.CommandPanel.is-narrow .CommandPanel-toolbar input {
  min-height: 44px;
  font-size: 16px;
  padding: 10px 12px;
}
/* Phone: Run owns a full row; name + Save as share the second. */
.CommandPanel.is-phone .CommandPanel-toolbar {
  flex-wrap: wrap;
  gap: 8px;
}
.CommandPanel.is-phone .CommandPanel-run {
  flex: 1 1 100%;
  width: 100%;
  min-height: 48px !important;
  padding: 12px 14px !important;
  font-size: 16px !important;
  font-weight: 600;
}
.CommandPanel.is-phone .CommandPanel-toolbar input {
  flex: 1 1 140px;
}
.CommandPanel.is-phone .CommandPanel-toolbar > button:not(.CommandPanel-run) {
  flex: 0 0 auto;
  min-height: 44px;
}
.CommandPanel.is-phone.tab-code .CommandPanel-toolbar {
  flex: 0 0 auto;
}
.CommandPanel.is-narrow .CommandPanel-rerun {
  min-height: 40px;
  padding: 8px 12px;
}
.CommandPanel.is-narrow .CommandPanel-side__head input[type="search"] {
  min-height: 44px;
  font-size: 16px;
  padding: 10px 12px;
}
.CommandPanel.is-expanded {
  min-height: 0;
}
.CommandPanel.is-phone-tabs .CommandPanel-sub {
  display: none;
}
/* Phone Quick tab — macro cards with thumb-sized Run. */
.CommandPanel.is-phone.tab-snippets .CommandPanel-side__head {
  gap: 8px;
}
.CommandPanel.is-phone.tab-snippets .CommandPanel-snip {
  min-height: 56px;
  padding: 12px 10px;
  gap: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #3a3a3a;
  margin-bottom: 8px;
}
.CommandPanel.is-phone.tab-snippets .CommandPanel-snip__pick {
  font-size: 17px;
  font-weight: 600;
  padding: 8px 6px;
}
.CommandPanel.is-phone.tab-snippets .CommandPanel-snip__run {
  min-height: 44px;
  min-width: 72px;
  padding: 10px 14px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
}
.CommandPanel.is-phone.tab-snippets .CommandPanel-snip__del {
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
}
.CommandPanel.is-phone .CommandPanel-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 8px;
}
.CommandPanel.is-phone .CommandPanel-empty__code {
  appearance: none;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid #a86;
  border-radius: 10px;
  background: #2a2410;
  color: #ffe08a;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.CommandPanel.is-phone {
  display: flex;
  flex-direction: column;
}
.CommandPanel.is-phone .CommandPanel-phoneFoot {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 8px 6px calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid #3a3a3a;
  background: rgba(12, 12, 12, 0.96);
}
.CommandPanel.is-phone .CommandPanel-phoneFoot .CommandPanel-toolbar {
  margin: 0;
  padding: 0;
  background: transparent;
}
.CommandPanel.is-phone .CommandPanel-tabs {
  gap: 6px;
  margin: 0;
  padding: 0;
  border-top: none;
  background: transparent;
}
.CommandPanel.is-phone .CommandPanel-phoneDone {
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
.CommandPanel.is-phone .CommandPanel-head {
  order: 1;
}
.CommandPanel.is-phone .CommandPanel-body {
  order: 20;
  flex: 1 1 auto;
  min-height: 0;
}
.CommandPanel.is-phone .CommandPanel-phoneFoot {
  order: 40;
}
.CommandPanel.is-phone .CommandPanel-tab {
  flex: 1 1 0;
  min-height: 48px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
  padding: 10px 14px;
}
` + phoneShellExpandCss("command", "ecu-command-shell-expanded", ".CommandPanel");

let injected = false;

export function ensureCommandPanelCss(): void {
  if (typeof document === "undefined") return;
  if (injected || document.getElementById("ecu-command-panel-css")) {
    injected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = "ecu-command-panel-css";
  el.textContent = COMMAND_PANEL_CSS;
  document.head.appendChild(el);
  injected = true;
}
