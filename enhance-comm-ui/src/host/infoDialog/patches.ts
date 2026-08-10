import {
  BUFF_SEL,
  ITEM_SEL,
  STOCK_DIALOG_ID,
  STOCK_SEL,
  type InfoDialogKind,
} from "./types";
import { ensureDialogElements } from "./hosts";
import { installDialogDismiss } from "./dismiss";
import { callOpenCondition, callOpenItem } from "./bindings";
import {
  getPendingWriteKind,
  setPendingWriteKind,
  writeInfoHtml,
} from "./write";

const PATCHED = "__ecuDialogRendersPatched";
const FN_MARK = "__ecuInfoPatched";
const FN_ORIG = "__ecuInfoOrig";

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

function isStockOrEcuSelector(selector: any): boolean {
  return (
    selector === STOCK_SEL ||
    selector === STOCK_DIALOG_ID ||
    selector === BUFF_SEL ||
    selector === ITEM_SEL ||
    selector === "#" + STOCK_DIALOG_ID
  );
}

function kindFromSelector(selector: any): InfoDialogKind {
  if (selector === BUFF_SEL) return "buff";
  if (selector === ITEM_SEL) return "item";
  return getPendingWriteKind();
}

/**
 * Thin stock patches: funnel selector writes through render_item("html") → host.
 * No jQuery clear hook, no stock MutationObserver rescue.
 */
export function installRenderPatches(): void {
  const w = window as any;
  const done: Record<string, boolean> = w[PATCHED] || (w[PATCHED] = {});

  if (typeof w.render_condition === "function" && !isOurPatch(w.render_condition)) {
    const orig = w.render_condition[FN_ORIG] || w.render_condition;
    w.render_condition = markPatched(function (selector: any, name: any) {
      setPendingWriteKind("buff");
      return orig.call(this, selector, name);
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
      setPendingWriteKind("buff");
      return orig.call(this, selector, skill, args);
    }, orig);
    done.skill = true;
  }

  if (typeof w.render_item === "function" && !isOurPatch(w.render_item)) {
    const orig = w.render_item[FN_ORIG] || w.render_item;
    w.render_item = markPatched(function (selector: any, args: any) {
      if (selector === "html") {
        return orig.call(this, "html", args);
      }
      if (isStockOrEcuSelector(selector)) {
        const kind = kindFromSelector(selector);
        setPendingWriteKind(kind);
        const html = orig.call(this, "html", args);
        if (typeof html === "string") writeInfoHtml(kind, html);
        return html;
      }
      // Non-info selectors (inventory, etc.) keep stock behavior.
      return orig.call(this, selector, args);
    }, orig);
    done.item = true;
  }

  if (typeof w.slot_click === "function" && !isOurPatch(w.slot_click)) {
    const origSlot = w.slot_click[FN_ORIG] || w.slot_click;
    w.slot_click = markPatched(function (name: string) {
      const target = w.xtarget || w.ctarget;
      if (target) callOpenItem(target, name);
    }, origSlot);
    done.slot = true;
  }

  if (typeof w.condition_click === "function" && !isOurPatch(w.condition_click)) {
    const origCond = w.condition_click[FN_ORIG] || w.condition_click;
    w.condition_click = markPatched(function (name: string) {
      const target = w.xtarget || w.ctarget;
      if (target) callOpenCondition(target, name);
      else origCond.call(this, name);
    }, origCond);
    done.conditionClick = true;
  }
}

export function installInfoDialogLifecycle(): void {
  ensureDialogElements();
  installRenderPatches();
  installDialogDismiss();

  if (!(window as any).__ecuDialogPatchRetry) {
    (window as any).__ecuDialogPatchRetry = true;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      installRenderPatches();
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
