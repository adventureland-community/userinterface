/**
 * Adventure.land `/comm` already loads CodeMirror 5 + javascript mode + pixel theme
 * (see `htmls/comm.html` and stock `show_commander` in `js/functions.js`).
 * Prefer that host global over bundling another editor.
 */

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
};

type CodeMirrorFactory = (
  place: HTMLElement | ((el: HTMLElement) => void),
  options?: Record<string, any>,
) => CodeMirrorEditor;

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
 * Fixed editor height (px). CodeMirror 5 `height:auto` + min/max paints a
 * scrollbar mid-pane; stock show_commander also uses a fixed setSize height.
 */
export const COMMAND_CM_HEIGHT_PX = 320;

/** @deprecated alias — kept for tests / callers that expected a floor/ceiling. */
export const COMMAND_CM_MIN_HEIGHT_PX = COMMAND_CM_HEIGHT_PX;
/** @deprecated alias */
export const COMMAND_CM_MAX_HEIGHT_PX = COMMAND_CM_HEIGHT_PX;

/** Same options as stock `show_commander`, plus Ctrl/Cmd+Enter → Run. */
export function mountCommandCodeMirror(
  host: HTMLElement,
  opts: MountCommandEditorOpts,
): CodeMirrorEditor | null {
  const CodeMirror = getHostCodeMirror();
  if (!CodeMirror) return null;

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
    },
  });

  const wrap = cm.getWrapperElement();
  wrap.style.border = "1px solid #555";
  wrap.style.fontSize = "16px";
  wrap.style.lineHeight = "1.4";
  wrap.style.boxSizing = "border-box";
  wrap.style.width = "100%";
  // Fixed size — avoids the mid-editor scrollbar from height:auto.
  cm.setSize("100%", COMMAND_CM_HEIGHT_PX);

  cm.on("change", () => {
    opts.onChange(cm.getValue());
  });

  return cm;
}

export function disposeCodeMirror(host: HTMLElement | null): void {
  if (!host) return;
  while (host.firstChild) {
    host.removeChild(host.firstChild);
  }
}
