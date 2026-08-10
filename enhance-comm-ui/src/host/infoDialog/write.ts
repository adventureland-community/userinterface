import { CLOSE_CLASS, type InfoDialogKind } from "./types";
import { dialogEl, ensureAdoptedHost, hasContent } from "./hosts";

type InfoDialogListener = (kind: InfoDialogKind, open: boolean) => void;
const listeners = new Set<InfoDialogListener>();

/** Which host the next stock render_item selector-write should fill. */
let pendingWriteKind: InfoDialogKind = "item";

export function setPendingWriteKind(kind: InfoDialogKind): void {
  pendingWriteKind = kind;
}

export function getPendingWriteKind(): InfoDialogKind {
  return pendingWriteKind;
}

export function subscribeInfoDialogChange(
  listener: InfoDialogListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitInfoDialogChange(kind: InfoDialogKind, open: boolean): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener(kind, open);
    } catch {
      /* ignore subscriber errors */
    }
  }
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

export function ensureCloseButton(
  dialog: HTMLElement,
  kind: InfoDialogKind,
  closeFn: (kind: InfoDialogKind) => void,
): void {
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
    closeFn(kind);
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

const FN_ORIG = "__ecuInfoOrig";

/** Stock `render_item("html", args)` → string (no modal / no selector write). */
export function buildItemHtml(args: Record<string, any>): string {
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

/**
 * Mirror stock `render_condition` args, then `render_item("html")`.
 * Caller must set `xtarget` to the entity that owns the condition.
 */
export function buildConditionHtml(name: string): string {
  const w = window as any;
  const G = w.G;
  if (!G || !G.conditions) return "";
  let def = G.conditions[name];
  let minutes = 0;
  let condition: any;
  const target = w.xtarget || w.ctarget;
  if (target && target.s && target.s[name] && target.s[name].ms) {
    minutes = target.s[name].ms / 6000.0 / 10.0;
  }
  if (target && target.s && target.s[name]) {
    const clone = typeof w.clone === "function" ? w.clone : null;
    def = !def ? {} : clone ? clone(def) : { ...def };
    condition = target.s[name];
    const keys = Object.keys(condition);
    for (let i = 0; i < keys.length; i++) {
      def[keys[i]] = condition[keys[i]];
    }
  }
  return buildItemHtml({
    skin: (condition && condition.skin) || (def && def.skin),
    item: def,
    prop: def,
    minutes,
    condition,
  });
}

let closeKindImpl: (kind: InfoDialogKind) => boolean = () => false;

export function bindCloseImpl(fn: (kind: InfoDialogKind) => boolean): void {
  closeKindImpl = fn;
}

/** One owned write path: HTML string → host innerHTML. */
export function writeInfoHtml(kind: InfoDialogKind, html: string): void {
  const host = ensureAdoptedHost(kind);
  host.innerHTML = html || "";
  if (hasContent(host)) {
    ensureCloseButton(host, kind, (k) => {
      closeKindImpl(k);
    });
  }
  emitInfoDialogChange(kind, hasContent(host));
}

export function clearInfoHost(kind: InfoDialogKind): boolean {
  const el = dialogEl(kind);
  if (!hasContent(el)) return false;
  el!.innerHTML = "";
  if (kind === "buff") clearDialogOnlyXTarget();
  clearDialogsTarget();
  emitInfoDialogChange(kind, false);
  return true;
}
