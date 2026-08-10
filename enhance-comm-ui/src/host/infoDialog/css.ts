import {
  ADOPTED_CLASS,
  BUFF_DIALOG_ID,
  CLOSE_CLASS,
  ITEM_DIALOG_ID,
  STOCK_DIALOG_ID,
} from "./types";

const STYLE_ID = "comm-ui-dialog-host-css";

export function injectDialogHostCss(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
/* Fallback host when not yet adopted into CommUI layout panel. */
#topleftcorner:not(.ecu-info-slot-host) {
  position: fixed !important;
  top: 8px !important;
  left: 8px !important;
  z-index: 230 !important;
  pointer-events: none !important;
  max-width: min(96vw, 520px);
  max-height: min(80vh, calc(100vh - 96px));
  overflow: auto;
}
#topleftcornerui {
  pointer-events: auto !important;
  vertical-align: top;
  display: inline-block;
}
/* Stub: leftover stock selectors still target this id; content lives in ecu-* hosts. */
#${STOCK_DIALOG_ID} {
  display: none !important;
}
#${BUFF_DIALOG_ID},
#${ITEM_DIALOG_ID} {
  pointer-events: auto !important;
  vertical-align: top;
  display: inline-block;
  position: relative;
}
#${BUFF_DIALOG_ID}.${ADOPTED_CLASS},
#${ITEM_DIALOG_ID}.${ADOPTED_CLASS} {
  display: block;
  max-width: min(96vw, 520px);
  max-height: min(80vh, calc(100vh - 96px));
  overflow: auto;
}
#${BUFF_DIALOG_ID} .${CLOSE_CLASS},
#${ITEM_DIALOG_ID} .${CLOSE_CLASS} {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  cursor: pointer;
  border: 1px solid #555;
  background: #1c1c1c;
  color: #ddd;
  width: 28px;
  height: 28px;
  line-height: 24px;
  padding: 0;
  font-size: 18px;
  text-align: center;
  box-sizing: border-box;
}
#${BUFF_DIALOG_ID} .${CLOSE_CLASS}:hover,
#${ITEM_DIALOG_ID} .${CLOSE_CLASS}:hover {
  border-color: #888;
  color: #fff;
}
`;
  document.head.append(style);
}
