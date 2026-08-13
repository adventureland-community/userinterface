/** Report dialog. */
export const METER_REPORT_CSS = `
/* Report dialog */
.ecu-meter-report-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  pointer-events: auto;
}
.ecu-meter-report-dialog {
  min-width: min(420px, 92vw);
  max-width: 520px;
  max-height: 70vh;
  overflow: auto;
  background: linear-gradient(180deg, #1a171b 0%, #121114 100%);
  border: 1px solid rgba(0,0,0,0.85);
  outline: 1px solid rgba(232, 201, 106, 0.28);
  box-shadow: 0 14px 34px rgba(0,0,0,0.62);
  color: #eee;
  font-size: 12px;
  padding: 0;
}
.ecu-meter-report-dialog-hd {
  padding: 10px 12px 8px;
  background: linear-gradient(180deg, #34292d 0%, #241c20 100%);
  border-bottom: 1px solid rgba(0,0,0,0.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
.ecu-meter-report-dialog-kicker {
  font-size: 10px;
  color: rgba(220, 210, 210, 0.72);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}
.ecu-meter-report-dialog-title {
  font-size: 13px;
  color: #ffd28a;
  letter-spacing: 0.02em;
}
.ecu-meter-report-dialog-sub {
  margin-top: 2px;
  color: rgba(220, 210, 210, 0.72);
  font-size: 11px;
}
.ecu-meter-report-dialog-label {
  color: rgba(220, 210, 210, 0.72);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-report-dialog-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 0;
}
.ecu-meter-report-dialog-count {
  margin-left: auto;
  color: rgba(220, 210, 210, 0.72);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-report-chip {
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.05);
  color: #ddd;
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 2px;
}
.ecu-meter-report-chip.active {
  color: #ffd28a;
  border-color: rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
}
.ecu-meter-report-preview {
  margin: 4px 12px 10px;
  padding: 10px;
  background: rgba(0,0,0,0.28);
  border: 1px solid rgba(255,255,255,0.08);
  white-space: pre-wrap;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  line-height: 1.35;
  max-height: 220px;
  overflow: auto;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
}
.ecu-meter-report-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 10px;
}
.ecu-meter-report-btn {
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.06);
  color: #eee;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 2px;
}
.ecu-meter-report-btn:hover {
  background: rgba(255,255,255,0.12);
}
.ecu-meter-report-recent {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 8px 12px 10px;
}
`;
