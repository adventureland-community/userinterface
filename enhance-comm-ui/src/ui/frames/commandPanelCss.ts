/**
 * Injected once for the Command panel editor host + snippets side tree.
 */

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
`;

let injected = false;

export function ensureCommandPanelCss(): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("ecu-command-panel-css");
  if (existing) {
    existing.textContent = COMMAND_PANEL_CSS;
    injected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = "ecu-command-panel-css";
  el.textContent = COMMAND_PANEL_CSS;
  document.head.appendChild(el);
  injected = true;
}
