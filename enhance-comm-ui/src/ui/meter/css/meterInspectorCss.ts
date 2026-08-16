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
export const METER_INSPECTOR_MAIN_CSS = `
.ecu-meter-inspector {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  font-size: 14px;
  color: var(--meter-text);
  background: transparent;
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}
.ecu-meter-inspector-layout {
  display: flex;
  flex-direction: row;
  min-height: 0;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}
.ecu-meter-bd-side {
  flex: 0 0 168px;
  width: 168px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 5px 8px;
  background: linear-gradient(180deg, #1a1618 0%, #121014 100%);
  border-right: 1px solid rgba(0, 0, 0, 0.65);
  overflow: hidden;
  min-height: 0;
}
.ecu-meter-bd-side-sec {
  font-size: var(--meter-fs-micro);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c9a227;
  padding: 8px 6px 3px;
  flex-shrink: 0;
}
.ecu-meter-bd-side-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 48px;
  max-height: 42%;
}
.ecu-meter-bd-side-list.is-segments {
  max-height: 28%;
  flex: 0 1 auto;
}
.ecu-meter-bd-side-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.03);
  color: #c8c2b4;
  font-size: var(--meter-fs-body);
  padding: 4px 6px;
  line-height: 1.25;
}
.ecu-meter-bd-side-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.ecu-meter-bd-side-item.is-active {
  background: rgba(255, 220, 80, 0.22);
  border-color: rgba(201, 162, 39, 0.55);
  color: #ffe08a;
}
.ecu-meter-bd-side-item:disabled {
  cursor: default;
  opacity: 0.7;
}
.ecu-meter-bd-side-lab {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-bd-side-amt {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: #8b9bb0;
  font-size: var(--meter-fs-secondary);
}
.ecu-meter-bd-side-item.is-active .ecu-meter-bd-side-amt {
  color: #ffe08a;
}
.ecu-meter-bd-side-empty {
  padding: 6px;
  color: #6a7384;
  font-size: var(--meter-fs-secondary);
}
.ecu-meter-bd-side .ecu-game-icon,
.ecu-meter-bd-side .ecu-meter-icon {
  flex-shrink: 0;
}
.ecu-meter-inspector-top {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px 0;
  border-bottom: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.18);
}
.ecu-meter-inspector-attr {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  padding: 4px 0;
}
.ecu-meter-inspector-attr-text {
  color: #e8eef7;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-inspector-tabs {
  flex-shrink: 0;
  border-bottom: none;
  padding: 0;
  gap: 0;
  background: transparent;
}
.ecu-meter-inspector-tabs .ecu-meter-player-tab {
  font-size: 13px;
  padding: 6px 12px;
  border-bottom: 2px solid transparent;
  margin-bottom: 0;
}
.ecu-meter-inspector-tabs .ecu-meter-player-tab.active {
  color: #ffe08a;
  border-bottom-color: #c9a227;
  background: rgba(201, 162, 39, 0.1);
}
.ecu-meter-inspector .ecu-meter-inspector-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* Details Spells: left = abilities + TARGETS; right = spell blocks (full height) */
.ecu-meter-bd-spells {
  display: flex;
  flex-direction: row;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.ecu-meter-bd-left {
  flex: 1.25;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--meter-border);
}
.ecu-meter-bd-main {
  display: none;
}
.ecu-meter-bd-abilities {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ecu-meter-bd-abilities .ecu-meter-bar-host,
.ecu-meter-bd-targets .ecu-meter-bar-host,
.ecu-meter-bd-auras-players .ecu-meter-bar-host {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}
.ecu-meter-bd-abilities .ecu-meter-row.clickable,
.ecu-meter-bd-abilities .ecu-meter-bar-list,
.ecu-meter-bd-auras-players .ecu-meter-row.clickable {
  cursor: pointer;
}
/* Inspector rank bars — readable density (Details ~20px rows) */
.ecu-meter-bd-abilities .ecu-meter-row,
.ecu-meter-bd-targets .ecu-meter-row,
.ecu-meter-bd-auras-players .ecu-meter-row {
  min-height: 22px;
  height: 22px;
  font-size: 14px;
  text-shadow: none;
  gap: 4px;
  padding: 0 6px 0 3px;
}
.ecu-meter-bd-abilities .ecu-meter-row.has-skill,
.ecu-meter-bd-targets .ecu-meter-row.has-skill,
.ecu-meter-bd-auras-players .ecu-meter-row.has-skill {
  min-height: 24px;
  height: 24px;
}
.ecu-meter-bd-abilities .ecu-meter-row .ecu-meter-who,
.ecu-meter-bd-abilities .ecu-meter-row .ecu-meter-vals,
.ecu-meter-bd-targets .ecu-meter-row .ecu-meter-who,
.ecu-meter-bd-targets .ecu-meter-row .ecu-meter-vals,
.ecu-meter-bd-auras-players .ecu-meter-row .ecu-meter-who,
.ecu-meter-bd-auras-players .ecu-meter-row .ecu-meter-vals {
  font-size: 14px !important;
}
.ecu-meter-bd-abilities .ecu-meter-icon,
.ecu-meter-bd-targets .ecu-meter-icon,
.ecu-meter-bd-auras-players .ecu-meter-icon {
  width: 18px !important;
  height: 18px !important;
}
.ecu-meter-bd-blocks {
  flex: 0.95;
  min-width: 200px;
  max-width: 340px;
  overflow: auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.14);
}
.ecu-meter-bd-blocks-empty {
  justify-content: center;
  align-items: center;
}
.ecu-meter-bd-block {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(18, 20, 26, 0.88);
  padding: 0;
  border-radius: 2px;
  overflow: hidden;
  min-height: 52px;
}
.ecu-meter-bd-block.is-summary {
  border-color: rgba(201, 162, 39, 0.4);
}
.ecu-meter-bd-block.is-crit {
  border-color: rgba(229, 115, 115, 0.4);
}
.ecu-meter-bd-block-fill {
  position: absolute;
  inset: 1px auto 1px 1px;
  background: rgba(110, 110, 120, 0.35);
  pointer-events: none;
  z-index: 0;
}
.ecu-meter-bd-block.is-summary .ecu-meter-bd-block-fill {
  background: rgba(201, 162, 39, 0.16);
}
.ecu-meter-bd-block.is-crit .ecu-meter-bd-block-fill {
  background: rgba(229, 115, 115, 0.22);
}
.ecu-meter-bd-block-body {
  position: relative;
  z-index: 1;
  padding: 7px 9px;
}
.ecu-meter-bd-block-title {
  color: #ffd28a;
  font-size: 13px;
  margin-bottom: 5px;
  text-transform: none;
}
.ecu-meter-bd-block-h {
  color: #ffd28a;
  font-size: 13px;
}
.ecu-meter-bd-block-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: #c5d0e0;
  padding: 2px 0;
  line-height: 1.35;
}
.ecu-meter-bd-block-left,
.ecu-meter-bd-block-right {
  min-width: 0;
}
.ecu-meter-bd-block-right {
  text-align: right;
  flex-shrink: 0;
}
.ecu-meter-bd-block-line b {
  color: #fff;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-bd-block-note,
.ecu-meter-bd-muted,
.ecu-meter-bd-stub {
  color: #8b9bb0;
  font-size: 12px;
  padding: 4px 0 0;
  line-height: 1.35;
}
.ecu-meter-bd-stub {
  padding: 12px 10px;
}
.ecu-meter-bd-targets {
  flex: 0 0 36%;
  min-height: 96px;
  max-height: 42%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 1px solid var(--meter-border);
}
.ecu-meter-bd-targets-h {
  flex-shrink: 0;
  padding: 6px 10px 3px;
  color: #ffd28a;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ecu-meter-bd-targets .ecu-meter-bar-scroll {
  flex: 1;
  min-height: 0;
}
.ecu-meter-bd-auras {
  display: flex;
  flex-direction: row;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.ecu-meter-bd-auras.is-full .ecu-meter-bd-auras-main {
  flex: 1;
  width: 100%;
}
.ecu-meter-bd-auras-players {
  display: none;
}
.ecu-meter-bd-auras-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}
.ecu-meter-bd-auras-col {
  flex: 1;
  min-width: 0;
  overflow: auto;
  border-right: 1px solid var(--meter-border);
  padding-bottom: 8px;
}
.ecu-meter-bd-auras-col:last-child {
  border-right: none;
}
.ecu-meter-bd-auras-col-h {
  padding: 8px 10px 4px;
  color: #ffd28a;
  font-size: 13px;
  letter-spacing: 0.03em;
}
.ecu-meter-bd-auras-note {
  padding: 0 10px 6px;
  color: #8b9bb0;
  font-size: 12px;
}
.ecu-meter-bd-auras-table {
  display: flex;
  flex-direction: column;
}
.ecu-meter-bd-auras-head,
.ecu-meter-uptime-row {
  display: grid;
  grid-template-columns: 1fr 64px 40px 28px 28px;
  gap: 4px;
  padding: 4px 10px;
  align-items: center;
  font-size: 13px;
}
.ecu-meter-bd-auras-head {
  color: #ffd28a;
  border-bottom: 1px solid var(--meter-border);
  font-size: 12px;
  letter-spacing: 0.02em;
}
.ecu-meter-uptime-row {
  color: #c5d0e0;
}
.ecu-meter-uptime-row.is-alt {
  background: rgba(255, 255, 255, 0.03);
}
.ecu-meter-uptime-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-uptime-ico {
  flex: 0 0 auto;
}
.ecu-meter-uptime-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-uptime-time {
  color: #ffe08a;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-uptime-pct,
.ecu-meter-uptime-apps,
.ecu-meter-uptime-ref {
  font-variant-numeric: tabular-nums;
  color: #8b9bb0;
  text-align: center;
}
.ecu-meter-uptime-pct {
  color: #e8eef7;
}
.ecu-meter-inspector-compare {
  display: flex;
  gap: 1px;
  min-height: 0;
  height: 100%;
  overflow: auto;
  background: var(--meter-border);
}
.ecu-meter-inspector-compare-col {
  flex: 1;
  min-width: 0;
  background: #12141a;
  padding: 8px 10px;
  overflow: auto;
}
.ecu-meter-inspector-compare-col.is-you {
  background: rgba(201, 162, 39, 0.07);
}
.ecu-meter-inspector-compare-col.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ecu-meter-inspector-compare-empty {
  color: #8b9bb0;
  font-size: 12px;
  text-align: center;
  padding: 12px;
  line-height: 1.35;
}
.ecu-meter-inspector-compare-h {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #e8eef7;
  margin-bottom: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--meter-border);
}
.ecu-meter-inspector-compare-stat {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  padding: 2px 0;
  color: #c5d0e0;
}
.ecu-meter-inspector-compare-stat b {
  color: #ffd28a;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-inspector-compare-diff {
  font-size: 12px;
  margin: 4px 0 8px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-inspector-compare-diff.is-up { color: #81c784; }
.ecu-meter-inspector-compare-diff.is-down { color: #e57373; }
.ecu-meter-inspector-compare-diff.is-self { color: #8b9bb0; }
.ecu-meter-inspector-compare-spells-h {
  font-size: 11px;
  color: #ffd28a;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 10px 0 4px;
}
.ecu-meter-inspector-compare-spell {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
  min-height: 20px;
  padding: 2px 4px;
  margin-bottom: 2px;
  font-size: 12px;
  color: #c5d0e0;
  overflow: hidden;
}
.ecu-meter-inspector-compare-spell.is-missing {
  min-height: 18px;
  opacity: 0.25;
}
.ecu-meter-inspector-compare-spell-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(140, 140, 150, 0.28);
  pointer-events: none;
}
.ecu-meter-inspector-compare-col.is-you .ecu-meter-inspector-compare-spell-fill {
  background: rgba(201, 162, 39, 0.22);
}
.ecu-meter-inspector-compare-spell-n,
.ecu-meter-inspector-compare-spell-v {
  position: relative;
  z-index: 1;
}
.ecu-meter-inspector-compare-spell-n {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-inspector-compare-spell-v {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: #fff;
}
.ecu-meter-inspector-compare-pct.is-up { color: #81c784; }
.ecu-meter-inspector-compare-pct.is-down { color: #e57373; }
.ecu-meter-inspector-compare-pct.is-flat { color: #8b9bb0; }
.ecu-meter-encounter {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  font-size: 12px;
  color: var(--meter-text);
}
`;

/** Inspector leftover + death recap + narrow-layout media. */
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
