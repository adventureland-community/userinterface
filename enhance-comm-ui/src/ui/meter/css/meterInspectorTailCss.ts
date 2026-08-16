export const METER_INSPECTOR_TAIL_CSS = `
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
@media (max-width: 640px) {
  .ecu-meter-bd-spells {
    flex-direction: column;
  }
  .ecu-meter-bd-blocks {
    max-width: none;
    border-top: 1px solid var(--meter-border);
  }
  .ecu-meter-bd-auras {
    flex-direction: column;
  }
  .ecu-meter-bd-auras-players {
    display: none;
  }
  .ecu-meter-inspector-top {
    flex-wrap: wrap;
  }
}
`;
