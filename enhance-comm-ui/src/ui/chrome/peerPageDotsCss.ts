/** Shared peer-page pager chrome (Chat / Bank / Market). */

const STYLE_ID = "ecu-peer-page-dots-css";

const CSS = `
.ecu-peer-page-dots {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 4px 8px;
  padding: 4px 8px 8px;
  pointer-events: auto;
}
.ecu-peer-page-dots__side {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  min-height: 40px;
  max-width: 100%;
  margin: 0;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #b8c0ca;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  appearance: none;
  -webkit-appearance: none;
}
.ecu-peer-page-dots__side.is-prev {
  justify-self: start;
  justify-content: flex-start;
  text-align: left;
}
.ecu-peer-page-dots__side.is-next {
  justify-self: end;
  justify-content: flex-end;
  text-align: right;
}
.ecu-peer-page-dots__side:not(:disabled):hover,
.ecu-peer-page-dots__side:not(:disabled):active {
  color: #d8dde4;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.ecu-peer-page-dots__side:disabled,
.ecu-peer-page-dots__side.is-empty {
  opacity: 0.28;
  cursor: default;
}
.ecu-peer-page-dots__side-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-peer-page-dots__chev {
  flex: 0 0 auto;
  font-size: 16px;
  line-height: 1;
  opacity: 0.85;
}
.ecu-peer-page-dots__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 72px;
  max-width: 140px;
  padding: 0 4px;
}
.ecu-peer-page-dots__current {
  font-size: 15px;
  font-weight: 700;
  color: #e8eef4;
  letter-spacing: 0.02em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.ecu-peer-page-dots.is-flash .ecu-peer-page-dots__current {
  animation: ecu-peer-page-flash 0.42s ease-out;
}
@keyframes ecu-peer-page-flash {
  0% { color: #9dd4ec; transform: scale(1.06); }
  100% { color: #e8eef4; transform: scale(1); }
}
.ecu-peer-page-dots__meta {
  font-size: 10px;
  font-weight: 600;
  color: #6a7380;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.ecu-peer-page-dots__track {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 2px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.ecu-peer-page-dots__track::-webkit-scrollbar {
  display: none;
}
.ecu-peer-page-dots__dot {
  pointer-events: auto;
  position: relative;
  box-sizing: border-box;
  flex: 0 0 auto;
  width: 7px !important;
  height: 7px !important;
  min-width: 7px !important;
  min-height: 7px !important;
  max-width: 7px !important;
  max-height: 7px !important;
  padding: 0 !important;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  appearance: none;
  -webkit-appearance: none;
}
.ecu-peer-page-dots__dot::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40px;
  height: 40px;
  transform: translate(-50%, -50%);
}
.ecu-peer-page-dots__dot.is-on {
  background: #9dd4ec;
  transform: scale(1.2);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
`;

export function ensurePeerPageDotsCss(): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  // Always refresh text so DEV/hot loads pick up sizing fixes.
  el.textContent = CSS;
}
