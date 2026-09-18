/**
 * Bank panel styles — dark hub chrome aligned with Market.
 */

const STYLE_ID = "ecu-bank-panel-css";

const CSS = `
.BankPanel {
  --bk-line: #2a2a2a;
  --bk-muted: #8a8680;
  --bk-gold: #d4b35a;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #e6e2d6;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  font-size: 13px;
  background: #121110;
}
.BankPanel-head {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--bk-line);
}
.BankPanel-title {
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 12px;
  color: #cfc8b8;
}
.BankPanel-gold {
  color: var(--bk-gold);
  font-variant-numeric: tabular-nums;
}
.BankPanel-meta {
  color: var(--bk-muted);
  font-size: 12px;
}
.BankPanel-headGrow { flex: 1 1 auto; min-width: 8px; }
.BankPanel-btn {
  appearance: none;
  border: 1px solid #444;
  background: #1a1917;
  color: #ddd;
  padding: 4px 10px;
  font: inherit;
  cursor: pointer;
}
.BankPanel-btn:hover:not(:disabled) { border-color: #777; background: #222; }
.BankPanel-btn:disabled { opacity: 0.45; cursor: default; }
.BankPanel-expand {
  appearance: none;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #444;
  background: #1a1917;
  color: #ddd;
  cursor: pointer;
  line-height: 0;
}
.BankPanel-expand:hover { border-color: #777; background: #222; }
.BankPanel-expand.is-expanded {
  border-color: rgba(212, 179, 90, 0.55);
  color: #f0e6d0;
  background: #2a2620;
}
.BankPanel-expand .ecu-expand-glyph {
  display: block;
}
.BankPanel-note {
  flex: 0 0 auto;
  padding: 6px 12px;
  color: #9a9080;
  font-size: 12px;
  border-bottom: 1px solid var(--bk-line);
  background: #161512;
}
.BankPanel-tools {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--bk-line);
}
.BankPanel-seg {
  display: inline-flex;
  border: 1px solid #3a3a3a;
  overflow: hidden;
}
.BankPanel-seg button {
  appearance: none;
  border: 0;
  background: #141312;
  color: #aaa;
  padding: 5px 10px;
  font: inherit;
  cursor: pointer;
}
.BankPanel-seg button + button { border-left: 1px solid #2a2a2a; }
.BankPanel-seg button.is-on {
  background: #2a2620;
  color: #f0e6d0;
}
.BankPanel-sortSeg {
  margin-left: 0;
}
.BankPanel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px 14px;
}
.BankPanel-empty {
  color: var(--bk-muted);
  padding: 24px 8px;
  text-align: center;
}
.BankPanel-section {
  margin-bottom: 14px;
}
.BankPanel-sectionTitle {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bk-muted);
  margin: 0 0 8px;
}
.BankPanel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: 6px;
}
.BankPanel-packs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 14px 16px;
}
.BankPanel-pack {
  display: inline-block;
  vertical-align: top;
}
.BankPanel-packTitle {
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  font-size: 12px;
  color: var(--bk-muted);
  margin: 0 0 6px;
}
.BankPanel-packTitle.is-tight { color: #c9a24a; }
.BankPanel-packTitle.is-full { color: #c07060; }
.BankPanel-packGrid {
  display: grid;
  grid-template-columns: repeat(7, 48px);
  gap: 1px;
  background: #1a1917;
  border: 1px solid #2a2a2a;
  padding: 1px;
}
.BankPanel-slot {
  appearance: none;
  width: 48px;
  height: 48px;
  box-sizing: border-box;
  border: 1px solid #2e2c28;
  background: #141312;
  padding: 2px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.BankPanel-slot.is-empty {
  cursor: default;
  background: #0e0d0c;
  border-color: #222;
}
.BankPanel-slot.is-dim { opacity: 0.28; }
.BankPanel-slot:not(.is-empty):hover {
  border-color: rgba(212, 179, 90, 0.45);
}
.BankPanel-cell {
  appearance: none;
  border: 1px solid #2e2c28;
  background: #0e0d0c;
  padding: 3px;
  cursor: pointer;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.BankPanel-cell:hover { border-color: rgba(212, 179, 90, 0.45); }
.BankPanel-cellMeta {
  margin-top: 4px;
  font-size: 10px;
  color: var(--bk-muted);
  text-align: center;
  line-height: 1.2;
}
.BankPanel-ready {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.BankPanel-readyTabs,
.BankPanel-readySub {
  display: inline-flex;
  flex-wrap: wrap;
  border: 1px solid #3a3a3a;
  overflow: hidden;
  align-self: flex-start;
}
.BankPanel-readyTabs button,
.BankPanel-readySub button {
  appearance: none;
  border: 0;
  background: #141312;
  color: #aaa;
  padding: 5px 12px;
  font: inherit;
  cursor: pointer;
}
.BankPanel-readyTabs button + button,
.BankPanel-readySub button + button {
  border-left: 1px solid #2a2a2a;
}
.BankPanel-readyTabs button.is-on,
.BankPanel-readySub button.is-on {
  background: #2a2620;
  color: #f0e6d0;
}
.BankPanel-readyTabs button:disabled,
.BankPanel-readySub button:disabled {
  opacity: 0.35;
  cursor: default;
}
.BankPanel-readySub {
  border-color: #2e2c28;
}
.BankPanel-readySub button {
  font-size: 12px;
  padding: 4px 10px;
}
.BankPanel-recipeGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.BankPanel-recipeCard {
  border: 1px solid #2e2c28;
  background: #0e0d0c;
  padding: 10px 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.BankPanel-recipeHint {
  font-size: 11px;
  color: var(--bk-muted);
  text-align: center;
}
.BankPanel-recipeHint.is-ok {
  color: #8bc98a;
  font-weight: 600;
}
.BankPanel-recipeResult {
  font-size: 11px;
  font-weight: 600;
  color: #cfc8b8;
  text-align: center;
}
.BankPanel-recipeRow {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
}
.BankPanel-recipeArrow {
  align-self: center;
  color: var(--bk-muted);
  font-size: 16px;
  line-height: 1;
  user-select: none;
  padding: 0 2px;
}
.BankPanel-recipeTile {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  line-height: 0;
}
.BankPanel-recipeTile:hover .ecu-item-instance-host {
  outline: 1px solid rgba(212, 179, 90, 0.45);
}
.BankPanel-recipeFoot {
  font-size: 11px;
  color: var(--bk-muted);
  text-align: center;
  margin-top: 2px;
}

/* Shell lift — same inset as chat expand. */
[data-panel="bank"].ecu-bank-shell-expanded {
  position: fixed !important;
  left: 10px !important;
  right: 10px !important;
  top: 10px !important;
  bottom: 56px !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  min-width: 0 !important;
  min-height: 0 !important;
  z-index: 480 !important;
  transform: none !important;
}
[data-panel="bank"].ecu-bank-shell-expanded .BankPanel {
  height: 100%;
  min-height: 0;
}
`;

export function ensureBankPanelCss(): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = CSS;
}
