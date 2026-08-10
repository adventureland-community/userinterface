/**
 * Stock AL item/condition info renders into `#topleftcornerdialog`.
 * `/comm` (comm.html) does not mount `#topleftcorner` at all — so
 * `condition_click` / `slot_click` were no-ops.
 *
 * We keep a stub `#topleftcornerdialog` for leftover stock clears, and
 * mount two real hosts adopted into CommUI layout panels:
 *   - `#ecu-buff-dialog`  ← condition / skill info (`buffInfo`)
 *   - `#ecu-item-dialog`  ← gear / item info (`itemInfo`)
 *
 * Stock `render_condition` / `render_skill` / `render_item` (and
 * `slot_click` toggle) are patched to target those hosts.
 */

export type InfoDialogKind = "buff" | "item";

const STYLE_ID = "comm-ui-dialog-host-css";
const CLOSE_CLASS = "ecu-dialog-close";
const BOUND = "__ecuDialogDismissBound";
const PATCHED = "__ecuDialogRendersPatched";
const JQ_PATCHED = "__ecuDialogJqueryPatched";
const ADOPTED_CLASS = "ecu-info-dialog-adopted";

export const BUFF_DIALOG_ID = "ecu-buff-dialog";
export const ITEM_DIALOG_ID = "ecu-item-dialog";
const STOCK_DIALOG_ID = "topleftcornerdialog";

const BUFF_SEL = "#" + BUFF_DIALOG_ID;
const ITEM_SEL = "#" + ITEM_DIALOG_ID;
const STOCK_SEL = "#" + STOCK_DIALOG_ID;

function dialogIdFor(kind: InfoDialogKind): string {
  return kind === "buff" ? BUFF_DIALOG_ID : ITEM_DIALOG_ID;
}

function panelAttrFor(kind: InfoDialogKind): string {
  return kind === "buff" ? "buffInfo" : "itemInfo";
}

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
/* Stub: stock clears still target this id; real content lives in ecu-* hosts. */
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

function dialogEl(kind: InfoDialogKind): HTMLElement | null {
  return document.getElementById(dialogIdFor(kind));
}

function hasContent(el: HTMLElement | null): boolean {
  return !!(el && String(el.innerHTML || "").trim());
}

export function isBuffDialogOpen(): boolean {
  return hasContent(dialogEl("buff"));
}

export function isItemDialogOpen(): boolean {
  return hasContent(dialogEl("item"));
}

/** True if either buff or item info is showing. */
export function isTopLeftDialogOpen(): boolean {
  return isBuffDialogOpen() || isItemDialogOpen();
}

function clearDialogOnlyXTarget(): void {
  if ((window as any).__ecuDialogOnlyXTarget) {
    (window as any).__ecuDialogOnlyXTarget = false;
    window.xtarget = null;
  }
}

function clearDialogsTarget(): void {
  try {
    (window as any).dialogs_target = null;
  } catch {
    /* ignore */
  }
}

export function closeBuffDialog(): boolean {
  const el = dialogEl("buff");
  if (!hasContent(el)) return false;
  el!.innerHTML = "";
  clearDialogsTarget();
  clearDialogOnlyXTarget();
  return true;
}

export function closeItemDialog(): boolean {
  const el = dialogEl("item");
  if (!hasContent(el)) return false;
  el!.innerHTML = "";
  clearDialogsTarget();
  return true;
}

/** Close one open info dialog (buff first). Returns true if something closed. */
export function closeTopLeftDialog(): boolean {
  if (closeBuffDialog()) return true;
  return closeItemDialog();
}

/** Close both info frames (used when stock clears `#topleftcornerdialog`). */
export function closeAllInfoDialogs(): boolean {
  const a = closeBuffDialog();
  const b = closeItemDialog();
  return a || b;
}

/** Layout edit sets this so click-outside dismiss stays out of the way. */
export function setInfoDialogLayoutEditing(editing: boolean): void {
  (window as any).__ecuInfoDialogLayoutEdit = !!editing;
}

function ensureCloseButton(dialog: HTMLElement, kind: InfoDialogKind): void {
  if (!hasContent(dialog)) return;
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
    if (kind === "buff") closeBuffDialog();
    else closeItemDialog();
  });

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

function observeCloseButton(dialog: HTMLElement, kind: InfoDialogKind): void {
  if (typeof MutationObserver !== "function") {
    ensureCloseButton(dialog, kind);
    return;
  }
  const key = "__ecuCloseObs";
  if ((dialog as any)[key]) {
    ensureCloseButton(dialog, kind);
    return;
  }
  (dialog as any)[key] = true;
  const obs = new MutationObserver(() => {
    ensureCloseButton(dialog, kind);
  });
  obs.observe(dialog, { childList: true, subtree: true, characterData: true });
  ensureCloseButton(dialog, kind);
}

function installDialogDismiss(): void {
  if ((window as any)[BOUND]) return;
  (window as any)[BOUND] = true;

  document.addEventListener("mousedown", (ev: MouseEvent) => {
    if ((window as any).__ecuInfoDialogLayoutEdit) return;
    if (!isTopLeftDialogOpen()) return;
    const t = ev.target as Node | null;
    if (!t) return;
    const el = t as HTMLElement;
    const inBuff = !!(
      el.closest &&
      (el.closest("#" + BUFF_DIALOG_ID) ||
        el.closest('[data-panel="buffInfo"]'))
    );
    const inItem = !!(
      el.closest &&
      (el.closest("#" + ITEM_DIALOG_ID) ||
        el.closest('[data-panel="itemInfo"]'))
    );
    if (inBuff || inItem) return;

    // Outside both — close whichever are open (one Esc-style pass closes both).
    closeAllInfoDialogs();
  });
}

function ensureNamedDialog(id: string, parent: HTMLElement): HTMLElement {
  let dialog = document.getElementById(id);
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = id;
    dialog.className = "bpclicks enableclicks";
    parent.append(dialog);
  }
  return dialog;
}

function ensureDialogElements(): {
  buff: HTMLElement;
  item: HTMLElement;
  stock: HTMLElement;
} {
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

  const stock = ensureNamedDialog(STOCK_DIALOG_ID, corner);
  const buff = ensureNamedDialog(BUFF_DIALOG_ID, corner);
  const item = ensureNamedDialog(ITEM_DIALOG_ID, corner);
  return { buff, item, stock };
}

function remapStockSelector(
  selector: any,
  kind: InfoDialogKind,
): any {
  if (selector === STOCK_SEL || selector === STOCK_DIALOG_ID) {
    return kind === "buff" ? BUFF_SEL : ITEM_SEL;
  }
  return selector;
}

function installRenderPatches(): void {
  const w = window as any;
  const done: Record<string, boolean> = w[PATCHED] || (w[PATCHED] = {});

  if (!done.condition && typeof w.render_condition === "function") {
    const orig = w.render_condition;
    w.render_condition = function (selector: any, name: any) {
      return orig.call(
        this,
        remapStockSelector(selector, "buff"),
        name,
      );
    };
    done.condition = true;
  }

  if (!done.skill && typeof w.render_skill === "function") {
    const orig = w.render_skill;
    w.render_skill = function (selector: any, skill: any, args: any) {
      return orig.call(
        this,
        remapStockSelector(selector, "buff"),
        skill,
        args,
      );
    };
    done.skill = true;
  }

  if (!done.item && typeof w.render_item === "function") {
    const orig = w.render_item;
    w.render_item = function (selector: any, args: any) {
      // render_condition already remaps to BUFF_SEL before calling us.
      return orig.call(
        this,
        remapStockSelector(selector, "item"),
        args,
      );
    };
    done.item = true;
  }

  // slot_click toggles by checking `#topleftcornerdialog` — point at item host.
  if (!done.slot && typeof w.slot_click === "function") {
    w.slot_click = function (name: string) {
      const target = w.xtarget || w.ctarget;
      const itemHost = document.getElementById(ITEM_DIALOG_ID);
      if (
        w.last_sclick &&
        w.last_sclick === name &&
        itemHost &&
        String(itemHost.innerHTML || "").trim()
      ) {
        itemHost.innerHTML = "";
        return;
      }
      if (target && target.slots && target.slots[name]) {
        w.last_sclick = name;
        w.dialogs_target = target;
        const slot = target.slots[name];
        const G = w.G;
        if (typeof w.render_item === "function" && G && G.items && slot.name) {
          w.render_item(ITEM_SEL, {
            id: "item" + name,
            item: G.items[slot.name],
            name: slot.name,
            actual: slot,
            slot: name,
            from_player: target.id,
          });
        }
      }
    };
    done.slot = true;
  }
}

/** When stock clears `#topleftcornerdialog`, clear both real hosts. */
function installJqueryClearHook(): void {
  const $ = (window as any).$;
  if (!$ || !$.fn || ($.fn as any)[JQ_PATCHED]) return;
  const orig = $.fn.html;
  if (typeof orig !== "function") return;
  ($.fn as any)[JQ_PATCHED] = true;
  $.fn.html = function (this: any) {
    if (
      arguments.length > 0 &&
      arguments[0] === "" &&
      this &&
      this.length
    ) {
      let hitStock = false;
      for (let i = 0; i < this.length; i++) {
        const node = this[i];
        if (node && node.id === STOCK_DIALOG_ID) {
          hitStock = true;
          break;
        }
      }
      if (hitStock) closeAllInfoDialogs();
    }
    return orig.apply(this, arguments as any);
  };
}

/**
 * Move a dialog host into a CommUI layout slot so PositionedPanel owns
 * placement. Safe to call repeatedly.
 */
export function adoptInfoDialog(
  kind: InfoDialogKind,
  slot: HTMLElement,
): HTMLElement {
  const { buff, item } = ensureDialogElements();
  const dialog = kind === "buff" ? buff : item;
  if (dialog.parentElement !== slot) {
    slot.appendChild(dialog);
  }
  dialog.classList.add(ADOPTED_CLASS);
  dialog.setAttribute("data-ecu-kind", kind);
  dialog.setAttribute("data-panel-host", panelAttrFor(kind));
  const corner = document.getElementById("topleftcorner");
  if (corner) corner.classList.add("ecu-info-slot-host");
  installRenderPatches();
  installJqueryClearHook();
  installDialogDismiss();
  observeCloseButton(dialog, kind);
  return dialog;
}

/** @deprecated use adoptInfoDialog("buff"|"item", slot) */
export function adoptTopLeftDialog(slot: HTMLElement): HTMLElement {
  return adoptInfoDialog("buff", slot);
}

/** Create stock dialog mounts if missing (needed on /comm before React mounts). */
export function ensureDialogHost(): void {
  const { buff, item } = ensureDialogElements();
  installRenderPatches();
  installJqueryClearHook();
  installDialogDismiss();
  observeCloseButton(buff, "buff");
  observeCloseButton(item, "item");

  // Game scripts may load after the userscript — retry patches briefly.
  if (!(window as any).__ecuDialogPatchRetry) {
    (window as any).__ecuDialogPatchRetry = true;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      installRenderPatches();
      installJqueryClearHook();
      const done = (window as any).__ecuDialogRendersPatched || {};
      if (
        (done.condition && done.item && done.slot && done.skill) ||
        tries >= 40
      ) {
        window.clearInterval(timer);
      }
    }, 250);
  }
}
