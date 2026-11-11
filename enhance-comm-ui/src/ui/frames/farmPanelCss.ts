/** Farm glance + details panel styles. */

const STYLE_ID = "ecu-farm-panel-css";

export const FARM_PANEL_CSS = `
.ecu-farm {
  display: flex;
  flex-direction: column;
  color: #eee;
  font-weight: normal;
  text-shadow: none;
  max-width: 100%;
  box-sizing: border-box;
}
/* Glance = floating HUD chips (mockup shape): no outer window fill. */
.ecu-farm--glance {
  gap: 3px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  align-items: flex-start;
}
.ecu-farm.is-details {
  gap: 4px;
  margin: 2px;
  padding: 5px;
  min-width: 0;
  width: max-content;
  /* Choice B (3/3): short BL dock — narrower than full sheet. */
  max-width: min(240px, 92vw);
  height: max-content;
  border: 2px solid #555;
  background: rgba(0, 0, 0, 0.94);
}
.ecu-farm__title {
  font-size: 15px;
  color: #eee;
  cursor: grab;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ecu-farm__title-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ecu-farm__btn {
  border: 1px solid #555;
  background: #1a1a1a;
  color: #ccc;
  padding: 2px 7px;
  font-size: 12px;
  cursor: pointer;
  font-weight: normal;
  text-shadow: none;
}
.ecu-farm__btn:hover { color: #eee; border-color: #777; }
.ecu-farm__btn.is-on {
  border-color: #e8c96a;
  color: #e8c96a;
}
.ecu-farm__glance-head {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}
.ecu-farm--glance .ecu-farm__gold-band {
  margin-bottom: 3px;
}
.ecu-farm__gold-band {
  display: inline-flex;
  align-items: center;
  gap: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.82);
}
.ecu-farm__open {
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #c8c8c8;
  padding: 3px 7px;
  font-size: 11px;
  cursor: pointer;
  font-weight: normal;
  text-shadow: 0 1px 2px #000;
  flex-shrink: 0;
}
.ecu-farm__open:hover {
  color: #e8c96a;
  background: rgba(255, 255, 255, 0.06);
}
.ecu-farm__gold {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  border: none;
  background: transparent;
  cursor: grab;
  align-self: flex-start;
  color: inherit;
  font-weight: normal;
  text-shadow: none;
}
.ecu-farm__gold:hover { background: rgba(255, 255, 255, 0.04); }
.ecu-farm__gold-v {
  font-size: 15px;
  color: #e8c96a;
  font-variant-numeric: tabular-nums;
}
.ecu-farm__gold-v .u {
  font-size: 12px;
  color: #c8c8c8;
}
.ecu-farm__spark {
  width: 48px;
  height: 14px;
  display: block;
}
.ecu-farm__chips {
  display: grid;
  gap: 3px 4px;
}
.ecu-farm__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 5px 4px 4px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.82);
  cursor: pointer;
  color: #eee;
  font-weight: normal;
  text-shadow: none;
  width: max-content;
  max-width: 100%;
  min-height: 30px;
  overflow: visible;
}
.ecu-farm__chip:hover { border-color: rgba(255, 255, 255, 0.4); }
/* Portrait + drop share one 24×24 well; feet/crop clipped to the floor. */
.ecu-farm__portrait {
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border: 1px solid #444;
  background: #141210;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  align-self: center;
}
.ecu-farm__portrait .ecu-icon-html {
  display: block !important;
  line-height: 0 !important;
  font-size: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}
.ecu-farm__portrait .ecu-icon-html > div {
  margin: 0 !important;
  overflow: hidden !important;
}
.ecu-farm__portrait .ecu-icon-html > div > div {
  bottom: 0 !important;
  top: auto !important;
}
.ecu-farm__rate {
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 0;
  font-size: 13px;
  color: #eee;
  font-variant-numeric: tabular-nums;
  min-width: 3.4ch;
  height: 24px;
  line-height: 24px;
  text-shadow: 0 1px 2px #000;
}
.ecu-farm__rate .u {
  color: #b8b8b8;
  font-size: 10px;
  line-height: 24px;
}
/* Same outer well as portrait; qty badge tucked so it doesn't own the chip. */
.ecu-farm__chip-drop.ecu-item-instance-host {
  flex-shrink: 0;
  align-self: center;
  margin-left: 0;
  width: 24px !important;
  height: 24px !important;
  border: 1px solid #444;
  background: #141210;
  box-sizing: border-box;
  display: flex !important;
  align-items: center;
  justify-content: center;
}
.ecu-farm__chip-drop .ecu-item-instance-art {
  width: 20px !important;
  height: 20px !important;
}
.ecu-farm__chip-drop .ecu-item-badge--qty {
  font-size: 9px !important;
  line-height: 11px !important;
  height: 11px;
  min-width: 11px;
  padding: 0 2px;
  right: -2px;
  bottom: -2px;
}
.ecu-farm__more {
  margin-top: 2px;
  padding: 0 2px;
  font-size: 10px;
  color: rgba(180, 180, 180, 0.65);
  border: none;
  background: transparent;
  cursor: pointer;
  align-self: flex-start;
  font-weight: normal;
  text-shadow: none;
}
.ecu-farm__more:hover { color: #e8c96a; }
.ecu-farm__empty {
  padding: 2px 5px;
  font-size: 11px;
  color: #9a9a9a;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.82);
  cursor: pointer;
  align-self: flex-start;
  font-weight: normal;
  text-shadow: none;
}
.ecu-farm--glance .ecu-farm__empty {
  cursor: grab;
}
.ecu-farm__tabs,
.ecu-farm__seg {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.ecu-farm__tab {
  padding: 3px 7px;
  border: 1px solid #444;
  background: #181614;
  color: #ccc;
  font-size: 11px;
  cursor: pointer;
  font-weight: normal;
  text-shadow: none;
}
.ecu-farm__tab.is-on {
  border-color: #e8c96a;
  color: #e8c96a;
  background: #221c12;
}
.ecu-farm__body {
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* Choice B (3/3): short scroll dock — fight stays clear on desktop. */
  max-height: min(160px, 28vh);
  overflow-y: auto;
}
.ecu-farm__kpi-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  border: 1px solid #333;
  background: #121212;
}
.ecu-farm__kpi {
  border: none;
  border-right: 1px solid #2a2a2a;
  border-bottom: 1px solid #2a2a2a;
  background: transparent;
  padding: 6px 7px;
}
.ecu-farm__kpi:nth-child(2n) { border-right: none; }
.ecu-farm__kpi:nth-last-child(-n+2) { border-bottom: none; }
.ecu-farm__kpi-v {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: #eee;
}
.ecu-farm__kpi--gold {
  background: rgba(232, 201, 106, 0.06);
}
.ecu-farm__kpi-v--gold {
  color: #e8c96a;
  font-size: 15px;
}
.ecu-farm__kpi-v--mute {
  color: #b0b0b0;
  font-size: 13px;
}
.ecu-farm__kpi-l {
  font-size: 10px;
  color: #9a9a9a;
}
.ecu-farm__signal {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  font-size: 10px;
  color: #b0b0b0;
  border: 1px solid #2a2a2a;
  background: #101010;
}
.ecu-farm__signal > div {
  border: none;
  border-right: 1px solid #2a2a2a;
  background: transparent;
  padding: 3px 6px;
}
.ecu-farm__signal > div:last-child { border-right: none; }
.ecu-farm__signal b { color: #e8c96a; font-weight: normal; }
.ecu-farm__ok { color: #7dce8a !important; }
.ecu-farm__warn { color: #e8c96a !important; }
.ecu-farm__charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.ecu-farm__chart {
  border: 1px solid #333;
  background: #101010;
  padding: 5px;
}
.ecu-farm__chart h3 {
  margin: 0 0 4px;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #b0b0b0;
  font-weight: normal;
}
.ecu-farm__line {
  width: 100%;
  height: 48px;
  display: block;
}
.ecu-farm__chart--gold {
  padding: 4px 5px 5px;
}
.ecu-farm__chart--gold .ecu-farm__line {
  height: 40px;
}
.ecu-farm__table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.ecu-farm__table th {
  text-align: left;
  font-size: 10px;
  color: #c4c4c4;
  font-weight: normal;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 4px 2px 2px;
  border-bottom: 1px solid #333;
}
.ecu-farm__table .ecu-farm__avg {
  color: #8a8a8a;
}
.ecu-farm__table td {
  padding: 1px 4px 1px 2px;
  vertical-align: middle;
  border-bottom: 1px solid #1c1c1c;
}
.ecu-farm__table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  width: 1%;
  padding-left: 10px;
}
.ecu-farm__loot-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 11.5em;
}
.ecu-farm__loot-meta {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  overflow: hidden;
}
.ecu-farm__loot-meta > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-farm__sub {
  font-size: 10px;
  color: #9a9a9a;
}
.ecu-farm__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
`;

export function ensureFarmPanelCss(): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== FARM_PANEL_CSS) el.textContent = FARM_PANEL_CSS;
}
