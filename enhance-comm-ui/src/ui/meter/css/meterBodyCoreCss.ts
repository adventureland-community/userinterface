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
  height: 16px;
  flex-shrink: 0;
  border-radius: 1px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.55);
}
.ecu-meter-inspector-portrait {
  flex-shrink: 0;
  margin-right: 2px;
}
.ecu-meter-inspector-portrait .ecu-meter-icon,
.ecu-meter-inspector-portrait .ecu-meter-icon-character {
  width: 40px !important;
  height: 40px !important;
}
.ecu-meter-inspector-ctype {
  font-weight: 400;
  text-transform: lowercase;
}
.ecu-meter-inspector-sub {
  color: var(--meter-muted);
  font-weight: 400;
  font-size: 12px;
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
.ecu-meter-report-layout {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  background: #0e1014;
}
.ecu-meter-report-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
.ecu-meter-plugin-rail {
  flex: 0 0 128px;
  width: 128px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 5px;
  background: linear-gradient(180deg, #1a1618 0%, #121014 100%);
  border-right: 1px solid rgba(0, 0, 0, 0.65);
  overflow-y: auto;
  overflow-x: hidden;
}
.ecu-meter-plugin-rail-sec {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8a7a5a;
  padding: 8px 6px 3px;
}
.ecu-meter-plugin-rail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: #c8c2b4;
  font-size: 13px;
  padding: 6px 6px;
  line-height: 1.25;
}
.ecu-meter-plugin-rail-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.ecu-meter-plugin-rail-item.is-active {
  background: rgba(201, 162, 39, 0.16);
  border-color: rgba(201, 162, 39, 0.45);
  color: #ffe08a;
}
.ecu-meter-plugin-rail-item.is-muted {
  cursor: default;
  opacity: 0.55;
}
.ecu-meter-plugin-rail-ico {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-size: 12px;
  color: #c9a227;
}
.ecu-meter-plugin-rail-lab {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Legacy top tabs kept for any external/mock consumers */
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
.ecu-meter-icon-monster {
  flex-shrink: 0;
}
.ecu-meter-icon-monster > * {
  margin: 0 !important;
}
/* Details GameCooltip-ish hover tip (bars, timeline, Spells/Targets).
 * Shared --meter-tt-* vars: body ≥16px, icons 22px (see METER_TT_ICON). */
.ecu-meter-tt {
  --meter-tt-body: 16px;
  --meter-tt-title: 17px;
  --meter-tt-sec: 15px;
  --meter-tt-kbd: 13px;
  --meter-tt-foot: 13px;
  --meter-tt-icon: 22px;
  --meter-tt-pad-y: 12px;
  --meter-tt-pad-x: 14px;
  --meter-tt-row-pad-y: 4px;
  --meter-tt-row-pad-x: 8px;
  --meter-tt-gap: 8px;
  position: fixed;
  z-index: 10000;
  min-width: 300px;
  max-width: 460px;
  background: rgba(12, 14, 18, 0.94);
  border: 1px solid rgba(210, 210, 220, 0.28);
  border-radius: 2px;
  padding: var(--meter-tt-pad-y) var(--meter-tt-pad-x);
  box-shadow: 0 8px 28px rgba(0,0,0,0.55);
  pointer-events: none;
  font-size: var(--meter-tt-body);
  color: #e8eef7;
  line-height: 1.45;
  font-weight: normal;
  text-shadow: none;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.ecu-meter-tt h4 {
  margin: 0 0 8px;
  font-size: var(--meter-tt-title);
  color: #fff;
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: var(--meter-tt-gap);
}
/* Beat global .ecu-meter-icon { 14px !important } — bar rows stay 14px. */
.ecu-meter-tt .ecu-meter-icon,
.ecu-meter-tt .ecu-meter-icon-clip {
  width: var(--meter-tt-icon) !important;
  height: var(--meter-tt-icon) !important;
}
.ecu-meter-tt .ecu-meter-icon {
  font-size: 13px;
  line-height: var(--meter-tt-icon) !important;
}
.ecu-meter-tt .ecu-meter-icon-class {
  font-size: 12px;
  font-weight: 700;
}
.ecu-meter-tt .line {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: #c8d0dc;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt .line span { color: #ffe08a; }
.ecu-meter-tt .line b { color: #fff; font-weight: normal; }
.ecu-meter-tt .sec {
  margin-top: 10px;
  color: #8b9bb4;
  font-size: var(--meter-tt-sec);
  text-transform: uppercase;
}
.ecu-meter-tt ul { margin: 4px 0 0; padding: 0; list-style: none; }
.ecu-meter-tt li { display: flex; justify-content: space-between; gap: 14px; }
/* Time Line cooltip: hovered icon + nearby cluster (on-screen, ~2s).
   Compact chrome shared by gear + CD/buff/debuff/death. */
.ecu-meter-tt.is-tl-cluster,
.ecu-meter-tt.is-gear-tip,
.ecu-meter-tt.is-tl-ev-tip {
  padding: 10px 12px;
  line-height: 1.3;
}
.ecu-meter-tt.is-gear-tip {
  min-width: 300px;
  max-width: 440px;
}
.ecu-meter-tt.is-tl-ev-tip {
  min-width: 260px;
  max-width: 380px;
}
.ecu-meter-tt-tl-cat {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c9b878;
  margin-bottom: 2px;
}
.ecu-meter-tt-tl-cat.is-gear {
  color: #e8b84a;
  margin-bottom: 4px;
}
.ecu-meter-tt-cluster-meta,
.ecu-meter-tt-gear-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt-cluster-who,
.ecu-meter-tt-gear-who {
  color: #fff;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-tt-cluster-when,
.ecu-meter-tt-gear-when {
  flex: 0 0 auto;
  color: #c8d0dc;
  white-space: nowrap;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-gear {
  --meter-tt-icon: 26px;
}
.ecu-meter-tt-gear-list,
.ecu-meter-tt-evs-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ecu-meter-tt-gear-row {
  display: grid;
  grid-template-columns: 76px 72px minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 5px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.ecu-meter-tt-gear-row:first-child {
  border-top: none;
  padding-top: 2px;
}
.ecu-meter-tt-gear-row.is-muted,
.ecu-meter-tt-ev-row.is-muted {
  opacity: 0.78;
}
.ecu-meter-tt-gear-slot {
  font-size: 12px;
  letter-spacing: 0.03em;
  color: #e8b84a;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-meter-tt-gear-icos {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}
.ecu-meter-tt-gear-icos.is-single {
  min-width: calc(var(--meter-tt-icon) + 4px);
  justify-content: center;
}
.ecu-meter-tt-gear-arrow {
  flex: 0 0 auto;
  color: #e8b84a;
  font-size: 14px;
  line-height: 1;
}
.ecu-meter-tt-gear-arrow-sm {
  flex: 0 0 auto;
  color: #8b9bb4;
  font-size: 11px;
  line-height: 1;
}
.ecu-meter-tt-gear-names {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: #fff;
  font-size: var(--meter-tt-sec);
  line-height: 1.2;
}
.ecu-meter-tt-gear-names .is-old,
.ecu-meter-tt-gear-names .is-new {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-tt-gear-verb {
  color: #e8b84a;
  font-weight: 600;
  flex: 0 0 auto;
}
.ecu-meter-tt-gear-row-at {
  grid-column: 1 / -1;
  font-size: 11px;
  color: #8b9bb4;
  padding-left: 0;
}
.ecu-meter-tt-gear-empty {
  display: inline-block;
  box-sizing: border-box;
  border: 1px dashed rgba(255, 255, 255, 0.28);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.25);
  vertical-align: middle;
}
.ecu-meter-tt-gear-row.is-muted .ecu-meter-tt-gear-slot,
.ecu-meter-tt-gear-row.is-muted .ecu-meter-tt-gear-arrow,
.ecu-meter-tt-gear-row.is-muted .ecu-meter-tt-gear-verb {
  color: #c9b878;
}
/* Dense CD / buff / debuff / death rows — pill + icon + name, not stacked cards. */
.ecu-meter-tt-ev-row {
  display: grid;
  grid-template-columns: 22px var(--meter-tt-icon) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 6px;
  padding: 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.ecu-meter-tt-ev-row:first-child {
  border-top: none;
  padding-top: 2px;
}
.ecu-meter-tt-ev-row.is-primary {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  margin: 0 -4px;
  padding-left: 4px;
  padding-right: 4px;
}
.ecu-meter-tt-ev-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 14px;
  border-radius: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  text-transform: uppercase;
  flex: 0 0 auto;
}
.ecu-meter-tt-ev-pill.is-cd {
  background: rgba(60, 180, 255, 0.88);
  color: #061018;
}
.ecu-meter-tt-ev-pill.is-buff {
  background: rgba(48, 196, 72, 0.88);
  color: #061008;
}
.ecu-meter-tt-ev-pill.is-debuff {
  background: rgba(230, 72, 72, 0.92);
  color: #140808;
}
.ecu-meter-tt-ev-pill.is-death {
  background: rgba(210, 210, 220, 0.78);
  color: #1a1214;
}
.ecu-meter-tt-ev-pill.is-gear {
  background: rgba(232, 184, 74, 0.9);
  color: #1a1408;
}
.ecu-meter-tt-ev-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.ecu-meter-tt-ev-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  color: #fff;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-ev-elapsed {
  flex: 0 0 auto;
  color: #8b9bb4;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-tt-ev-at {
  flex: 0 0 auto;
  color: #8b9bb4;
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-tt-div {
  height: 1px;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.12);
}
.ecu-meter-tt-sec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 6px;
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 2px;
}
.ecu-meter-tt-sec.is-max {
  background: rgba(201, 162, 39, 0.18);
}
.ecu-meter-tt-sec-l {
  display: inline-flex;
  align-items: center;
  gap: var(--meter-tt-gap);
  min-width: 0;
}
.ecu-meter-tt-sec-ico {
  font-size: var(--meter-tt-sec);
  line-height: 1;
  opacity: 0.9;
}
.ecu-meter-tt-sec-t {
  color: #ffe08a;
  font-size: var(--meter-tt-sec);
  font-weight: normal;
}
.ecu-meter-tt-kbd {
  flex-shrink: 0;
  font-size: var(--meter-tt-kbd);
  color: #a8b0bc;
  background: rgba(80, 88, 100, 0.55);
  border: 1px solid rgba(160, 168, 180, 0.35);
  border-radius: 999px;
  padding: 3px 10px;
  letter-spacing: 0.02em;
}
.ecu-meter-tt-sec.is-max .ecu-meter-tt-kbd {
  color: #1a1a1a;
  background: #ffe08a;
  border-color: #c9a227;
}
.ecu-meter-tt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  border-radius: 1px;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt-row.is-alt {
  background: rgba(255, 255, 255, 0.045);
}
.ecu-meter-tt-row-l {
  display: inline-flex;
  align-items: center;
  gap: var(--meter-tt-gap);
  min-width: 0;
  flex: 1;
}
.ecu-meter-tt-name {
  color: #f2f4f8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-meter-tt-amt {
  flex-shrink: 0;
  color: #ffe08a;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.ecu-meter-tt-empty {
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  color: #7a8494;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #8b9bb4;
  font-size: var(--meter-tt-foot);
}
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
  font-size: 11px;
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
  font-size: 12px;
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
  font-size: 11px;
}
.ecu-meter-bd-side-item.is-active .ecu-meter-bd-side-amt {
  color: #ffe08a;
}
.ecu-meter-bd-side-empty {
  padding: 6px;
  color: #6a7384;
  font-size: 11px;
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
  overflow: auto;
}
.ecu-meter-bd-abilities .ecu-meter-bar-host,
.ecu-meter-bd-targets .ecu-meter-bar-host,
.ecu-meter-bd-auras-players .ecu-meter-bar-host {
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
/* Legacy encounter nested-tab chrome — Summary panes live in meterViewsCss. */
.ecu-meter-encounter-tabs {
  display: none;
}
.ecu-meter-timeline {
  /* Details CONST_ROW_HEIGHT=18 / icon~14; AL sprites need more room. */
  --tl-row: 36px;
  --tl-icon: 28px;
  /* All multi-lane: ~TL_SUB_ROW (26) minus padding — keep readable. */
  --tl-icon-sub: 20px;
  --tl-class: 20px;
  --tl-name-w: 132px;
  --tl-ruler-h: 38px;
  --tl-pad: 0px;
  --tl-content-w: 100%;
  --tl-track-w: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0;
  font-size: 14px;
  line-height: 1.2;
  background: #101218;
  color: #cfd8dc;
  cursor: default;
}
.ecu-meter-timeline-hd {
  flex-shrink: 0;
  padding: 8px 10px 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  background: linear-gradient(180deg, rgba(36, 30, 28, 0.95) 0%, rgba(18, 16, 18, 0.98) 100%);
}
.ecu-meter-timeline-mark {
  font-size: 14px;
  letter-spacing: 0.03em;
  color: rgb(227, 186, 4);
  margin-bottom: 6px;
  user-select: none;
}
.ecu-meter-timeline-tools {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.ecu-meter-tl-mode {
  cursor: pointer;
  border: 1px solid rgba(80, 70, 55, 0.7);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.35);
  color: #b0a890;
  font-size: 13px;
  padding: 4px 10px;
}
.ecu-meter-tl-mode:hover {
  color: #fff;
  border-color: rgba(201, 162, 39, 0.5);
}
.ecu-meter-tl-mode.is-active {
  color: #ffe08a;
  background: rgba(201, 162, 39, 0.18);
  border-color: rgba(201, 162, 39, 0.65);
}
.ecu-meter-timeline-meta {
  color: #8b9bb4;
  margin-left: 6px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-timeline-meta [data-tl-wall] {
  color: #6d7a92;
}
.ecu-meter-timeline-meta [data-tl-scale] {
  margin-left: 8px;
  color: #6d7a92;
}
/* Bar color legend — AL: green=buff, blue=CD, red=debuff. */
.ecu-meter-tl-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 6px;
  font-size: 12px;
  color: #8b9bb4;
  user-select: none;
}
.ecu-meter-tl-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ecu-meter-tl-legend-swatch {
  width: 14px;
  height: 8px;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}
.ecu-meter-tl-legend-item.is-cd .ecu-meter-tl-legend-swatch {
  background: rgba(60, 180, 255, 0.45);
}
.ecu-meter-tl-legend-item.is-buff .ecu-meter-tl-legend-swatch {
  background: rgba(0, 255, 0, 0.35);
}
.ecu-meter-tl-legend-item.is-debuff .ecu-meter-tl-legend-swatch {
  background: rgba(255, 0, 0, 0.35);
}
.ecu-meter-tl-legend-item.is-gear .ecu-meter-tl-legend-swatch {
  background: rgba(255, 176, 32, 0.85);
}
.ecu-meter-tl-legend-item.is-death .ecu-meter-tl-legend-swatch {
  width: 4px;
  height: 10px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(220, 40, 40, 0.85);
  box-shadow: 0 0 3px rgba(229, 57, 53, 0.5);
}
.ecu-meter-tl-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
.ecu-meter-tl-gutter {
  flex: 0 0 var(--tl-name-w);
  width: var(--tl-name-w);
  min-width: var(--tl-name-w);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #2a3140;
  background: rgba(10, 10, 12, 0.96);
  z-index: 4;
}
.ecu-meter-tl-gutter-ruler {
  flex-shrink: 0;
  height: var(--tl-ruler-h);
  min-height: var(--tl-ruler-h);
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  padding: 0 8px;
  border-bottom: 1px solid #2a3140;
  background: #12141a;
  user-select: none;
}
.ecu-meter-tl-gutter-axis-lab {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #a8b4c8;
}
.ecu-meter-tl-gutter-axis-lab.is-clock {
  color: #6d7a92;
}
.ecu-meter-tl-gutter-rows {
  flex: 1;
  will-change: transform;
  transform: translateZ(0);
}
.ecu-meter-tl-gutter-lane {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--tl-row);
  min-height: var(--tl-row);
  max-height: var(--tl-row);
  padding: 0 8px;
  overflow: hidden;
  border-bottom: 1px solid rgba(42, 49, 64, 0.55);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.15;
  background: rgba(10, 10, 12, 0.92);
}
.ecu-meter-tl-gutter-lane.is-alt {
  background: rgba(16, 18, 24, 0.96);
}
.ecu-meter-tl-gutter-lane:hover {
  background: rgba(36, 38, 44, 0.96);
}
.ecu-meter-tl-gutter-lane.is-selected {
  background: rgba(40, 34, 18, 0.96);
}
.ecu-meter-tl-gutter-empty {
  height: var(--tl-row);
}
.ecu-meter-tl-scroll {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  max-height: none;
  overscroll-behavior-x: contain;
  scroll-behavior: auto;
}
/* Track canvas — pad + content; follow-now pins “now” on the right. */
.ecu-meter-tl-canvas {
  position: relative;
  width: var(--tl-track-w);
  min-width: 100%;
  max-width: none;
  box-sizing: border-box;
}
/* Live-only playhead at content “now” (may sit at viewport right while
   following). Not rendered post-combat — see MeterTimelineView. */
.ecu-meter-tl-now {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--tl-pad) + var(--tl-content-w));
  width: 2px;
  margin-left: -1px;
  background: rgba(227, 186, 4, 0.9);
  box-shadow: 0 0 6px rgba(227, 186, 4, 0.45);
  pointer-events: none;
  z-index: 5;
}
.ecu-meter-tl-ruler {
  display: flex;
  align-items: stretch;
  position: sticky;
  top: 0;
  z-index: 3;
  background: #12141a;
  border-bottom: 1px solid #2a3140;
  min-height: var(--tl-ruler-h);
}
.ecu-meter-tl-ruler-track {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: var(--tl-track-w);
  min-height: var(--tl-ruler-h);
  overflow: hidden;
}
.ecu-meter-tl-axis {
  position: relative;
  margin-left: var(--tl-pad);
  width: var(--tl-content-w);
  min-width: var(--tl-content-w);
  height: 100%;
  min-height: inherit;
}
.ecu-meter-tl-ruler .ecu-meter-tl-axis {
  flex: 1 1 0;
  height: auto;
  min-height: 0;
}
.ecu-meter-tl-tick {
  position: absolute;
  top: 50%;
  /* Fixed-width box centered on the tick — digit changes must not shift X. */
  width: 5ch;
  margin-left: 0;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
  text-align: center;
  font-family: Consolas, Monaco, ui-monospace, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #a8b4c8;
  white-space: nowrap;
  pointer-events: none;
}
.ecu-meter-tl-tick.is-wall {
  width: 8ch;
  font-size: 10px;
  color: #6d7a92;
}
/* Only 00:00 / true end marker — never applied to live step ticks. */
.ecu-meter-tl-tick.is-first {
  transform: translate(0, -50%);
  text-align: left;
}
.ecu-meter-tl-tick.is-last {
  transform: translate(-100%, -50%);
  text-align: right;
}
.ecu-meter-tl-lanes {
  display: flex;
  flex-direction: column;
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
}
.ecu-meter-tl-lane {
  display: flex;
  align-items: stretch;
  /* Explicit width — do not shrink-wrap to the scrollport. */
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
  height: var(--tl-row);
  min-height: var(--tl-row);
  max-height: var(--tl-row);
  /* visible+hidden computes to auto+hidden (CSS overflow), which puts a
     gold h-scrollbar on every player row. clip clips without a scrollport;
     both axes stay clip/visible so neither becomes auto. hidden on this
     wide strip also makes Chromium drop history tiles when the parent
     pane scrolls left — do not use overflow-x:hidden/auto here. */
  overflow: visible;
  overflow-x: clip;
  scrollbar-width: none !important;
  line-height: 1.15;
  border-bottom: 1px solid rgba(42, 49, 64, 0.55);
  box-shadow: inset 0 1px 0 transparent, inset 0 -1px 0 transparent;
  cursor: pointer;
}
.ecu-meter-tl-lane::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
.ecu-meter-tl-lane.is-alt {
  background: rgba(255, 255, 255, 0.025);
}
.ecu-meter-tl-lane:hover {
  background: rgba(200, 200, 200, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(255, 255, 255, 0.35);
}
.ecu-meter-tl-lane.is-selected {
  background: rgba(201, 162, 39, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 224, 138, 0.55), inset 0 -1px 0 rgba(255, 224, 138, 0.55);
}
.ecu-meter-tl-lane.is-selected:hover {
  background: rgba(201, 162, 39, 0.18);
}
.ecu-meter-tl-name-txt {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.15;
}
.ecu-meter-tl-track {
  position: relative;
  flex: 0 0 auto;
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
  height: 100%;
  min-height: 100%;
  /* Same as lane: no per-row scrollport; parent .ecu-meter-tl-scroll is
     the only overflow-x:auto. */
  overflow: visible;
  overflow-x: clip;
  scrollbar-width: none !important;
}
.ecu-meter-tl-track::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
.ecu-meter-tl-class {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
.ecu-meter-tl-gridline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(80, 90, 110, 0.4);
  pointer-events: none;
  z-index: 0;
}
.ecu-meter-tl-block {
  position: absolute;
  top: 3px;
  bottom: 3px;
  height: auto;
  z-index: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  min-width: var(--tl-icon);
  /* No translateZ — promoted layers on a 30k+ px track get culled when scrolling. */
  pointer-events: none;
}
.ecu-meter-tl-block.is-sub {
  /* Stack only present kinds; row height grows with cat count (see laneRowPx). */
  top: calc(var(--tl-sub-i) * 100% / var(--tl-subs) + 1px);
  height: calc(100% / var(--tl-subs) - 2px);
  bottom: auto;
  min-width: var(--tl-icon-sub);
}
.ecu-meter-tl-block.is-no-bar .ecu-meter-tl-block-bar {
  display: none;
}
.ecu-meter-tl-block-ico {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: inline-flex;
  width: var(--tl-icon);
  height: var(--tl-icon);
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95));
}
/* Global .ecu-meter-icon is 14px !important (meter bars). Timeline must win. */
.ecu-meter-timeline .ecu-meter-tl-block-ico .ecu-meter-icon,
.ecu-meter-timeline .ecu-meter-tl-block-ico .ecu-meter-icon-clip {
  width: var(--tl-icon) !important;
  height: var(--tl-icon) !important;
}
.ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico {
  width: var(--tl-icon-sub);
  height: var(--tl-icon-sub);
}
.ecu-meter-timeline .ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico .ecu-meter-icon,
.ecu-meter-timeline .ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico .ecu-meter-icon-clip {
  width: var(--tl-icon-sub) !important;
  height: var(--tl-icon-sub) !important;
}
.ecu-meter-timeline .ecu-meter-tl-class .ecu-meter-icon {
  width: var(--tl-class) !important;
  height: var(--tl-class) !important;
  font-size: 13px !important;
  line-height: var(--tl-class) !important;
}
.ecu-meter-tl-block-bar {
  position: absolute;
  left: calc(var(--tl-icon) / 2);
  right: 0;
  top: 1px;
  bottom: 1px;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4);
  z-index: 1;
  pointer-events: none;
}
.ecu-meter-tl-block.is-sub .ecu-meter-tl-block-bar {
  left: calc(var(--tl-icon-sub) / 2);
}
.ecu-meter-tl-block-hit {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--tl-icon);
  height: 100%;
  z-index: 3;
  pointer-events: auto;
  cursor: pointer;
}
.ecu-meter-tl-block.is-sub .ecu-meter-tl-block-hit {
  width: var(--tl-icon-sub);
}
/* AL Time Line: green = buffs, blue = cooldowns, red = debuffs. */
.ecu-meter-tl-block.is-cast .ecu-meter-tl-block-bar {
  background: rgba(60, 180, 255, 0.35);
  opacity: 0.9;
}
.ecu-meter-tl-block.is-buff .ecu-meter-tl-block-bar {
  background: rgba(0, 255, 0, 0.25);
}
.ecu-meter-tl-block.is-debuff .ecu-meter-tl-block-bar {
  background: rgba(255, 0, 0, 0.25);
}
.ecu-meter-tl-block.is-gear .ecu-meter-tl-block-ico {
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 2px rgba(255, 176, 32, 0.95));
}
.ecu-meter-tl-block.is-no-bar .ecu-meter-tl-block-bar {
  display: none;
}
.ecu-meter-tl-block:hover {
  z-index: 10000 !important;
}
.ecu-meter-tl-block:hover .ecu-meter-tl-block-bar {
  filter: brightness(1.25);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}
/* Details PlaceDeathPins: 4×14 white pin — keep thin, not a fat death icon. */
.ecu-meter-tl-death {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 4px;
  margin-left: -2px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(220, 40, 40, 0.85);
  cursor: pointer;
  box-shadow: 0 0 4px rgba(229, 57, 53, 0.65);
}
.ecu-meter-tl-death:hover {
  z-index: 10000 !important;
}
.ecu-meter-tl-empty {
  padding: 20px 14px;
  color: #8b9bb4;
  font-size: 13px;
}
/* Back-compat aliases if anything still targets old class names */
.ecu-meter-timeline-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
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
