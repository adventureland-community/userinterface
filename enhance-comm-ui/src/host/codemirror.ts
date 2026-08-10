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
  const CM = (window as Window & { CodeMirror?: CodeMirrorFactory }).CodeMirror;
  return typeof CM === "function" ? CM : null;
}

export type MountCommandEditorOpts = {
  value: string;
  onChange: (value: string) => void;
  onCtrlEnter: () => void;
};

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
  cm.setSize("100%", "220px");

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
