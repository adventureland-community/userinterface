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
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #2e343a;
  padding: 14px 10px;
  background: rgba(0, 0, 0, 0.12);
  overflow-y: auto;
}
.ecu-settings-nav-group {
  margin-bottom: 6px;
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
.ecu-settings-nav-subs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 4px 0 2px 10px;
  padding: 2px 0 2px 8px;
  border-left: 1px solid #3d4650;
}
.ecu-settings-nav-sub {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #9aa3ad;
  font: inherit;
  font-size: 14px;
  line-height: 1.25;
  padding: 5px 8px;
}
.ecu-settings-nav-sub:hover {
  color: #ffe08a;
  background: rgba(42, 34, 16, 0.45);
}
.ecu-settings-nav-sub.is-active {
  color: #ffe08a;
  border-color: rgba(136, 136, 102, 0.55);
  background: #2a2210;
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
  scroll-margin-top: 12px;
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
.ecu-pick-wrap {
  margin: 8px 0 4px;
  position: relative;
}
.ecu-pick-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.ecu-pick-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 17px;
  background: #2a2210;
  border: 1px solid #886;
  color: #ffe08a;
  padding: 3px 8px;
  cursor: pointer;
  user-select: none;
}
.ecu-pick-badge:hover {
  background: #3a2a10;
  border-color: #aa8;
}
.ecu-pick-badge-x {
  font-size: 15px;
  opacity: 0.6;
  margin-left: 2px;
}
.ecu-pick-badge:hover .ecu-pick-badge-x { opacity: 1; }
.ecu-pick-input-row {
  display: flex;
}
.ecu-pick-search {
  width: 100%;
  box-sizing: border-box;
  font-size: 17px;
  padding: 5px 8px;
  background: #1a1a1a;
  border: 1px solid #444;
  color: #ddd;
  outline: none;
}
.ecu-pick-search:focus { border-color: #886; }
.ecu-pick-dropdown {
  position: absolute;
  z-index: 10;
  left: 0;
  right: 0;
  max-height: 180px;
  overflow-y: auto;
  background: #1a1a1a;
  border: 1px solid #666;
  border-top: none;
}
.ecu-pick-option {
  padding: 5px 10px;
  cursor: pointer;
  font-size: 17px;
  color: #ddd;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ecu-pick-option:hover {
  background: #2a2210;
  color: #ffe08a;
}
.ecu-pick-option-detail {
  font-size: 14px;
  opacity: 0.5;
  margin-left: auto;
}
.ecu-abvis-table {
  margin: 8px 0;
  border: 1px solid #333;
  max-height: 280px;
  overflow-y: auto;
}
.ecu-abvis-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(100px, 1.5fr) 44px 62px;
  align-items: center;
  padding: 4px 8px;
  font-size: 16px;
  color: #ddd;
  border-bottom: 1px solid #222;
  min-height: 40px;
}
.ecu-abvis-row:last-child { border-bottom: none; }
.ecu-abvis-header {
  font-size: 13px;
  color: #888;
  background: #1a1a1a;
  position: sticky;
  top: 0;
  z-index: 1;
  min-height: 26px;
}
.ecu-abvis-cell { overflow: hidden; }
.ecu-abvis-ability {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ecu-abvis-ability-copy {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.ecu-abvis-ability-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-abvis-ability-key {
  font-size: 12px;
  color: #777;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-abvis-casters-col {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.ecu-abvis-caster {
  display: inline-flex;
  align-items: center;
  cursor: default;
}
.ecu-abvis-toggle { text-align: center; }
.ecu-abvis-toggle input { width: 16px; height: 16px; cursor: pointer; }
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
.ecu-settings-qr-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 8px 0 12px;
}
.ecu-settings-qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 132px;
  padding: 10px 8px 12px;
  border-radius: 12px;
  border: 1px solid #444;
  background: #161616;
  color: #ddd;
  text-decoration: none;
  box-sizing: border-box;
}
.ecu-settings-qr-card:hover {
  border-color: #6a9;
  color: #9dd4ec;
}
.ecu-settings-qr-card__img {
  display: block;
  width: 112px;
  height: 112px;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.ecu-settings-qr-card__img svg {
  display: block;
  width: 112px;
  height: 112px;
}
.ecu-settings-qr-card__label {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
}
.ecu-settings-qr-card__help {
  font-size: 11px;
  color: #888;
  text-align: center;
  line-height: 1.25;
}
.ecu-settings-script-url {
  word-break: break-all;
}
.ecu-settings-dev-fold {
  margin: 10px 0 4px;
  border: 1px solid #2e343a;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.ecu-settings-dev-fold__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  cursor: pointer;
  background: transparent;
  border: none;
  color: #9aa3ad;
  font: inherit;
  font-size: 15px;
  text-align: left;
  padding: 10px 12px;
}
.ecu-settings-dev-fold__toggle:hover {
  color: #c8d0d8;
  background: rgba(255, 255, 255, 0.03);
}
.ecu-settings-dev-fold__toggle[aria-expanded="true"] {
  color: #cbb87a;
  border-bottom: 1px solid #2e343a;
}
.ecu-settings-dev-fold__chevron {
  width: 1em;
  color: #77818c;
  font-size: 13px;
}
.ecu-settings-dev-fold__body {
  padding: 10px 12px 12px;
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
.ecu-settings-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  flex: 0 0 auto;
}
.ecu-settings-reset.is-ghost {
  background: transparent;
  border-color: #444;
  color: #aaa;
}
.ecu-settings-reset.is-danger {
  border-color: #6a3030;
  color: #e0a0a0;
  background: #1a1010;
}
.ecu-settings-reset.is-danger:hover {
  border-color: #8a4040;
  color: #f0c0c0;
}
.ecu-settings-reset:disabled {
  opacity: 0.35;
  cursor: default;
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
  grid-template-columns: minmax(120px, 1fr) minmax(100px, 1.5fr) auto auto;
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
.ecu-settings-abil-casters {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.ecu-settings-abil-caster {
  display: inline-flex;
  cursor: default;
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

/* Phone — full-height sheet above the Material dock, stacked nav. */
.ecu-settings-backdrop.is-phone {
  /* Above panels; stop above the Material dock so it stays clickable. */
  z-index: 500;
  inset: 0 auto var(--ecu-phone-dock-h, 48px) 0;
  top: 0;
  right: 0;
  bottom: var(--ecu-phone-dock-h, 48px);
  left: 0;
  width: auto;
  height: auto;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  background: rgba(0, 0, 0, 0.72);
}
.ecu-settings-modal.is-phone {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  border-radius: 16px 16px 0 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
  box-shadow: none;
}
.ecu-settings-modal.is-phone .ecu-settings-split {
  flex-direction: column;
}
.ecu-settings-modal.is-phone .ecu-settings-nav {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  border-right: none;
  border-bottom: 1px solid #2e343a;
  padding: 10px 12px;
  scrollbar-width: none;
}
.ecu-settings-modal.is-phone .ecu-settings-nav::-webkit-scrollbar {
  display: none;
}
.ecu-settings-modal.is-phone .ecu-settings-nav-group {
  flex: 0 0 auto;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  max-width: min(280px, 78vw);
}
.ecu-settings-modal.is-phone .ecu-settings-nav-btn {
  flex: 0 0 auto;
  width: auto;
  min-height: 44px;
  margin-bottom: 0;
  white-space: nowrap;
}
.ecu-settings-modal.is-phone .ecu-settings-nav-subs {
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 4px;
  margin: 6px 0 0;
  padding: 0;
  border-left: none;
  overflow-x: auto;
  max-width: 100%;
}
.ecu-settings-modal.is-phone .ecu-settings-nav-sub {
  flex: 0 0 auto;
  white-space: nowrap;
  min-height: 36px;
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid #3d4650;
  border-radius: 16px;
}
.ecu-settings-modal.is-phone .ecu-settings-pane {
  padding: 14px 16px 24px;
}
.ecu-settings-modal.is-phone .ecu-settings-pane-title {
  font-size: 22px;
}
.ecu-settings-modal.is-phone .ecu-settings-pane-desc {
  font-size: 15px;
}
.ecu-settings-modal.is-phone .ecu-settings-hd {
  gap: 10px;
  align-items: center;
}
.ecu-settings-phone-done {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 20px;
  background: rgba(157, 212, 236, 0.16);
  color: #9dd4ec;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.ecu-settings-modal.is-phone .ecu-settings-search {
  width: 100%;
  font-size: 16px;
  min-height: 44px;
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
