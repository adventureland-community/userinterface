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
  emitInfoDialogChange("buff", false);
  return true;
}

export function closeItemDialog(): boolean {
  const el = dialogEl("item");
  if (!hasContent(el)) return false;
  el!.innerHTML = "";
  clearDialogsTarget();
  emitInfoDialogChange("item", false);
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

function isInfoDialogChrome(el: HTMLElement): boolean {
  if (!el.closest) return false;
  return !!(
    el.closest("#" + BUFF_DIALOG_ID) ||
    el.closest("#" + ITEM_DIALOG_ID) ||
    el.closest('[data-panel="buffInfo"]') ||
    el.closest('[data-panel="itemInfo"]')
  );
}

/**
 * Gear / buff icon presses must not count as "outside" dismiss.
 * Dismiss runs on document mousedown (bubble); SlotCell / EffectsRow open on
 * the same press. Closing first wiped itemInfo and often dropped the click
 * after a React re-render — first gear click worked, later ones looked dead.
 */
function isInfoSourceClick(el: HTMLElement): boolean {
  if (!el.closest) return false;
  return !!(
    el.closest(".comm-gear-slot") ||
    el.closest(".comm-paperdoll") ||
    el.closest('[data-panel="paperdoll"]') ||
    el.closest(".comm-fx-icon") ||
    el.closest('[data-panel="playerFrame"]') ||
    el.closest('[data-panel="targetFrame"]')
  );
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
    if (isInfoDialogChrome(el) || isInfoSourceClick(el)) return;

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

const FN_MARK = "__ecuInfoPatched";
const FN_ORIG = "__ecuInfoOrig";

/** Last intentional info write — used to rescue content that still lands on stock. */
let lastInfoWriteKind: InfoDialogKind = "item";

function markPatched<T extends (...args: any[]) => any>(
  patched: T,
  orig: T,
): T {
  (patched as any)[FN_MARK] = true;
  (patched as any)[FN_ORIG] = orig;
  return patched;
}

function isOurPatch(fn: any): boolean {
  return !!(fn && fn[FN_MARK]);
}

function rescueStockContent(): void {
  const stock = document.getElementById(STOCK_DIALOG_ID);
  if (!hasContent(stock)) return;
  const host = dialogEl(lastInfoWriteKind) || dialogEl("item");
  if (!host || host === stock) return;
  host.innerHTML = stock!.innerHTML;
  stock!.innerHTML = "";
}

function installStockRescueObserver(): void {
  const stock = document.getElementById(STOCK_DIALOG_ID);
  if (!stock || typeof MutationObserver !== "function") return;
  const key = "__ecuStockRescueObs";
  if ((stock as any)[key]) return;
  (stock as any)[key] = true;
  const obs = new MutationObserver(() => {
    rescueStockContent();
  });
  obs.observe(stock, { childList: true, subtree: true, characterData: true });
}

function installRenderPatches(): void {
  const w = window as any;
  const done: Record<string, boolean> = w[PATCHED] || (w[PATCHED] = {});

  if (typeof w.render_condition === "function" && !isOurPatch(w.render_condition)) {
    const orig = w.render_condition[FN_ORIG] || w.render_condition;
    w.render_condition = markPatched(function (selector: any, name: any) {
      lastInfoWriteKind = "buff";
      return orig.call(
        this,
        remapStockSelector(selector, "buff"),
        name,
      );
    }, orig);
    done.condition = true;
  }

  if (typeof w.render_skill === "function" && !isOurPatch(w.render_skill)) {
    const orig = w.render_skill[FN_ORIG] || w.render_skill;
    w.render_skill = markPatched(function (
      selector: any,
      skill: any,
      args: any,
    ) {
      lastInfoWriteKind = "buff";
      return orig.call(
        this,
        remapStockSelector(selector, "buff"),
        skill,
        args,
      );
    }, orig);
    done.skill = true;
  }

  if (typeof w.render_item === "function" && !isOurPatch(w.render_item)) {
    const orig = w.render_item[FN_ORIG] || w.render_item;
    w.render_item = markPatched(function (selector: any, args: any) {
      // render_condition / render_skill already remap to BUFF_SEL before calling us.
      const fromBuff =
        selector === BUFF_SEL || selector === BUFF_DIALOG_ID;
      if (fromBuff) lastInfoWriteKind = "buff";
      else lastInfoWriteKind = "item";
      return orig.call(
        this,
        fromBuff ? selector : remapStockSelector(selector, "item"),
        args,
      );
    }, orig);
    done.item = true;
  }

  // Stock slot_click checks `#topleftcornerdialog` — route through openItemSlotInfo.
  if (typeof w.slot_click === "function" && !isOurPatch(w.slot_click)) {
    const origSlot = w.slot_click[FN_ORIG] || w.slot_click;
    w.slot_click = markPatched(function (name: string) {
      const target = w.xtarget || w.ctarget;
      if (target) openItemSlotInfo(target, name);
    }, origSlot);
    done.slot = true;
  }
}

/**
 * Stock `#topleftcornerdialog` is a hidden stub on /comm. Empty clears must NOT
 * wipe `#ecu-*-dialog` hosts — `reset_topleft` clears the stub constantly via
 * entity object-identity churn, which is what kept itemInfo empty after 69ea436.
 * Non-empty stub writes are still redirected to the last info host.
 */
function installJqueryClearHook(): void {
  const $ = (window as any).$;
  if (!$ || !$.fn || ($.fn as any)[JQ_PATCHED]) return;
  const orig = $.fn.html;
  if (typeof orig !== "function") return;
  ($.fn as any)[JQ_PATCHED] = true;
  $.fn.html = function (this: any) {
    if (arguments.length > 0 && this && this.length) {
      let hitStock = false;
      for (let i = 0; i < this.length; i++) {
        const node = this[i];
        if (node && node.id === STOCK_DIALOG_ID) {
          hitStock = true;
          break;
        }
      }
      if (hitStock) {
        const value = arguments[0];
        // Ignore stub clears — ecu hosts close via × / Esc / click-outside / toggle.
        if (value === "") {
          return orig.apply(this, arguments as any);
        }
        const host = dialogEl(lastInfoWriteKind) || dialogEl("item");
        if (host) {
          return orig.apply($(host), arguments as any);
        }
      }
    }
    return orig.apply(this, arguments as any);
  };
}

type InfoDialogListener = (kind: InfoDialogKind, open: boolean) => void;
const infoDialogListeners = new Set<InfoDialogListener>();

/** React panels subscribe so open state does not depend only on MutationObserver. */
export function subscribeInfoDialogChange(
  listener: InfoDialogListener,
): () => void {
  infoDialogListeners.add(listener);
  return () => {
    infoDialogListeners.delete(listener);
  };
}

function emitInfoDialogChange(kind: InfoDialogKind, open: boolean): void {
  for (const listener of Array.from(infoDialogListeners)) {
    try {
      listener(kind, open);
    } catch {
      /* ignore subscriber errors */
    }
  }
}

/** Keep `#ecu-item-dialog` inside the layout slot (visible host), not body stub. */
function ensureItemDialogAdopted(): HTMLElement {
  const { item } = ensureDialogElements();
  const slot = document.querySelector(
    ".comm-item-info-slot",
  ) as HTMLElement | null;
  if (slot) return adoptInfoDialog("item", slot);
  return item;
}

/**
 * Build item HTML without stock selector / modal_count side effects.
 * `render_item("html", …)` returns a string; selector writes can redirect to
 * `show_modal` when `modal_count > 0` (common on /comm after Bag).
 */
function buildItemInfoHtml(args: Record<string, any>): string {
  const w = window as any;
  const renderItem =
    (typeof w.render_item === "function" && w.render_item[FN_ORIG]) ||
    w.render_item;
  if (typeof renderItem !== "function") return "";
  try {
    const html = renderItem.call(w, "html", args);
    return typeof html === "string" ? html : "";
  } catch {
    return "";
  }
}

/** Guard against mousedown+click (or stock+React) opening then toggle-closing. */
let itemInfoWriteLock = false;

/**
 * Prefer the live `entities[id]` row (same source EntityInfo renders) so
 * paperdoll clicks do not read a stale observing snapshot or wrong xtarget.
 */
function resolvePaperdollEntity(entity: any): any {
  if (!entity) return entity;
  const id = entity.id;
  if (id == null || id === "") return entity;
  const tid = String(id);
  const raw = (window as any).entities;
  if (!raw) return entity;
  if (!Array.isArray(raw)) {
    const byKey = raw[tid] || raw[id];
    if (byKey && byKey.slots) return byKey;
  }
  const list: any[] = Array.isArray(raw)
    ? raw
    : Object.values(raw as Record<string, any>);
  for (let i = 0; i < list.length; i++) {
    const ent = list[i];
    if (ent && String(ent.id) === tid && ent.slots) return ent;
  }
  return entity;
}

/**
 * Show gear/item details in `#ecu-item-dialog` (itemInfo panel).
 * Owns toggle + write so paperdoll clicks do not depend on stock slot_click
 * checking the hidden `#topleftcornerdialog` stub, and do not depend on
 * `render_item(selector)` (which becomes show_modal when modal_count > 0).
 *
 * `slotOverride` is the slot object GearGrid already rendered — avoids a
 * second lookup on a mismatched entity.
 */
export function openItemSlotInfo(
  entity: any,
  slotName: string,
  slotOverride?: any,
): void {
  if (!entity || !slotName) return;
  if (itemInfoWriteLock) return;

  ensureDialogElements();
  installRenderPatches();
  installJqueryClearHook();
  installStockRescueObserver();
  installDialogDismiss();

  const target = resolvePaperdollEntity(entity);
  const slot =
    slotOverride && slotOverride.name
      ? slotOverride
      : target && target.slots && target.slots[slotName];
  if (!slot || !slot.name) return;

  const w = window as any;
  const itemHost = ensureItemDialogAdopted();

  if (
    w.last_sclick &&
    w.last_sclick === slotName &&
    String(itemHost.innerHTML || "").trim()
  ) {
    closeItemDialog();
    w.last_sclick = "";
    return;
  }

  const G = w.G;
  const def = G && G.items && G.items[slot.name];
  if (!def) return;

  itemInfoWriteLock = true;
  try {
    w.last_sclick = slotName;
    w.dialogs_target = target;
    w.xtarget = target;
    lastInfoWriteKind = "item";

    const args = {
      id: "item" + slotName,
      item: def,
      name: slot.name,
      actual: slot,
      slot: slotName,
      from_player: target.id,
    };

    const html = buildItemInfoHtml(args);
    if (html) {
      itemHost.innerHTML = html;
    } else if (typeof w.render_item === "function") {
      // Last resort: selector path (may modal if modal_count > 0).
      w.render_item(ITEM_SEL, args);
    }

    ensureCloseButton(itemHost, "item");
    emitInfoDialogChange("item", hasContent(itemHost));
  } finally {
    // Release after this task so a paired pointerdown+mousedown cannot toggle-close.
    window.setTimeout(() => {
      itemInfoWriteLock = false;
    }, 0);
  }
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
  installStockRescueObserver();
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
  installStockRescueObserver();
  installDialogDismiss();
  observeCloseButton(buff, "buff");
  observeCloseButton(item, "item");

  // Game scripts may load after the userscript — retry patches briefly.
  // Keep re-checking markers so late game redefines still get wrapped.
  if (!(window as any).__ecuDialogPatchRetry) {
    (window as any).__ecuDialogPatchRetry = true;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      installRenderPatches();
      installJqueryClearHook();
      installStockRescueObserver();
      const w = window as any;
      const ready =
        isOurPatch(w.render_condition) &&
        isOurPatch(w.render_item) &&
        isOurPatch(w.slot_click) &&
        isOurPatch(w.render_skill);
      if (ready || tries >= 80) {
        window.clearInterval(timer);
      }
    }, 250);
  }
}
