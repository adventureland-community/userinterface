/**
 * Stock AL item/condition info renders into `#topleftcornerdialog`.
 * `/comm` (comm.html) does not mount `#topleftcorner` at all — so
 * `condition_click` / `slot_click` were no-ops. Ensure the host exists
 * above `#comm-ui` (z-index 220) so dialogs are visible and clickable.
 */

const STYLE_ID = "comm-ui-dialog-host-css";

function injectDialogHostCss(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
/* Above #comm-ui (220); below #bottom chrome strip (260). */
#topleftcorner {
  position: fixed !important;
  top: 8px !important;
  left: 8px !important;
  z-index: 230 !important;
  pointer-events: none !important;
  max-width: min(96vw, 520px);
  max-height: min(80vh, calc(100vh - 96px));
  overflow: auto;
}
#topleftcornerui,
#topleftcornerdialog {
  pointer-events: auto !important;
  vertical-align: top;
  display: inline-block;
}
#topleftcornerdialog {
  margin-left: 5px;
}
`;
  document.head.append(style);
}

/** Create stock dialog mount if missing (needed on /comm). */
export function ensureDialogHost(): void {
  injectDialogHostCss();

  let corner = document.getElementById("topleftcorner");
  if (!corner) {
    corner = document.createElement("div");
    corner.id = "topleftcorner";
    corner.className = "bpclicks";
    document.body.append(corner);
  }

  if (!document.getElementById("topleftcornerui")) {
    const ui = document.createElement("div");
    ui.id = "topleftcornerui";
    ui.className = "bpclicks";
    corner.append(ui);
  }

  if (!document.getElementById("topleftcornerdialog")) {
    const dialog = document.createElement("div");
    dialog.id = "topleftcornerdialog";
    dialog.className = "bpclicks enableclicks";
    corner.append(dialog);
  }
}
