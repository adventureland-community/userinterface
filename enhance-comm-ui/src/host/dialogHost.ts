/**
 * Stock AL item/condition info renders into `#topleftcornerdialog`.
 * `/comm` (comm.html) does not mount `#topleftcorner` at all — so
 * `condition_click` / `slot_click` were no-ops. Ensure the host exists
 * and can be adopted into the CommUI `infoDialog` PositionedPanel so
 * layout edit can place it.
 *
 * Stock AL rarely exposes a close control on condition tooltips (they
 * clear when the inspect target changes). On /comm that path is weak, so
 * we add ×, click-outside, and Esc dismiss (skipped while layout editing).
 */

const STYLE_ID = "comm-ui-dialog-host-css";
const CLOSE_CLASS = "ecu-dialog-close";
const BOUND = "__ecuDialogDismissBound";
const ADOPTED_CLASS = "ecu-info-dialog-adopted";

function injectDialogHostCss(): void {
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
#topleftcornerdialog {
  pointer-events: auto !important;
  vertical-align: top;
  display: inline-block;
  margin-left: 5px;
  position: relative;
}
#topleftcornerdialog.${ADOPTED_CLASS} {
  margin-left: 0;
  display: block;
  max-width: min(96vw, 520px);
  max-height: min(80vh, calc(100vh - 96px));
  overflow: auto;
}
#topleftcornerdialog .${CLOSE_CLASS} {
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
#topleftcornerdialog .${CLOSE_CLASS}:hover {
  border-color: #888;
  color: #fff;
}
`;
  document.head.append(style);
}

export function isTopLeftDialogOpen(): boolean {
  const el = document.getElementById("topleftcornerdialog");
  return !!(el && String(el.innerHTML || "").trim());
}

/** Clear stock info dialog. Returns true if there was content to close. */
export function closeTopLeftDialog(): boolean {
  const el = document.getElementById("topleftcornerdialog");
  if (!el || !String(el.innerHTML || "").trim()) return false;
  el.innerHTML = "";
  try {
    (window as any).dialogs_target = null;
  } catch {
    /* ignore */
  }
  // Buff clicks set dialog-only xtarget; drop it so paperdoll sync stays quiet.
  if ((window as any).__ecuDialogOnlyXTarget) {
    (window as any).__ecuDialogOnlyXTarget = false;
    window.xtarget = null;
  }
  return true;
}

/** Layout edit sets this so click-outside / Esc-adjacent dismiss stays out of the way. */
export function setInfoDialogLayoutEditing(editing: boolean): void {
  (window as any).__ecuInfoDialogLayoutEdit = !!editing;
}

function ensureCloseButton(dialog: HTMLElement): void {
  if (!String(dialog.innerHTML || "").trim()) return;
  if (dialog.querySelector("." + CLOSE_CLASS)) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = CLOSE_CLASS;
  btn.title = "Close";
  btn.setAttribute("aria-label", "Close");
  btn.textContent = "×";
  btn.addEventListener("click", (ev) => {
    if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
    if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
    closeTopLeftDialog();
  });

  // Prefer anchoring inside the stock black panel when present.
  const panel =
    (dialog.querySelector(".buyitem") as HTMLElement | null) ||
    (dialog.querySelector(".cccx") as HTMLElement | null) ||
    (dialog.firstElementChild as HTMLElement | null);
  if (panel) {
    const pos = window.getComputedStyle(panel).position;
    if (!pos || pos === "static") panel.style.position = "relative";
    panel.appendChild(btn);
  } else {
    dialog.appendChild(btn);
  }
}

function installDialogDismiss(): void {
  if ((window as any)[BOUND]) return;
  (window as any)[BOUND] = true;

  const dialog = document.getElementById("topleftcornerdialog");
  if (dialog && typeof MutationObserver === "function") {
    const obs = new MutationObserver(() => {
      ensureCloseButton(dialog);
    });
    obs.observe(dialog, { childList: true, subtree: true, characterData: true });
    ensureCloseButton(dialog);
  }

  // Bubble phase: icon/slot handlers stopPropagation, so opening clicks
  // do not immediately dismiss. Skip while layout-editing the panel.
  document.addEventListener("mousedown", (ev: MouseEvent) => {
    if ((window as any).__ecuInfoDialogLayoutEdit) return;
    if (!isTopLeftDialogOpen()) return;
    const t = ev.target as Node | null;
    const host = document.getElementById("topleftcornerdialog");
    if (!host || !t) return;
    if (host.contains(t)) return;
    // Layout drag header / panel chrome for infoDialog — don't dismiss.
    const el = t as HTMLElement;
    if (
      el.closest &&
      el.closest('[data-panel="infoDialog"]')
    ) {
      return;
    }
    closeTopLeftDialog();
  });
}

function ensureDialogElement(): HTMLElement {
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

  let dialog = document.getElementById("topleftcornerdialog");
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "topleftcornerdialog";
    dialog.className = "bpclicks enableclicks";
    corner.append(dialog);
  }

  return dialog;
}

/**
 * Move `#topleftcornerdialog` into a CommUI layout slot so PositionedPanel
 * owns placement. Safe to call repeatedly.
 */
export function adoptTopLeftDialog(slot: HTMLElement): HTMLElement {
  const dialog = ensureDialogElement();
  if (dialog.parentElement !== slot) {
    slot.appendChild(dialog);
  }
  dialog.classList.add(ADOPTED_CLASS);
  // Mark former fixed corner so fallback CSS no longer fights the panel.
  const corner = document.getElementById("topleftcorner");
  if (corner) corner.classList.add("ecu-info-slot-host");
  installDialogDismiss();
  ensureCloseButton(dialog);
  return dialog;
}

/** Create stock dialog mount if missing (needed on /comm before React mounts). */
export function ensureDialogHost(): void {
  ensureDialogElement();
  installDialogDismiss();
}
