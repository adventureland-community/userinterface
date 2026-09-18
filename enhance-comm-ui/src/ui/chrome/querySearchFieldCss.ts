/**
 * Shared Market-style query search field styles (⌕ · clear · sectioned menu).
 */

const STYLE_ID = "ecu-query-search-field-css";

const CSS = `
.ecu-qsearch {
  position: relative;
  flex: 1 1 220px;
  min-width: 160px;
}
.ecu-qsearch-field {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #3a3a3a;
  background: #080808;
  box-sizing: border-box;
}
.ecu-qsearch-field:focus-within {
  border-color: rgba(232, 201, 106, .55);
}
.ecu-qsearch-ico {
  color: #555;
  font-size: 13px;
  line-height: 1;
  flex: 0 0 auto;
}
.ecu-qsearch-field input {
  flex: 1;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-size: 13px;
  outline: none;
  min-width: 0;
}
/* Hide native search clear — we draw our own ×. */
.ecu-qsearch-field input[type="search"]::-webkit-search-cancel-button,
.ecu-qsearch-field input[type="search"]::-webkit-search-decoration,
.ecu-qsearch-field input[type="search"]::-webkit-search-results-button,
.ecu-qsearch-field input[type="search"]::-webkit-search-results-decoration {
  -webkit-appearance: none;
  appearance: none;
}
.ecu-qsearch-clear {
  appearance: none;
  border: 0;
  background: transparent;
  color: #666;
  font: inherit;
  font-size: 14px;
  padding: 0 2px;
  cursor: pointer;
  flex: 0 0 auto;
}
.ecu-qsearch-clear:hover { color: #ccc; }
.ecu-qsearch-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  z-index: 40;
  max-height: min(360px, 55vh);
  overflow: auto;
  border: 1px solid #3a3a3a;
  background: #121212;
  box-shadow: 0 12px 28px rgba(0,0,0,.55);
}
.ecu-qsearch-sec { padding: 8px 0 4px; }
.ecu-qsearch-sec + .ecu-qsearch-sec {
  border-top: 1px solid #242424;
}
.ecu-qsearch-h {
  padding: 2px 12px 6px;
  color: #666;
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.ecu-qsearch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  background: transparent;
  color: #ddd;
  font: inherit;
  font-size: 12px;
  text-align: left;
  padding: 7px 12px;
  cursor: pointer;
}
.ecu-qsearch-row:hover,
.ecu-qsearch-row.is-hi { background: #1c1c1c; }
.ecu-qsearch-op {
  flex: 0 0 auto;
  color: #e8c96a;
  font-family: Consolas, "Segoe UI", monospace;
  font-weight: 600;
}
.ecu-qsearch-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-qsearch-hint {
  flex: 0 1 auto;
  color: #666;
  font-size: 11px;
  text-align: right;
  max-width: 46%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-qsearch-rowIco {
  flex: 0 0 auto;
  color: #555;
  width: 14px;
  text-align: center;
}
.ecu-qsearch-foot {
  border-top: 1px solid #242424;
  padding: 6px 12px 8px;
  color: #666;
  font-size: 11px;
}
.ecu-qsearch-foot kbd {
  float: right;
  color: #888;
  border: 1px solid #333;
  padding: 0 4px;
  font-size: 10px;
}
`;

export function ensureQuerySearchFieldCss(): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = CSS;
}
