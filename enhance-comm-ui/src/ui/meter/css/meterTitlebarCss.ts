/** Titlebar, toolbar tools, and action buttons. */
export const METER_TITLEBAR_CSS = `
.ecu-meter-shell.is-grouped .ecu-meter-titlebar {
  box-shadow: inset 3px 0 0 rgba(201, 162, 39, 0.55);
}
.ecu-meter-shell.is-inspector .ecu-meter-titlebar {
  background: linear-gradient(180deg, #2a3038 0%, #1e2228 100%);
  border-color: var(--meter-border);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  min-height: 22px;
}
.ecu-meter-shell.is-inspector .ecu-meter-titlebar .ecu-meter-ttl {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.ecu-meter-shell.is-report .ecu-meter-titlebar .ecu-meter-ttl {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.ecu-meter-titlebar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 1px 3px 1px 2px;
  background: #4a2a2c;
  border: none;
  border-bottom: 1px solid rgba(0,0,0,0.55);
  border-radius: 0;
  color: var(--meter-text);
  flex-shrink: 0;
  min-width: 0;
  min-height: 20px;
  box-shadow: none;
}
.ecu-meter-titlebar.is-draggable { cursor: grab; }
.ecu-meter-titlebar.is-draggable:active { cursor: grabbing; }
.ecu-meter-tools-left {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  transition: opacity 0.12s ease;
}
.ecu-meter-tool {
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--meter-muted);
  padding: 0;
  width: 18px;
  height: 18px;
  line-height: 18px;
  font-size: 11px;
  flex-shrink: 0;
  border-radius: 0;
  opacity: 0.92;
  text-shadow: 0 1px 2px rgba(0,0,0,0.55);
}
.ecu-meter-tool:hover,
.ecu-meter-tool.active {
  color: #fff;
  background: rgba(255,255,255,0.08);
  opacity: 1;
}
.ecu-meter-shell:not(:has(.ecu-meter-status)):not(:has(.ecu-meter-report-tabs)) .ecu-meter-titlebar {
  border-bottom: none;
  border-radius: 2px;
}
.ecu-meter-titlebar .ecu-meter-ttl {
  flex: 1;
  min-width: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  color: #fff;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
}
.ecu-meter-titlebar .ecu-meter-ttl .ecu-meter-ttl-timer {
  color: var(--meter-muted);
  font-weight: 400;
  margin-left: 6px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-titlebar .ecu-meter-btn {
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--meter-muted);
  padding: 0;
  width: 20px;
  height: 18px;
  line-height: 18px;
  font-size: 12px;
  flex-shrink: 0;
  border-radius: 0;
}
.ecu-meter-titlebar .ecu-meter-btn.wide {
  width: auto;
  padding: 0 6px;
  font-size: 12px;
}
.ecu-meter-titlebar .ecu-meter-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}
.ecu-meter-titlebar .ecu-meter-btn.active {
  color: var(--meter-accent);
}
/* Primary icons stay; secondary chrome fades like Details lock/ungroup */
.ecu-meter-actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
}
.ecu-meter-chrome-hover {
  display: flex;
  align-items: center;
  gap: 0;
  opacity: 0;
  transition: opacity 0.12s ease;
  pointer-events: none;
}
.ecu-meter-shell.is-interacting .ecu-meter-chrome-hover,
.ecu-meter-shell.is-menu-open .ecu-meter-chrome-hover,
.ecu-meter-shell.is-layout .ecu-meter-chrome-hover {
  opacity: 1;
  pointer-events: auto;
}
.ecu-meter-tool.is-icon {
  width: 16px;
  height: 16px;
  font-size: 0;
  line-height: 0;
  color: transparent;
  background-image: var(--meter-toolbar);
  background-repeat: no-repeat;
  background-size: 128px 16px;
  image-rendering: pixelated;
  opacity: 0.92;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.75));
}
.ecu-meter-tool.is-icon:hover,
.ecu-meter-tool.is-icon.active {
  opacity: 1;
  filter: brightness(1.25) drop-shadow(0 1px 1px rgba(0,0,0,0.75));
  background-color: transparent;
}
.ecu-meter-tool.icon-mode { background-position: 0 0; }
.ecu-meter-tool.icon-segment { background-position: -16px 0; }
.ecu-meter-tool.icon-attribute { background-position: -32px 0; }
.ecu-meter-tool.icon-report { background-position: -48px 0; }
.ecu-meter-tool.icon-reset { background-position: -64px 0; }
.ecu-meter-tool.icon-close { background-position: -80px 0; }
.ecu-meter-attr-ball {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin: 0 2px 0 1px;
  background-image: var(--meter-attr-icons);
  background-repeat: no-repeat;
  background-size: 144px 18px;
  image-rendering: auto;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.55);
}
.ecu-meter-attr-ball.attr-damage { background-position: 0 0; }
.ecu-meter-attr-ball.attr-heal { background-position: -18px 0; }
.ecu-meter-attr-ball.attr-taken { background-position: -36px 0; }
.ecu-meter-attr-ball.attr-other { background-position: -54px 0; }
/* Primary toolbar stays readable; secondary chrome fades until interact. */
.ecu-meter-shell:not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-tools-left {
  opacity: 0.9;
}
.ecu-meter-shell:not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-actions > .ecu-meter-tool {
  opacity: 0.55;
}
.ecu-meter-shell.is-interacting .ecu-meter-tools-left,
.ecu-meter-shell.is-menu-open .ecu-meter-tools-left,
.ecu-meter-shell.is-layout .ecu-meter-tools-left {
  opacity: 1;
}
.ecu-meter-ttl-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
/* —— Details parity: encounter titlebar badges —— */
.ecu-meter-encounter-badge {
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--meter-muted);
  padding: 0 2px;
  width: 18px;
  height: 18px;
  line-height: 18px;
  font-size: 11px;
  flex-shrink: 0;
  opacity: 0.88;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.ecu-meter-encounter-badge:hover {
  color: #fff;
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}
.ecu-meter-encounter-badge.is-skull {
  color: #ef9a9a;
}
.ecu-meter-encounter-badge.is-play {
  color: #81c784;
}
`;
