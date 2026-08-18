/** Threat table fills its positioned panel shell (fixed frameW/H). */
export const THREAT_PANEL_CSS = `
#comm-ui .comm-pos-panel.comm-pos-threat {
  opacity: 1 !important;
  display: flex !important;
  flex-direction: column;
  box-sizing: border-box;
  overflow: visible;
}
#comm-ui .comm-pos-panel.comm-pos-threat .comm-pos-panel-body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
}
#comm-ui .comm-pos-panel.comm-pos-threat > .comm-threat-table,
#comm-ui .comm-pos-panel.comm-pos-threat .comm-panel-shell-dummy {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
}
#comm-ui .comm-pos-panel.comm-pos-threat .comm-threat-rows {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: auto;
}
#comm-ui .comm-pos-panel.comm-pos-threat .comm-threat-row {
  width: 100%;
  box-sizing: border-box;
}
`;

let injected = false;

export function ensureThreatPanelCss(): void {
  if (injected) return;
  injected = true;
  const existing = document.querySelector(
    "style[data-ecu-threat-panel-css]",
  ) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = THREAT_PANEL_CSS;
    return;
  }
  const el = document.createElement("style");
  el.setAttribute("data-ecu-threat-panel-css", "1");
  el.textContent = THREAT_PANEL_CSS;
  document.head.appendChild(el);
}
