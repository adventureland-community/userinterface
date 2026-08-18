/**
 * Instance + instanceRun HUD. Outer PositionedPanel already paints the
 * opaque shell — inner content must not add a second double-gray box.
 */
export const CRYPT_PANEL_CSS = `
#comm-ui .comm-pos-panel.comm-pos-instance,
#comm-ui .comm-pos-panel.comm-pos-instanceRun {
  opacity: 1 !important;
}
#comm-ui .comm-pos-panel.comm-pos-instance .comm-crypt-progress,
#comm-ui .comm-pos-panel.comm-pos-instanceRun .comm-instance-run {
  min-height: 100%;
  height: 100%;
  box-sizing: border-box;
}

.comm-crypt-progress {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}
.ecu-inst-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 8px 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.ecu-inst-sec {
  font-size: 13px;
  color: #b0b0b0;
  padding: 4px 2px 0;
}
.ecu-inst-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 164px), 1fr));
  gap: 6px;
  align-items: start;
  width: 100%;
  min-width: 0;
}
.ecu-inst-grid--compass {
  grid-template-columns: 1fr 1fr;
}
.ecu-inst-card-span {
  grid-column: 1 / -1;
}

.ecu-inst-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: #050505;
  padding: 6px 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 2px double #555;
  color: #eee;
  font-size: 15px;
}
.ecu-inst-card--seen {
  border-color: #cc6;
}
.ecu-inst-card--aggro {
  border-color: #e55;
}
.ecu-inst-card--dead {
  border-color: #444;
}
.ecu-inst-card--meta .ecu-inst-card__head {
  padding-right: 52px;
}
.ecu-inst-card__corner {
  position: absolute;
  top: 5px;
  right: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  pointer-events: none;
  line-height: 1.2;
}
.ecu-inst-card__level {
  font-size: 11px;
  color: #c8c8c8;
  font-variant-numeric: tabular-nums;
}
.ecu-inst-card__kills {
  font-size: 11px;
  color: #9a9a9a;
}
.ecu-inst-card__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}
.ecu-inst-card__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}
.ecu-inst-card__id {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.ecu-inst-card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
  color: #fff;
  font-size: 16px;
}
.ecu-inst-card__glance {
  font-size: 12px;
  color: #ccc;
}
.ecu-inst-card--aggro .ecu-inst-card__glance {
  color: #f66;
}
.ecu-inst-card--seen .ecu-inst-card__glance {
  color: #e8c96a;
}
.ecu-inst-card--dead .ecu-inst-card__glance {
  color: #9a9a9a;
}
.ecu-inst-card__detail {
  display: none;
}
.ecu-inst-card:hover .ecu-inst-card__detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ecu-inst-card__detail-line {
  font-size: 12px;
  color: #ccc;
  line-height: 1.25;
}
.ecu-inst-card__detail-id {
  color: #888;
  font-size: 11px;
}

.comm-instance-run {
  display: flex;
  flex-direction: column;
  padding: 6px 10px 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.ecu-inst-run__pill {
  display: inline-block;
  align-self: flex-start;
  padding: 2px 8px;
  margin-bottom: 6px;
  border: 1px solid rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
  color: #e8c96a;
  font-size: 12px;
}
.ecu-inst-run__label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}
.ecu-inst-run__count {
  color: #ddd;
  font-variant-numeric: tabular-nums;
}
.ecu-inst-run__bar {
  height: 8px;
  background: #222;
  border: 1px solid #444;
  overflow: hidden;
}
.ecu-inst-run__fill {
  height: 100%;
  background: linear-gradient(90deg, #6a4, #8c6);
  transition: width 0.2s;
}
.ecu-inst-run__meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  font-size: 12px;
  color: #ccc;
}
`;

let injected = false;

export function ensureCryptPanelCss(): void {
  if (injected) return;
  injected = true;
  const existing = document.querySelector(
    "style[data-ecu-crypt-panel-css]",
  ) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = CRYPT_PANEL_CSS;
    return;
  }
  const el = document.createElement("style");
  el.setAttribute("data-ecu-crypt-panel-css", "1");
  el.textContent = CRYPT_PANEL_CSS;
  document.head.appendChild(el);
}
