/**
 * Adventure.land `/comm` already loads CodeMirror 5 + javascript mode + pixel theme
 * (see `htmls/comm.html` and stock `show_commander` in `js/functions.js`).
 * Prefer that host global over bundling another editor.
 */

import {
  attachCommandCodeMirrorHints,
  type CommandHintsHandle,
} from "./commandCmHints";

export type CodeMirrorEditor = {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  refresh: () => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event: string, handler: (...args: any[]) => void) => void;
  getWrapperElement: () => HTMLElement;
  setSize: (
    width: string | number | null,
    height: string | number | null,
  ) => void;
  getCursor?: () => { line: number; ch: number };
  replaceRange?: (
    text: string,
    from: { line: number; ch: number },
    to?: { line: number; ch: number },
  ) => void;
  cursorCoords?: (
    where?: boolean | { line: number; ch: number },
    mode?: string,
  ) => { left: number; top: number; bottom: number };
  indexFromPos?: (pos: { line: number; ch: number }) => number;
  posFromIndex?: (index: number) => { line: number; ch: number };
  somethingSelected?: () => boolean;
};

type CodeMirrorFactory = (
  place: HTMLElement | ((el: HTMLElement) => void),
  options?: Record<string, any>,
) => CodeMirrorEditor;

const hintsByHost = new WeakMap<HTMLElement, CommandHintsHandle>();

export function getHostCodeMirror(): CodeMirrorFactory | null {
  const root = globalThis as typeof globalThis & {
    CodeMirror?: CodeMirrorFactory;
    window?: { CodeMirror?: CodeMirrorFactory };
  };
  const CM = root.CodeMirror || (root.window && root.window.CodeMirror);
  return typeof CM === "function" ? CM : null;
}

export type MountCommandEditorOpts = {
  value: string;
  onChange: (value: string) => void;
  onCtrlEnter: () => void;
};

/**
 * Floor height (px) for the Command CODE pane. Actual height tracks the
 * editor host via ResizeObserver so zoom / side-panel layout keep a
 * working scrollbar instead of clipping mid-line.
 */
export const COMMAND_CM_HEIGHT_PX = 320;

/** @deprecated alias — kept for tests / callers that expected a floor/ceiling. */
export const COMMAND_CM_MIN_HEIGHT_PX = COMMAND_CM_HEIGHT_PX;
/** @deprecated alias — no longer a hard ceiling; host flex height wins. */
export const COMMAND_CM_MAX_HEIGHT_PX = 720;

/** Size CM to the host box (at least the floor). Call after layout / zoom. */
export function syncCommandCodeMirrorSize(
  cm: CodeMirrorEditor,
  host: HTMLElement,
): void {
  const measured = Math.floor(host.clientHeight || 0);
  const h = Math.max(COMMAND_CM_MIN_HEIGHT_PX, measured || COMMAND_CM_HEIGHT_PX);
  cm.setSize("100%", h);
  try {
    cm.refresh();
  } catch {
    // ignore
  }
}

/** Same options as stock `show_commander`, plus Ctrl/Cmd+Enter → Run. */
export function mountCommandCodeMirror(
  host: HTMLElement,
  opts: MountCommandEditorOpts,
): CodeMirrorEditor | null {
  const CodeMirror = getHostCodeMirror();
  if (!CodeMirror) return null;

  const prevHints = hintsByHost.get(host);
  if (prevHints) {
    prevHints.dispose();
    hintsByHost.delete(host);
  }

  while (host.firstChild) {
    host.removeChild(host.firstChild);
  }

  const cm = CodeMirror(host, {
    value: opts.value || "",
    mode: "javascript",
    indentUnit: 4,
    indentWithTabs: true,
    lineWrapping: true,
    lineNumbers: true,
    gutters: ["CodeMirror-linenumbers", "lspacer"],
    theme: "pixel",
    cursorHeight: 0.75,
    extraKeys: {
      "Ctrl-Enter": () => {
        opts.onCtrlEnter();
      },
      "Cmd-Enter": () => {
        opts.onCtrlEnter();
      },
      "Ctrl-Space": () => {
        hintsByHost.get(host)?.open();
      },
      "Cmd-Space": () => {
        hintsByHost.get(host)?.open();
      },
    },
  });

  const wrap = cm.getWrapperElement();
  wrap.style.border = "1px solid #555";
  wrap.style.fontSize = "18px";
  wrap.style.lineHeight = "1.45";
  wrap.style.boxSizing = "border-box";
  wrap.style.width = "100%";
  syncCommandCodeMirrorSize(cm, host);

  cm.on("change", () => {
    opts.onChange(cm.getValue());
  });

  if (
    typeof cm.getCursor === "function" &&
    typeof cm.replaceRange === "function" &&
    typeof cm.cursorCoords === "function"
  ) {
    hintsByHost.set(host, attachCommandCodeMirrorHints(cm as any));
  }

  return cm;
}

export function disposeCodeMirror(host: HTMLElement | null): void {
  if (!host) return;
  const hints = hintsByHost.get(host);
  if (hints) {
    hints.dispose();
    hintsByHost.delete(host);
  }
  while (host.firstChild) {
    host.removeChild(host.firstChild);
  }
}
