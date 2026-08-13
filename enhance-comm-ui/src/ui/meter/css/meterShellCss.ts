/** Meter shell, idle states, frame positioning. */
export const METER_SHELL_CSS = `
.ecu-meter-shell {
  /* Details MainWindow / Minimalistic hybrid */
  --meter-panel: rgba(12, 12, 14, 0.72);
  --meter-panel-solid: #1a1518;
  --meter-panel-2: rgba(0, 0, 0, 0.22);
  --meter-border: rgba(0, 0, 0, 0.55);
  --meter-title: #4a2a2c;
  --meter-text: #ffffff;
  --meter-muted: rgba(220, 210, 210, 0.78);
  --meter-accent: #e8c96a;
  --meter-you: #7ec8ff;
  --meter-cooltip-bg: rgba(18, 14, 16, 0.96);
  --meter-toolbar: url(__TOOLBAR__);
  --meter-attr-icons: url(__ATTR__);
  --meter-bar-row-h: 18px;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0;
  border: 1px solid rgba(0, 0, 0, 0.65);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  font-size: var(--meter-fs-body);
  color: var(--meter-text);
  box-sizing: border-box;
  position: relative;
  pointer-events: auto;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.ecu-meter-shell.is-idle:not(.is-inspector):not(.is-report) .ecu-meter-body {
  opacity: 0.42;
  background: var(--meter-panel);
}
/* Click-through bars when idle — titlebar still receives hover to wake. */
.ecu-meter-shell.is-idle:not(.is-inspector):not(.is-report):not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-body {
  pointer-events: none;
}
.ecu-meter-shell.is-idle:not(.is-inspector):not(.is-report).is-interacting .ecu-meter-body,
.ecu-meter-shell.is-idle:not(.is-inspector):not(.is-report):hover .ecu-meter-body {
  opacity: 1;
}
/* Inspector / Report stay denser / more opaque for reading. */
.ecu-meter-shell.is-inspector,
.ecu-meter-shell.is-report {
  background: var(--meter-panel-solid);
  border-radius: 2px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.45);
}
.ecu-meter-shell.is-inspector .ecu-meter-body,
.ecu-meter-shell.is-report .ecu-meter-body {
  background: #12141a;
  border: 1px solid var(--meter-border);
  border-top: none;
  border-radius: 0 0 2px 2px;
}
.ecu-meter-shell.is-report .ecu-meter-report-layout {
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid var(--meter-border);
  border-top: none;
  border-radius: 0 0 2px 2px;
}
.ecu-meter-shell.is-report .ecu-meter-report-main > .ecu-meter-body {
  flex: 1 1 auto;
  min-height: 0;
  border: none;
  border-radius: 0;
}
.ecu-meter-resize {
  display: none;
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
  z-index: 8;
  pointer-events: auto !important;
  touch-action: none;
  background:
    linear-gradient(135deg, transparent 52%, #8b9bb0 52%, #8b9bb0 58%, transparent 58%),
    linear-gradient(135deg, transparent 68%, #8b9bb0 68%, #8b9bb0 74%, transparent 74%),
    linear-gradient(135deg, transparent 84%, #8b9bb0 84%, #8b9bb0 90%, transparent 90%);
  opacity: 0.9;
}
.ecu-meter-resize-left {
  right: auto;
  left: 1px;
  cursor: nesw-resize;
  transform: scaleX(-1);
}
.ecu-meter-shell.is-layout .ecu-meter-resize,
.ecu-meter-shell.is-interacting .ecu-meter-resize {
  display: block;
}
/* Positioned meter frame — resize while arranging (layout edit, unlocked, or Alt). */
.comm-pos-panel.ecu-meter-frame {
  overflow: visible;
  resize: none;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.comm-pos-panel.ecu-meter-frame > .comm-pos-panel-body {
  background: transparent !important;
  padding: 0 !important;
}
.comm-pos-panel.ecu-meter-frame.comm-pos-grouped {
  outline: 1px solid rgba(201, 162, 39, 0.35);
  box-shadow: none;
}
.comm-pos-panel.ecu-meter-frame.comm-pos-dragging {
  outline: 2px solid rgba(120, 200, 255, 0.85);
  box-shadow: 0 6px 20px rgba(0,0,0,0.45);
  z-index: 12;
}
.comm-pos-panel.ecu-meter-frame.comm-pos-snap-target {
  outline: 2px solid rgba(232, 201, 106, 0.9);
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.65),
    inset 0 0 0 1px rgba(232, 201, 106, 0.35);
}
/* Arrange/edit: overflow for cooltips; resize via meter shell grip only (not CSS resize). */
.comm-pos-panel.ecu-meter-frame.comm-pos-editing,
.comm-pos-panel.ecu-meter-frame.comm-pos-arrange,
.comm-pos-panel.ecu-meter-frame.comm-pos-movable {
  overflow: visible;
  resize: none;
  min-width: 0;
  min-height: 0;
}
.comm-pos-panel.ecu-meter-frame.comm-pos-editing > .comm-pos-panel-body,
.comm-pos-panel.ecu-meter-frame.comm-pos-arrange > .comm-pos-panel-body,
.comm-pos-panel.ecu-meter-frame.comm-pos-movable > .comm-pos-panel-body {
  overflow: hidden;
}
/* Hide × sits above the frame / on arrange chrome — never on maroon tools. */
.comm-pos-panel.ecu-meter-frame > .comm-pos-panel-close-above:not(.comm-pos-panel-close-in-chrome) {
  top: -24px;
  right: 0;
  border-radius: 3px;
}
/* Layout-edit: park × on the edit header strip (in-flow chrome). */
.comm-pos-panel.ecu-meter-frame.comm-pos-editing > .comm-pos-panel-close {
  top: 2px;
  right: 2px;
}
`;
