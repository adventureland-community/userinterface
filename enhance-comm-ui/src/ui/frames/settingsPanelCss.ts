/** Searchable Settings hub — larger shell with readable typography. */

export const SETTINGS_PANEL_CSS = `
.ecu-settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483002;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  pointer-events: auto;
}
.ecu-settings-modal {
  width: min(980px, 96vw);
  height: min(760px, 92vh);
  display: flex;
  flex-direction: column;
  background: #14171a;
  border: 1px solid #5c636a;
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  color: #eef1f4;
  font-size: 20px;
  pointer-events: auto;
  overflow: hidden;
}
.ecu-settings-hd {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid #2e343a;
  flex-shrink: 0;
  font-size: 20px;
  background: #161a1e;
}
.ecu-settings-hd-copy {
  flex: 1 1 auto;
  min-width: 0;
}
.ecu-settings-search {
  width: min(460px, 100%);
  font-family: inherit;
  font-size: 19px;
  padding: 10px 14px;
  background: #101418;
  color: #eef1f4;
  border: 1px solid #3d4650;
  border-radius: 4px;
}
.ecu-settings-search::placeholder {
  color: #77818c;
}
.ecu-settings-search:focus {
  outline: none;
  border-color: #9a8451;
}
.ecu-settings-split {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}
.ecu-settings-nav {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #2e343a;
  padding: 14px 10px;
  background: rgba(0, 0, 0, 0.12);
}
.ecu-settings-nav-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  color: #ccc;
  font-size: 19px;
  padding: 11px 12px;
  margin-bottom: 6px;
}
.ecu-settings-nav-btn.is-dim {
  opacity: 0.45;
}
.ecu-settings-nav-btn[aria-pressed="true"] {
  border-color: #886;
  background: #2a2210;
  color: #ffe08a;
}
.ecu-settings-nav-count {
  color: #88919a;
  font-size: 16px;
}
.ecu-settings-pane {
  flex: 1 1 auto;
  min-width: 0;
  overflow: auto;
  padding: 18px 20px;
}
.ecu-settings-pane-title {
  color: #ffe08a;
  font-size: 26px;
  margin-bottom: 6px;
}
.ecu-settings-pane-desc {
  color: #9aa3ad;
  font-size: 18px;
  line-height: 1.45;
  margin: 0 0 16px;
}
.ecu-settings-sec {
  color: #ffe08a;
  margin: 16px 0 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 224, 138, 0.25);
  font-size: 21px;
}
.ecu-settings-sec:first-child {
  margin-top: 0;
}
.ecu-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 8px 0;
  font-size: 21px;
}
.ecu-settings-row select,
.ecu-settings-row input[type="number"],
.ecu-settings-row input[type="text"] {
  font-family: inherit;
  font-size: 19px;
  min-width: 120px;
  background: #1a1a1a;
  color: #eee;
  border: 1px solid #555;
  padding: 6px 10px;
}
.ecu-settings-row input[type="checkbox"] {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;
}
.ecu-settings-picks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 4px;
  max-height: 140px;
  overflow: auto;
}
.ecu-settings-pick {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
  background: #1a1a1a;
  border: 1px solid #444;
  padding: 6px 10px;
  cursor: pointer;
  color: #ddd;
}
.ecu-settings-pick input {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  cursor: pointer;
}
.ecu-settings-pick[data-on="1"] {
  border-color: #886;
  background: #2a2210;
  color: #ffe08a;
}
.ecu-settings-preview {
  margin-top: 14px;
  padding: 10px;
  border: 1px solid #333;
  background: rgba(0, 0, 0, 0.35);
  min-height: 220px;
  display: flex;
  gap: 16px;
  align-items: stretch;
  pointer-events: none;
  overflow: auto;
  contain: layout paint;
}
.ecu-settings-preview-rail {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 200px;
}
.ecu-settings-preview-rail[data-orient="horizontal"] {
  min-height: 96px;
  min-width: 280px;
}
.ecu-settings-preview-side {
  flex: 0 1 220px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: flex-end;
}
.ecu-settings-preview .ecu-abil-panel[data-orient="vertical"] .ecu-abil-sections {
  flex-direction: row;
  gap: 18px;
}
.ecu-settings-preview .ecu-abil-panel[data-orient="vertical"] .ecu-abil-section {
  flex: 0 0 auto;
  width: var(--abil-rail-w, 50px);
}
.ecu-settings-preview .ecu-abil-panel[data-orient="horizontal"] {
  min-height: 72px;
  width: 100%;
}
.ecu-settings-preview .ecu-abil-panel[data-orient="horizontal"] .ecu-abil-sections {
  flex-direction: column;
  width: 100%;
  gap: 12px;
}
.ecu-settings-preview .ecu-abil-panel[data-orient="horizontal"] .ecu-abil-section {
  flex: 0 0 auto;
  width: 100%;
  height: calc(var(--abil-rail-w, 50px) + 8px);
}
.ecu-settings-lead {
  color: #aaa;
  font-size: 18px;
  margin: 0 0 8px;
  line-height: 1.35;
}
.ecu-settings-row-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ecu-settings-row-label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ecu-settings-help {
  color: #888;
  font-size: 16px;
}
.ecu-settings-tag {
  font-size: 12px;
  padding: 2px 7px;
  border: 1px solid #555;
  border-radius: 8px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-settings-tag[data-tag="debug"] {
  border-color: #664;
  color: #cc8;
}
.ecu-settings-tag[data-tag="static"] {
  border-color: #456;
  color: #9ab;
}
.ecu-settings-tag[data-tag="legacy"] {
  border-color: #544;
  color: #c88;
}
.ecu-settings-reset {
  cursor: pointer;
  background: #1a1a1a;
  border: 1px solid #555;
  color: #eee;
  font: inherit;
  font-size: 18px;
  padding: 6px 14px;
}
.ecu-settings-color {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ecu-settings-color-swatch {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #555;
  background: #1a1a1a;
  cursor: pointer;
}
.ecu-settings-color-text {
  width: 92px;
  font: inherit;
  font-size: 17px;
  background: #1a1a1a;
  color: #eee;
  border: 1px solid #555;
  padding: 5px 8px;
}
.ecu-settings-color-clear {
  cursor: pointer;
  background: transparent;
  border: 1px solid #444;
  color: #888;
  font-size: 18px;
  line-height: 1;
  padding: 4px 8px;
}
.ecu-settings-color-clear:hover {
  border-color: #866;
  color: #faa;
}
.ecu-settings-abil-list {
  margin-top: 8px;
}
.ecu-settings-abil-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 20px;
}
.ecu-settings-abil-id {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.ecu-settings-abil-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ecu-settings-abil-name {
  color: #ddd;
  font-size: 20px;
}
.ecu-settings-abil-key,
.ecu-settings-abil-icon {
  color: #777;
}
.ecu-settings-abil-key {
  font-size: 16px;
}
.ecu-settings-abil-icon {
  flex: 0 0 auto;
}
.ecu-settings-abil-check {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
  font-size: 18px;
  white-space: nowrap;
  cursor: pointer;
}
.ecu-settings-abil-check input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}
.ecu-settings-abil-clear {
  cursor: pointer;
  background: transparent;
  border: 1px solid #444;
  color: #888;
  font-size: 18px;
  line-height: 1;
  padding: 4px 8px;
}
.ecu-settings-abil-clear:hover {
  border-color: #866;
  color: #faa;
}
`;

let injected = false;

export function ensureSettingsPanelCss(): void {
  if (injected) return;
  injected = true;
  const existing = document.querySelector(
    "style[data-ecu-settings-css]",
  ) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = SETTINGS_PANEL_CSS;
    return;
  }
  const el = document.createElement("style");
  el.setAttribute("data-ecu-settings-css", "1");
  el.textContent = SETTINGS_PANEL_CSS;
  document.head.appendChild(el);
}
