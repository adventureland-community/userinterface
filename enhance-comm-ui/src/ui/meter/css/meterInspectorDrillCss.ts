/** Player drill tabs. */
export const METER_INSPECTOR_DRILL_CSS = `
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
  font-size: var(--meter-fs-secondary);
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
  font-size: var(--meter-fs-secondary) !important;
}
.ecu-meter-row .ecu-meter-vals {
  font-size: var(--meter-fs-secondary) !important;
}
.ecu-meter-body .ecu-meter-icon,
.ecu-meter-row .ecu-meter-icon {
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
  font-size: var(--meter-fs-micro);
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
  /* Fixed rank column (ch, not em) so 10.+ lines up with 1–9 without growing with font-size. */
  grid-template-columns: 2.75ch 1fr auto;
  align-items: center;
  gap: 3px;
  min-height: var(--meter-bar-row-h, 18px);
  height: var(--meter-bar-row-h, 18px);
  padding: 0 4px 0 2px;
  cursor: default;
  font-size: var(--meter-fs-secondary);
  line-height: 1.15;
  color: #fff;
  font-weight: normal;
  text-shadow: none;
  background: transparent;
  border: none;
  overflow: hidden;
  flex: 0 0 auto;
  box-sizing: border-box;
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
.ecu-meter-row.has-skill {
  min-height: var(--meter-bar-row-h, 18px);
  height: var(--meter-bar-row-h, 18px);
}
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
  width: 100%;
  min-width: 0;
  text-align: right;
  box-sizing: border-box;
  z-index: 1;
  font-size: var(--meter-fs-secondary);
  opacity: 1;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 2px 0 0 !important;
  margin: 0 !important;
}
`;

/** Inspector layout, spells, auras, compare, rank bars. */