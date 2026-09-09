/**
 * Injected once for the Command panel editor host.
 */

export const COMMAND_PANEL_CSS = `
.CommandPanel {
  pointer-events: auto;
}
.CommandPanel-editor {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  pointer-events: auto;
  /* Keep CM's measure/input layers clipped to the editor box. */
  contain: layout style;
}
.CommandPanel-editor .CodeMirror {
  width: 100% !important;
  box-sizing: border-box;
  pointer-events: auto;
}
.CommandPanel-editor .CodeMirror-scroll {
  max-height: none;
}
`;

let injected = false;

export function ensureCommandPanelCss(): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("ecu-command-panel-css");
  if (existing) {
    existing.textContent = COMMAND_PANEL_CSS;
    injected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = "ecu-command-panel-css";
  el.textContent = COMMAND_PANEL_CSS;
  document.head.appendChild(el);
  injected = true;
}
