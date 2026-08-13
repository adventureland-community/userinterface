import { TYPE } from "../../../lib/typeScale";

/**
 * Shared readable type tokens + hover chrome + form controls.
 * Tokens come from TYPE so chrome stays on the Comm UI scale.
 */
export const METER_CHROME_SCALE_CSS = `
.ecu-meter-shell,
.ecu-meter-cooltip,
.ecu-meter-cooltip-detail,
.ecu-meter-switch-overlay,
.ecu-meter-bookmark-overlay,
.ecu-meter-options-panel {
  --meter-fs-title: ${TYPE.chrome};
  --meter-fs-body: ${TYPE.body};
  --meter-fs-secondary: ${TYPE.secondary};
  --meter-fs-micro: ${TYPE.micro};
}
@media (hover: hover) and (pointer: fine) {
  /* Hide meter titlebar + statusbar until hover even when unlocked (is-layout).
   * PositionedPanel arrange strip is separate and may stay visible unlocked. */
  .ecu-meter-shell.is-chrome-hover:not(:hover):not(.is-interacting):not(.is-menu-open) .ecu-meter-titlebar,
  .ecu-meter-shell.is-chrome-hover:not(:hover):not(.is-interacting):not(.is-menu-open) .ecu-meter-statusbar {
    display: none;
  }
}
.ecu-meter-opt-sec {
  margin: 6px 0 2px;
  padding: 6px 0 2px;
  color: #c9a227;
  font-size: var(--meter-fs-micro);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ecu-meter-opt-row input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  margin: 0;
  border: 1px solid rgba(232, 201, 106, 0.45);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}
.ecu-meter-opt-row input[type="checkbox"]:hover {
  border-color: rgba(232, 201, 106, 0.75);
  background: rgba(255, 255, 255, 0.1);
}
.ecu-meter-opt-row input[type="checkbox"]:checked {
  background: rgba(232, 201, 106, 0.28);
  border-color: rgba(232, 201, 106, 0.75);
}
.ecu-meter-opt-row input[type="checkbox"]:checked::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: solid #ffd28a;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.ecu-meter-opt-row input[type="number"],
.ecu-meter-opt-row input[type="text"],
.ecu-meter-opt-row select.ecu-meter-opt-select {
  width: 76px;
  box-sizing: border-box;
  padding: 4px 7px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.38);
  color: #eee;
  font: inherit;
  font-size: var(--meter-fs-secondary);
  text-align: right;
}
.ecu-meter-opt-row input[type="text"] {
  width: 140px;
  text-align: left;
}
.ecu-meter-opt-row select.ecu-meter-opt-select {
  width: 168px;
  text-align: left;
  cursor: pointer;
}
.ecu-meter-opt-row input[type="number"]:focus,
.ecu-meter-opt-row input[type="text"]:focus,
.ecu-meter-opt-row select.ecu-meter-opt-select:focus {
  outline: none;
  border-color: rgba(232, 201, 106, 0.55);
  box-shadow: 0 0 0 1px rgba(232, 201, 106, 0.2);
}
.ecu-meter-opt-row input[type="range"] {
  width: 128px;
  height: 16px;
  accent-color: #c9a227;
  cursor: pointer;
}
.ecu-meter-shell .leg-item input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  margin: 0;
  border: 1px solid rgba(232, 201, 106, 0.45);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  vertical-align: middle;
}
.ecu-meter-shell .leg-item input[type="checkbox"]:checked {
  background: rgba(232, 201, 106, 0.28);
  border-color: rgba(232, 201, 106, 0.75);
}
.ecu-meter-shell .leg-item input[type="checkbox"]:checked::after {
  content: "";
  position: absolute;
  left: 3px;
  top: 0;
  width: 4px;
  height: 8px;
  border: solid #ffd28a;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
`;
