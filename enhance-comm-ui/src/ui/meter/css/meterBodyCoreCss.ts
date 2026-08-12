/** Body, bars, inspector, report, encounter widgets. */
export const METER_BODY_CORE_CSS = `
.ecu-meter-report-mark {
  color: var(--meter-accent);
  font-size: 11px;
  line-height: 1;
  flex-shrink: 0;
  opacity: 0.95;
}
.ecu-meter-inspector-class {
  display: inline-block;
  width: 4px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 1px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.55);
}
.ecu-meter-inspector-sub {
  color: var(--meter-muted);
  font-weight: 400;
  font-size: 10px;
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ecu-meter-shell.is-inspector .ecu-meter-player-tabs {
  background: #161a22;
  border-bottom: 1px solid rgba(0,0,0,0.55);
  padding: 0 4px;
}
.ecu-meter-shell.is-inspector .ecu-meter-player-tab {
  font-size: 12px;
  padding: 5px 10px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.ecu-meter-shell.is-inspector .ecu-meter-player-tab.active {
  color: #ffe08a;
  border-bottom-color: #c9a227;
  background: rgba(201, 162, 39, 0.08);
}
.ecu-meter-shell.is-inspector .ecu-meter-inspector-body {
  background: #12141a;
}
.ecu-meter-shell.is-inspector .ecu-meter-status,
.ecu-meter-shell.is-report .ecu-meter-status {
  border-radius: 0;
  border-bottom: none;
}
.ecu-meter-shell.is-report .ecu-meter-report-tabs {
  background: rgba(0, 0, 0, 0.22);
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  padding: 0 2px;
}
.ecu-meter-shell.is-report .ecu-meter-report-tab {
  flex: 1;
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--meter-muted);
  padding: 4px 8px;
  font-size: 12px;
  margin-bottom: -1px;
}
.ecu-meter-shell.is-report .ecu-meter-report-tab:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}
.ecu-meter-shell.is-report .ecu-meter-report-tab.active {
  color: #ffe08a;
  border-bottom-color: #c9a227;
  background: rgba(201, 162, 39, 0.1);
}
.ecu-meter-report-tabs {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  border: 1px solid var(--meter-border);
  border-top: none;
  border-bottom: none;
  background: var(--meter-panel-2);
}
.ecu-meter-report-tab {
  flex: 1;
  cursor: pointer;
  background: transparent;
  border: none;
  border-right: 1px solid var(--meter-border);
  color: var(--meter-muted);
  padding: 4px 6px;
  font-size: 14px;
}
.ecu-meter-report-tab:last-child { border-right: none; }
.ecu-meter-report-tab:hover { color: var(--meter-text); background: rgba(255,255,255,0.05); }
.ecu-meter-report-tab.active {
  color: var(--meter-accent);
  background: rgba(201, 162, 39, 0.12);
}
@media (hover: none), (pointer: coarse) {
  .ecu-meter-chrome-hover {
    opacity: 1;
    pointer-events: auto;
  }
}
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
/* Player drill tabs */
.ecu-meter-player-breakdown {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.ecu-meter-player-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.ecu-meter-player-tab {
  cursor: pointer;
  border: none;
  background: transparent;
  color: #9aa;
  padding: 3px 8px;
  font-size: 11px;
}
.ecu-meter-player-tab:hover {
  color: #eee;
}
.ecu-meter-player-tab.active {
  color: #ffd28a;
  border-bottom: 1px solid #c9a227;
}
.ecu-meter-player-summary .stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 10px;
  padding: 8px;
  font-size: 12px;
}
.ecu-meter-player-summary .stat-grid b {
  color: #ffd28a;
  font-weight: normal;
}
.ecu-meter-row .ecu-meter-who {
  font-size: 11px !important;
}
.ecu-meter-row .ecu-meter-vals {
  font-size: 11px !important;
}
.ecu-meter-icon {
  width: 14px !important;
  height: 14px !important;
}
.ecu-meter-body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  position: relative;
  padding: 0;
  background: var(--meter-panel);
  scrollbar-width: thin;
  scrollbar-color: rgba(180,180,180,0.35) transparent;
}
.ecu-meter-status {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 8px;
  border: none;
  border-radius: 0;
  color: var(--meter-muted);
  font-size: 11px;
  background: rgba(40, 44, 50, 0.7);
  flex-shrink: 0;
}
.ecu-meter-status.is-clickable {
  cursor: pointer;
}
.ecu-meter-status.is-clickable:hover {
  color: var(--meter-text);
}
.ecu-meter-bar-list { display: flex; flex-direction: column; }
.ecu-meter-row {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 3px;
  min-height: 16px;
  height: 16px;
  padding: 0 4px 0 2px;
  cursor: default;
  font-size: 11px;
  color: #fff;
  font-weight: normal;
  text-shadow: 1px 1px 0 #000, -1px 0 0 rgba(0,0,0,0.55);
  background: transparent;
  border: none;
}
.ecu-meter-row.clickable { cursor: pointer; }
.ecu-meter-row:nth-child(even) { background: transparent; }
.ecu-meter-row:hover { filter: brightness(1.12); }
.ecu-meter-row.you { box-shadow: inset 2px 0 0 var(--meter-you); }
.ecu-meter-row.is-selected { box-shadow: inset 2px 0 0 var(--meter-accent); }
.ecu-meter-splash-hint {
  color: #d4a017;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  opacity: 0.92;
}
.ecu-meter-row.has-skill { min-height: 18px; height: 18px; }
.ecu-meter-row:last-child {
  border-radius: 0 0 2px 2px;
}
.ecu-meter-row .ecu-meter-fill {
  position: absolute;
  inset: 0 auto 0 0;
  opacity: 0.78;
  pointer-events: none;
  border-radius: 0;
}
.ecu-meter-row:last-child .ecu-meter-fill {
  border-radius: 0 0 0 2px;
}
.ecu-meter-row .ecu-meter-rank {
  color: #fff;
  font-variant-numeric: tabular-nums;
  width: 16px;
  z-index: 1;
  font-size: 11px;
  opacity: 1;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
}
/* Avoid AL global .name styles — use ecu-meter-who */
.ecu-meter-row .ecu-meter-who,
.ecu-meter-row .ecu-meter-label,
.ecu-meter-row .ecu-meter-vals {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  text-shadow: inherit !important;
  font-weight: normal !important;
  padding: 0 !important;
  margin: 0 !important;
}
.ecu-meter-row .ecu-meter-who {
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
  font-size: 12px;
  color: var(--meter-text);
}
.ecu-meter-row .ecu-meter-label {
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
  font-size: inherit;
  line-height: 1.15;
}
.ecu-meter-row.clickable:hover .ecu-meter-label { text-decoration: underline; }
.ecu-meter-row .ecu-meter-vals {
  z-index: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  font-size: 11px;
  color: #fff;
}
.ecu-meter-row .ecu-meter-pct { color: var(--meter-text); opacity: 0.75; }
.ecu-meter-icon {
  display: inline-block;
  flex-shrink: 0;
  background: #0a0c10;
  border: 1px solid #1a2230;
  border-radius: 2px;
  overflow: hidden;
  vertical-align: middle;
  text-align: center;
  font-size: 11px;
  color: #ccc;
}
.ecu-meter-icon-clip { display: block; overflow: hidden; }
.ecu-meter-icon-clip img { display: block; max-width: none; image-rendering: pixelated; }
.ecu-meter-tt {
  position: fixed;
  z-index: 10000;
  max-width: 300px;
  background: #121820;
  border: 1px solid #3d4d63;
  border-radius: 4px;
  padding: 8px 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.45);
  pointer-events: none;
  font-size: 14px;
  color: #e8eef7;
  line-height: 1.35;
}
.ecu-meter-tt h4 { margin: 0 0 6px; font-size: 15px; color: #fff; font-weight: normal; }
.ecu-meter-tt .line { display: flex; justify-content: space-between; gap: 12px; }
.ecu-meter-tt .sec { margin-top: 6px; color: #8b9bb4; font-size: 11px; text-transform: uppercase; }
.ecu-meter-tt ul { margin: 2px 0 0; padding: 0; list-style: none; }
.ecu-meter-tt li { display: flex; justify-content: space-between; gap: 10px; }
.ecu-meter-inspector {
  display: flex;
  flex-direction: row;
  min-height: 0;
  height: 100%;
  font-size: 12px;
  color: var(--meter-text);
  background: transparent;
}
.ecu-meter-inspector .ecu-meter-inspector-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.ecu-meter-inspector-tabs-rail {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 72px;
  border-left: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.18);
}
.ecu-meter-inspector-tabs-rail .ecu-meter-player-tab {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 6px;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: transparent;
  color: var(--meter-muted);
  font-size: 11px;
  cursor: pointer;
}
.ecu-meter-inspector-tabs-rail .ecu-meter-player-tab:hover {
  color: var(--meter-text);
  background: rgba(255, 255, 255, 0.04);
}
.ecu-meter-inspector-tabs-rail .ecu-meter-player-tab.active {
  color: #ffe08a;
  background: rgba(201, 162, 39, 0.12);
  box-shadow: inset -2px 0 0 #c9a227;
  border-bottom-color: transparent;
}
.ecu-meter-inspector-compare {
  display: flex;
  gap: 1px;
  min-height: 0;
  overflow: auto;
  background: var(--meter-border);
}
.ecu-meter-inspector-compare-col {
  flex: 1;
  min-width: 0;
  background: #12141a;
  padding: 6px 8px;
}
.ecu-meter-inspector-compare-col.is-you {
  background: rgba(201, 162, 39, 0.06);
}
.ecu-meter-inspector-compare-h {
  font-size: 12px;
  color: #e8eef7;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--meter-border);
}
.ecu-meter-inspector-compare-stat {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  padding: 2px 0;
  color: #c5d0e0;
}
.ecu-meter-inspector-compare-stat b {
  color: #ffd28a;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-encounter {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  font-size: 12px;
  color: var(--meter-text);
}
.ecu-meter-encounter-tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.15);
}
.ecu-meter-encounter-tab {
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--meter-muted);
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.ecu-meter-encounter-tab:hover {
  color: var(--meter-text);
}
.ecu-meter-encounter-tab.active {
  color: #ffe08a;
  border-bottom-color: #c9a227;
  background: rgba(201, 162, 39, 0.08);
}
.ecu-meter-encounter-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px;
}
.ecu-meter-encounter-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 11px;
  color: #8b9bb4;
  margin-bottom: 6px;
}
.ecu-meter-encounter-stats b {
  color: #c5d0e0;
}
.ecu-meter-encounter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.ecu-meter-encounter-widget {
  border: 1px solid #2a3545;
  background: #0e1218;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ecu-meter-encounter-widget-h {
  padding: 3px 6px;
  font-size: 10px;
  color: #8b9bb4;
  border-bottom: 1px solid #2a3545;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-encounter-widget-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.ecu-meter-timeline {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 4px;
  font-size: 11px;
}
.ecu-meter-timeline-tools {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.ecu-meter-timeline-meta {
  color: #666;
  margin-left: 4px;
  font-size: 10px;
}
.ecu-meter-timeline-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  max-height: 260px;
}
.ecu-meter-timeline-lane {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.ecu-meter-timeline-name {
  width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #aaa;
  flex-shrink: 0;
}
.ecu-meter-timeline-track {
  position: relative;
  flex: 1;
  height: 14px;
  background: #1a1a1a;
  border: 1px solid #333;
}
.ecu-meter-timeline-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 1px;
  min-width: 2px;
}
.ecu-meter-timeline-death {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e53935;
  z-index: 2;
  pointer-events: none;
  box-shadow: 0 0 4px rgba(229, 57, 53, 0.6);
}
.ecu-meter-inspector .ecu-meter-inspector-spell {
  padding: 2px 8px;
  font-size: 12px;
  color: #8b9bb0;
  flex-shrink: 0;
}
.ecu-meter-inspector .ecu-meter-inspector-summary .stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 10px;
  padding: 8px;
  font-size: 12px;
}
.ecu-meter-inspector .sec-h {
  font-size: 11px;
  color: var(--meter-muted);
  margin: 4px 8px 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-inspector .stat-grid b { color: #ffd28a; font-weight: normal; }
.ecu-meter-shell .ecu-meter-tab {
  cursor: pointer;
  font-size: 12px;
  padding: 3px 8px;
  border: 1px solid var(--meter-border);
  background: var(--meter-panel-2);
  color: var(--meter-text);
  border-radius: 2px;
}
.ecu-meter-shell .ecu-meter-tab.active {
  border-color: var(--meter-accent);
  background: rgba(201, 162, 39, 0.12);
  color: var(--meter-accent);
}
.ecu-meter-outcome {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
.ecu-meter-outcome th,
.ecu-meter-outcome td {
  padding: 4px 6px;
  border-bottom: 1px solid var(--meter-border);
  text-align: right;
}
.ecu-meter-outcome th:first-child,
.ecu-meter-outcome td:first-child { text-align: left; }
.ecu-meter-death {
  display: flex;
  gap: 0;
  height: 100%;
  min-height: 200px;
}
.ecu-meter-death-side {
  width: 132px;
  flex-shrink: 0;
  overflow: auto;
  border-right: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.15);
}
.ecu-meter-death-side button {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  padding: 8px 6px;
  border: none;
  border-bottom: 1px solid var(--meter-border);
  background: transparent;
  color: var(--meter-text);
  font-size: 13px;
  line-height: 1.25;
}
.ecu-meter-death-side button.active {
  background: rgba(229, 57, 53, 0.12);
  color: #ffcdd2;
  box-shadow: inset 3px 0 0 #e53935;
}
.ecu-meter-death-side-num {
  display: block;
  font-size: 10px;
  color: var(--meter-muted);
  font-variant-numeric: tabular-nums;
}
.ecu-meter-death-side-time {
  display: block;
  font-size: 10px;
  color: var(--meter-muted);
  margin-top: 2px;
}
.ecu-meter-death-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 6px 8px;
  gap: 8px;
}
.ecu-meter-death-hdr {
  flex-shrink: 0;
  border-bottom: 1px solid var(--meter-border);
  padding-bottom: 6px;
}
.ecu-meter-death-victim {
  font-size: 15px;
  font-weight: bold;
  color: #ffe0e8;
}
.ecu-meter-death-meta {
  font-size: 11px;
  color: var(--meter-muted);
  margin-top: 2px;
}
.ecu-meter-death-killer {
  font-size: 12px;
  color: #c5d0e0;
  margin-top: 4px;
}
.ecu-meter-death-killer b {
  color: #ef9a9a;
  font-weight: normal;
}
.ecu-meter-death-chart {
  flex-shrink: 0;
}
.ecu-meter-death-chart .sec-h,
.ecu-meter-death-sources .sec-h,
.ecu-meter-death-log .sec-h {
  margin-bottom: 4px;
}
.ecu-meter-death-sources {
  flex-shrink: 0;
}
.ecu-meter-death-source {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 2px 0;
}
.ecu-meter-death-source-icon {
  width: 16px;
  text-align: center;
}
.ecu-meter-death-source-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c5d0e0;
  max-width: 120px;
}
.ecu-meter-death-source-bar {
  width: 72px;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 1px;
  overflow: hidden;
}
.ecu-meter-death-source-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #c62828, #ef5350);
}
.ecu-meter-death-source-amt {
  font-variant-numeric: tabular-nums;
  color: #ef9a9a;
  min-width: 36px;
  text-align: right;
}
.ecu-meter-death-log {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ecu-meter-death-log-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 4px;
}
.ecu-meter-death-filters {
  display: flex;
  gap: 2px;
}
.ecu-meter-death-filter {
  cursor: pointer;
  padding: 2px 8px;
  border: 1px solid var(--meter-border);
  background: transparent;
  color: var(--meter-muted);
  font-size: 11px;
}
.ecu-meter-death-filter.active {
  background: rgba(201, 162, 39, 0.12);
  color: var(--meter-accent);
  border-color: rgba(201, 162, 39, 0.35);
}
.ecu-meter-death-log-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.12);
  font-size: 12px;
}
.ecu-meter-death-log-empty {
  padding: 12px;
  color: var(--meter-muted);
  text-align: center;
}
.ecu-meter-death-hit {
  display: grid;
  grid-template-columns: 52px 1fr auto;
  gap: 6px;
  align-items: center;
  padding: 3px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-variant-numeric: tabular-nums;
}
.ecu-meter-death-hit.has-life {
  grid-template-columns: 52px 1fr auto auto;
}
.ecu-meter-death-hit-life {
  font-size: 10px;
  color: #ef9a9a;
  min-width: 32px;
  text-align: right;
}
.ecu-meter-death-hit-rel {
  color: var(--meter-muted);
  font-size: 11px;
}
.ecu-meter-death-hit-src {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c5d0e0;
}
.ecu-meter-death-hit-actor {
  color: var(--meter-muted);
}
.ecu-meter-death-hit-amt {
  font-weight: bold;
  min-width: 40px;
  text-align: right;
}
.ecu-meter-death-hit.is-dmg .ecu-meter-death-hit-amt {
  color: #ef9a9a;
}
.ecu-meter-death-hit.is-heal .ecu-meter-death-hit-amt {
  color: #81c784;
}
.ecu-meter-shell.is-report .ecu-meter-death {
  min-height: 0;
}
@media (max-width: 520px) {
  .ecu-meter-inspector { grid-template-columns: 1fr; }
}
`;
