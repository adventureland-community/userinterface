/** Shrine-style Upgrade / Compound dialog — polished board + icon tiles. */

let injected = false;

const CSS = `
.ecu-upg-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483004;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
.ecu-upg {
  width: min(448px, 94vw);
  max-height: min(92vh, 820px);
  overflow: auto;
  padding: 14px 14px 12px;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(70, 55, 30, 0.35), transparent 55%),
    linear-gradient(180deg, #141210 0%, #0a0908 100%);
  border: 4px solid #5a5a5a;
  outline: 1px solid rgba(232, 201, 106, 0.28);
  box-shadow:
    0 22px 50px rgba(0, 0, 0, 0.85),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  color: #eee;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  font-size: 13px;
  box-sizing: border-box;
}
.ecu-upg__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #ffd28a;
  text-align: center;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
}
.ecu-upg__item-name {
  margin: 4px 0 2px;
  text-align: center;
  color: rgba(240, 230, 210, 0.96);
  font-size: 14px;
  line-height: 1.25;
  font-weight: 600;
}
.ecu-upg__meta {
  margin: 0 0 10px;
  text-align: center;
  font-size: 11px;
  color: rgba(170, 160, 145, 0.9);
}
/* Discord-bot-inspired trial card (chance / roll / grace). */
.ecu-upg__trial {
  margin: 0 0 12px;
  padding: 10px 10px 12px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(70, 70, 70, 0.9);
  border-left: 3px solid #e8c96a;
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.45);
}
.ecu-upg__trial-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 10px;
}
.ecu-upg__trial-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #e8c96a;
}
.ecu-upg__trial-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e8c96a;
  box-shadow: 0 0 6px rgba(232, 201, 106, 0.55);
  flex: 0 0 auto;
}
.ecu-upg__trial-who {
  font-size: 11px;
  color: rgba(170, 160, 145, 0.85);
  white-space: nowrap;
}
.ecu-upg__trial-body {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.ecu-upg__trial-result {
  position: relative;
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #1c1c1c, #0c0c0c);
  border: 2px solid rgba(232, 201, 106, 0.55);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.65);
  box-sizing: border-box;
  line-height: 0;
  font-size: 0;
  overflow: hidden;
}
.ecu-upg__trial-result.is-empty {
  border-color: rgba(110, 110, 110, 0.55);
}
.ecu-upg__trial-level {
  position: absolute;
  right: 3px;
  bottom: 2px;
  z-index: 2;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 0 2px #000, 1px 1px 0 #000;
  pointer-events: none;
}
.ecu-upg__trial-cols {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ecu-upg__trial-col-label {
  margin: 0 0 3px;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(190, 175, 145, 0.75);
  line-height: 1;
}
.ecu-upg__trial-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: flex-start;
  min-height: 40px;
}
.ecu-upg__mini-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 52px;
}
.ecu-upg__mini-key {
  font-size: 8px;
  line-height: 1.15;
  letter-spacing: 0.02em;
  color: rgba(180, 170, 150, 0.88);
  text-align: center;
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-upg__mini {
  appearance: none;
  position: relative;
  width: 40px;
  height: 40px;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #1a1a1a, #0d0d0d);
  border: 1px solid rgba(120, 120, 120, 0.7);
  box-sizing: border-box;
  line-height: 0;
  font-size: 0;
  color: inherit;
  font-family: inherit;
  overflow: hidden;
}
.ecu-upg__mini:disabled {
  opacity: 1;
  cursor: default;
}
.ecu-upg__mini.is-clickable {
  cursor: pointer;
}
.ecu-upg__mini.is-clickable:hover {
  border-color: rgba(232, 201, 106, 0.7);
}
.ecu-upg__mini.is-empty {
  border-style: dashed;
  border-color: rgba(110, 110, 110, 0.55);
  color: rgba(170, 160, 140, 0.55);
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ecu-upg__mini.is-empty.is-clickable:hover,
.ecu-upg__mini.is-focus {
  border-style: solid;
  border-color: #e8c96a;
  color: #ffd28a;
  box-shadow: 0 0 0 1px rgba(232, 201, 106, 0.35);
}
.ecu-upg__mini-lv {
  position: absolute;
  right: 2px;
  bottom: 1px;
  z-index: 2;
  font-size: 9px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 0 2px #000, 1px 1px 0 #000;
  pointer-events: none;
}
.ecu-upg__trial-stats {
  flex: 0 0 auto;
  width: 104px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ecu-upg__stat {
  padding: 5px 6px 4px;
  background: rgba(12, 12, 12, 0.92);
  border: 1px solid rgba(70, 70, 70, 0.95);
  text-align: center;
}
.ecu-upg__stat.is-loading {
  border-color: rgba(232, 201, 106, 0.45);
}
.ecu-upg__stat-label {
  display: block;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(160, 150, 135, 0.85);
  margin-bottom: 2px;
}
.ecu-upg__stat-val {
  display: block;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: rgba(220, 220, 220, 0.92);
}
.ecu-upg__stat-val.is-chance {
  color: #7dcea0;
}
.ecu-upg__stat-detail {
  display: block;
  margin-top: 3px;
  font-size: 9px;
  line-height: 1.2;
  color: rgba(170, 160, 145, 0.88);
  word-break: break-word;
}
.ecu-upg__stat-note {
  display: block;
  margin-top: 2px;
  font-size: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(130, 120, 105, 0.85);
}
.ecu-upg__section.is-focus .ecu-upg__section-label {
  color: #ffd28a;
}
.ecu-upg__section.is-focus .ecu-upg__tiles {
  border-color: rgba(232, 201, 106, 0.45);
}
.ecu-upg__section.is-pulse .ecu-upg__tiles {
  animation: ecu-upg-pulse 0.7s ease;
}
@keyframes ecu-upg-pulse {
  0% { box-shadow: inset 0 0 0 0 rgba(232, 201, 106, 0); }
  40% { box-shadow: inset 0 0 0 1px rgba(232, 201, 106, 0.55); }
  100% { box-shadow: inset 0 0 0 0 rgba(232, 201, 106, 0); }
}
.ecu-upg__trial-result .itemslot,
.ecu-upg__trial-result .item_container,
.ecu-upg__trial-result .ecu-item-instance,
.ecu-upg__trial-result .ecu-item-title-frame,
.ecu-upg__trial-result .ecu-meter-icon,
.ecu-upg__mini .itemslot,
.ecu-upg__mini .item_container,
.ecu-upg__mini .ecu-item-instance,
.ecu-upg__mini .ecu-item-title-frame,
.ecu-upg__mini .ecu-meter-icon {
  margin: 0 !important;
}
.ecu-upg__section {
  margin: 0 0 10px;
}
.ecu-upg__section-label {
  margin: 0 0 5px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 185, 150, 0.78);
}
.ecu-upg__tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 8px;
  padding: 7px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.28);
  max-height: none;
  overflow: visible;
  align-items: flex-start;
}
.ecu-upg__tiles.is-scroll {
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  max-height: none;
  scrollbar-width: thin;
  scrollbar-color: #7a7048 #161616;
}
.ecu-upg__tile-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  max-width: 56px;
}
.ecu-upg__tile-key {
  font-size: 8px;
  line-height: 1.15;
  letter-spacing: 0.02em;
  color: rgba(180, 170, 150, 0.88);
  text-align: center;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-upg__tile {
  position: relative;
  appearance: none;
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  padding: 0;
  margin: 0;
  border: 2px solid rgba(95, 95, 95, 0.85);
  background: linear-gradient(180deg, #1a1a1a, #0d0d0d);
  cursor: pointer;
  box-sizing: border-box;
  line-height: 0;
  font-size: 0;
  color: inherit;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ecu-upg__tile:hover {
  border-color: rgba(232, 201, 106, 0.7);
  background: linear-gradient(180deg, #242018, #14110c);
}
.ecu-upg__tile.is-on {
  border-color: #e8c96a;
  box-shadow:
    0 0 0 1px rgba(232, 201, 106, 0.45),
    inset 0 0 10px rgba(232, 201, 106, 0.12);
  background: linear-gradient(180deg, #2a2418, #16120c);
}
.ecu-upg__tile.is-rec:not(.is-on) {
  border-color: rgba(232, 201, 106, 0.72);
  box-shadow: inset 0 0 8px rgba(232, 201, 106, 0.1);
}
.ecu-upg__tile.is-rec.is-on {
  border-color: #f0d078;
}
.ecu-upg__tile.is-none {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  line-height: 1.15;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(190, 180, 160, 0.8);
  text-align: center;
  padding: 4px;
}
.ecu-upg__tile .itemslot,
.ecu-upg__tile .item_container,
.ecu-upg__tile .ecu-item-instance,
.ecu-upg__tile .ecu-item-title-frame,
.ecu-upg__tile .ecu-meter-icon {
  margin: 0 !important;
  pointer-events: none;
}
.ecu-upg__tile .ecu-item-instance,
.ecu-upg__mini .ecu-item-instance,
.ecu-upg__trial-result .ecu-item-instance {
  display: inline-flex !important;
  line-height: 0 !important;
}
.ecu-upg__tile .ecu-item-instance > div,
.ecu-upg__mini .ecu-item-instance > div,
.ecu-upg__trial-result .ecu-item-instance > div {
  margin: 0 !important;
  border: none !important;
  position: relative !important;
  left: auto !important;
  top: auto !important;
  float: none !important;
  box-sizing: border-box !important;
}
.ecu-upg__tile-qty {
  position: absolute;
  right: 2px;
  bottom: 1px;
  z-index: 2;
  font-size: 10px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 0 2px #000, 1px 1px 0 #000;
  pointer-events: none;
}
.ecu-upg__tile-badge {
  position: absolute;
  left: 1px;
  top: 1px;
  z-index: 3;
  padding: 1px 3px;
  font-size: 8px;
  line-height: 1.1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
  color: #1a1408;
  background: linear-gradient(180deg, #ffe09a, #e8c96a);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
  text-shadow: none;
  pointer-events: none;
}
.ecu-upg__tile-grade {
  position: absolute;
  right: 2px;
  top: 2px;
  z-index: 2;
  font-size: 9px;
  line-height: 1;
  color: rgba(200, 210, 255, 0.9);
  text-shadow: 0 0 2px #000, 1px 1px 0 #000;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}
.ecu-upg__empty {
  padding: 6px 4px;
  color: rgba(180, 160, 140, 0.8);
  font-size: 12px;
}
.ecu-upg__hint {
  min-height: 1.1em;
  margin: 0 0 8px;
  font-size: 11px;
  color: #f0a0a0;
  text-align: center;
}
.ecu-upg__hint-link {
  appearance: none;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  color: #e8c96a;
  font: inherit;
  font-size: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.ecu-upg__hint-link:hover {
  color: #ffe09a;
}
.ecu-upg__actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
}
.ecu-upg__btn {
  appearance: none;
  min-width: 112px;
  border: 2px solid #666;
  background: linear-gradient(180deg, #2a2a2a, #151515);
  color: #eee;
  padding: 8px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.ecu-upg__btn:hover {
  background: linear-gradient(180deg, #353535, #1c1c1c);
  border-color: #888;
}
.ecu-upg__btn.is-primary {
  border-color: #c9a24a;
  background: linear-gradient(180deg, #3a3018, #1c160c);
  color: #ffe6b0;
}
.ecu-upg__btn.is-primary:hover {
  background: linear-gradient(180deg, #4a3c1c, #241c10);
  border-color: #e8c96a;
}
.ecu-upg__btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
`;

export function ensureUpgradeCompoundDialogCss(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.setAttribute("data-ecu-upg-css", "1");
  style.textContent = CSS;
  document.head.appendChild(style);
}
