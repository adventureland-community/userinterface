export const METER_VIEWS_CSS = `
.ecu-meter-shell .leg-item { user-select: none; font-size: 13px; }
.ecu-meter-shell .leg-item input { margin: 0; }
.ecu-meter-shell .chart-tools,
.ecu-meter-shell .tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
/* —— Details parity: bars & icons —— */
.ecu-meter-icon.ecu-meter-icon-class {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 0;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.65);
  border-radius: 2px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.85);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  overflow: hidden;
  vertical-align: middle;
}
.ecu-meter-icon.ecu-meter-icon-class-sprite {
  line-height: 0;
  font-size: 0;
  text-shadow: none;
}
.ecu-meter-fill.ecu-meter-fill-anim {
  transition: width 0.25s ease;
}
.ecu-meter-row.is-total {
  background: rgba(0, 0, 0, 0.42);
  min-height: 18px;
  height: 18px;
  font-weight: 600;
  border-top: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.ecu-meter-row.is-total .ecu-meter-fill {
  opacity: 0.92;
}
.ecu-meter-row.is-total:hover {
  filter: brightness(1.08);
}
.ecu-meter-bar-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 180, 180, 0.35) transparent;
}
.ecu-meter-bar-scroll::-webkit-scrollbar {
  width: 6px;
}
.ecu-meter-bar-scroll::-webkit-scrollbar-thumb {
  background: rgba(180, 180, 180, 0.35);
  border-radius: 2px;
}
/* —— Details parity: statusbar —— */
.ecu-meter-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-shrink: 0;
  padding: 1px 6px;
  min-height: 18px;
  background: linear-gradient(180deg, rgba(40, 36, 38, 0.95) 0%, rgba(26, 21, 24, 0.98) 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.55);
  color: var(--meter-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
/* Keep statusbar actions clear of corner resize grips while arranging. */
.ecu-meter-shell.is-layout .ecu-meter-statusbar {
  padding-left: 16px;
  padding-right: 16px;
}
.ecu-meter-status-micro {
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  padding: 0 2px;
  white-space: nowrap;
  cursor: default;
  line-height: 1.3;
}
button.ecu-meter-status-micro {
  cursor: pointer;
}
button.ecu-meter-status-micro:hover,
.ecu-meter-status-micro.ecu-meter-status-link:hover {
  color: var(--meter-text);
}
.ecu-meter-status-micro.ecu-meter-status-link {
  cursor: pointer;
  margin-left: auto;
}
/* —— Details parity: options panel —— */
.ecu-meter-options-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483002;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  pointer-events: auto;
}
.ecu-meter-options-panel {
  min-width: min(380px, 92vw);
  max-width: 440px;
  max-height: 78vh;
  overflow: auto;
  background: linear-gradient(180deg, #1a171b 0%, #121114 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.28);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.62);
  color: #eee;
  font-size: 12px;
  scrollbar-width: thin;
  scrollbar-color: #5a5050 #1a1618;
}
.ecu-meter-options-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 8px;
  background: linear-gradient(180deg, #34292d 0%, #241c20 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.ecu-meter-options-hd b {
  color: #ffd28a;
  font-weight: 600;
}
.ecu-meter-options-sub {
  flex: 1;
  min-width: 0;
  color: rgba(220, 210, 210, 0.72);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-options-close {
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--meter-muted);
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
}
.ecu-meter-options-close:hover {
  color: #fff;
}
.ecu-meter-options-body {
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ecu-meter-opt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.ecu-meter-opt-row:last-child {
  border-bottom: none;
}
.ecu-meter-opt-label {
  color: #ddd;
  font-size: 12px;
  flex: 1;
  min-width: 0;
}
.ecu-meter-opt-row input[type="checkbox"] {
  margin: 0;
  accent-color: #c9a227;
}
.ecu-meter-opt-row input[type="range"] {
  width: 120px;
  accent-color: #c9a227;
}
.ecu-meter-opt-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 2px;
}
.ecu-meter-opt-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
/* —— Details parity: encounter dashboard —— */
.ecu-meter-encounter {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--meter-panel-solid);
}
.ecu-meter-enc-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--meter-border);
  background: linear-gradient(180deg, rgba(74, 42, 44, 0.55) 0%, rgba(0, 0, 0, 0.15) 100%);
  flex-shrink: 0;
}
.ecu-meter-enc-title {
  font-size: 12px;
  color: #e8eef7;
}
.ecu-meter-enc-title b {
  color: var(--meter-accent);
}
.ecu-meter-enc-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 10px;
  color: var(--meter-muted);
  font-variant-numeric: tabular-nums;
}
.ecu-meter-enc-stats b {
  color: #dce6f2;
}
.ecu-meter-enc-stats .is-bad {
  color: #ef9a9a;
}
.ecu-meter-enc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  background: var(--meter-border);
  flex: 1;
  min-height: 0;
}
@media (max-width: 520px) {
  .ecu-meter-enc-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
  }
}
.ecu-meter-enc-widget {
  background: #12141a;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ecu-meter-enc-widget-hd {
  margin: 0;
  padding: 4px 8px;
  font-size: 10px;
  color: var(--meter-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}
.ecu-meter-enc-widget.tone-taken .ecu-meter-enc-widget-hd {
  color: #ffb74d;
  border-left: 2px solid #ffb74d;
}
.ecu-meter-enc-widget.tone-spell .ecu-meter-enc-widget-hd {
  color: #ef9a9a;
  border-left: 2px solid #ef9a9a;
}
.ecu-meter-enc-widget.tone-death .ecu-meter-enc-widget-hd {
  color: #ce93d8;
  border-left: 2px solid #ce93d8;
}
.ecu-meter-enc-widget.tone-dmg .ecu-meter-enc-widget-hd {
  color: #e57373;
  border-left: 2px solid #e57373;
}
.ecu-meter-enc-widget.tone-heal .ecu-meter-enc-widget-hd {
  color: #81c784;
  border-left: 2px solid #81c784;
}
.ecu-meter-enc-widget.tone-av .ecu-meter-enc-widget-hd {
  color: #80cbc4;
  border-left: 2px solid #80cbc4;
}
.ecu-meter-enc-widget-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 180, 180, 0.35) transparent;
}
.ecu-meter-enc-deathlist {
  padding: 2px 0;
}
.ecu-meter-enc-deathrow {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 6px;
  align-items: baseline;
  padding: 3px 8px;
  font-size: 11px;
  color: #c5d0e0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.ecu-meter-enc-deathname {
  color: #ef9a9a;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-enc-deathtime {
  color: var(--meter-muted);
  font-variant-numeric: tabular-nums;
}
.ecu-meter-enc-deathnum {
  color: #8b9bb0;
  font-size: 10px;
}
.ecu-meter-enc-empty {
  padding: 8px;
  color: #888;
  font-size: 11px;
}
.ecu-meter-report-tab.is-stub {
  opacity: 0.42;
  cursor: default;
  color: var(--meter-muted);
}
.ecu-meter-report-tab.is-stub:hover {
  color: var(--meter-muted);
  background: transparent;
}
`;
