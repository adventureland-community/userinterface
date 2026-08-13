/** Body, bars, and legacy top tabs. */
export const METER_BODY_CORE_CSS = `
.ecu-meter-report-mark {
  color: var(--meter-accent);
  font-size: var(--meter-fs-micro);
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
  font-size: var(--meter-fs-secondary);
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
  font-size: var(--meter-fs-secondary);
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
  font-size: var(--meter-fs-micro);
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
  font-size: var(--meter-fs-body);
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
  font-size: var(--meter-fs-secondary);
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
  font-size: var(--meter-fs-secondary);
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
`;

/** Avoid AL global .name styles — use ecu-meter-who */
export const METER_BODY_WHO_CSS = `
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
  font-size: var(--meter-fs-secondary);
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
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--meter-fs-secondary);
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
`;
