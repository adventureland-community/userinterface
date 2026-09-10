/**
 * Lightweight CodeMirror 5 autocomplete popup for the Command panel.
 * Does not require the show-hint addon (not loaded on /comm).
 */

import {
  ensureRunnerApiNames,
  inspectCompletionContext,
  listCommandCompletions,
  shouldAutoOpenCompletions,
  type CommandCompletion,
} from "../lib/commandCompletions";

function truncateHintDetail(text: string, max = 42): string {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export type HintableCodeMirror = {
  getValue: () => string;
  getCursor: () => { line: number; ch: number };
  setCursor?: (pos: { line: number; ch: number }) => void;
  replaceRange: (
    text: string,
    from: { line: number; ch: number },
    to?: { line: number; ch: number },
  ) => void;
  indexFromPos?: (pos: { line: number; ch: number }) => number;
  posFromIndex?: (index: number) => { line: number; ch: number };
  cursorCoords: (
    where?: boolean | { line: number; ch: number },
    mode?: string,
  ) => { left: number; top: number; bottom: number };
  getWrapperElement: () => HTMLElement;
  focus: () => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event: string, handler: (...args: any[]) => void) => void;
  somethingSelected?: () => boolean;
};

function indexFromPos(cm: HintableCodeMirror, pos: { line: number; ch: number }): number {
  if (typeof cm.indexFromPos === "function") return cm.indexFromPos(pos);
  const lines = cm.getValue().split("\n");
  let n = 0;
  for (let i = 0; i < pos.line && i < lines.length; i++) {
    n += lines[i].length + 1;
  }
  return n + pos.ch;
}

function posFromIndex(
  cm: HintableCodeMirror,
  index: number,
): { line: number; ch: number } {
  if (typeof cm.posFromIndex === "function") return cm.posFromIndex(index);
  const text = cm.getValue();
  const lines = text.split("\n");
  let left = Math.max(0, Math.min(index, text.length));
  for (let i = 0; i < lines.length; i++) {
    if (left <= lines[i].length) return { line: i, ch: left };
    left -= lines[i].length + 1;
  }
  const last = Math.max(0, lines.length - 1);
  return { line: last, ch: (lines[last] || "").length };
}

export type CommandHintsHandle = {
  dispose: () => void;
  open: () => void;
  close: () => void;
};

/**
 * Attach Ctrl-Space + auto-trigger completions to a command CodeMirror.
 */
export function attachCommandCodeMirrorHints(
  cm: HintableCodeMirror,
): CommandHintsHandle {
  void ensureRunnerApiNames();

  let popup: HTMLDivElement | null = null;
  let items: CommandCompletion[] = [];
  let active = 0;
  let replaceFrom = 0;
  let replaceTo = 0;
  let suppressUntil = 0;

  const close = () => {
    if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
    popup = null;
    items = [];
    active = 0;
  };

  const render = () => {
    if (!popup) return;
    popup.textContent = "";
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const el = document.createElement("button");
      el.type = "button";
      el.className =
        "CommandPanel-hint" + (i === active ? " is-active" : "");
      el.setAttribute("data-kind", row.kind);
      const label = document.createElement("span");
      label.className = "CommandPanel-hint__label";
      label.textContent = row.label;
      el.appendChild(label);
      const meta = document.createElement("span");
      meta.className = "CommandPanel-hint__meta";
      const detail = row.detail ? truncateHintDetail(row.detail) : "";
      meta.textContent = detail ? `${row.kind} · ${detail}` : row.kind;
      el.title = row.detail
        ? `${row.label} — ${row.detail}`
        : `${row.label} (${row.kind})`;
      el.appendChild(meta);
      const idx = i;
      el.onmousedown = (ev) => {
        ev.preventDefault();
        pick(idx);
      };
      popup.appendChild(el);
    }
    const on = popup.children[active] as HTMLElement | undefined;
    if (on && typeof on.scrollIntoView === "function") {
      on.scrollIntoView({ block: "nearest" });
    }
  };

  const place = () => {
    if (!popup) return;
    const coords = cm.cursorCoords(true, "page");
    popup.style.left = `${Math.round(coords.left)}px`;
    popup.style.top = `${Math.round(coords.bottom + 2)}px`;
  };

  const pick = (idx: number) => {
    const row = items[idx];
    if (!row) return;
    const from = posFromIndex(cm, replaceFrom);
    const to = posFromIndex(cm, replaceTo);
    cm.replaceRange(row.text, from, to);
    close();
    suppressUntil = Date.now() + 120;
    try {
      cm.focus();
    } catch {
      // ignore
    }
  };

  const open = () => {
    const value = cm.getValue();
    const cursor = indexFromPos(cm, cm.getCursor());
    const ctx = inspectCompletionContext(value, cursor);
    const list = listCommandCompletions({ value, cursor });
    if (!list.length) {
      close();
      return;
    }
    replaceFrom = ctx.from;
    replaceTo = ctx.to;
    items = list;
    active = 0;
    if (!popup) {
      popup = document.createElement("div");
      popup.className = "CommandPanel-hints";
      popup.setAttribute("role", "listbox");
      document.body.appendChild(popup);
    }
    render();
    place();
  };

  const onChange = (_cm: unknown, change: { origin?: string } | undefined) => {
    if (Date.now() < suppressUntil) return;
    if (change && change.origin === "setValue") return;
    if (cm.somethingSelected && cm.somethingSelected()) {
      close();
      return;
    }
    const value = cm.getValue();
    const cursor = indexFromPos(cm, cm.getCursor());
    if (shouldAutoOpenCompletions(value, cursor)) open();
    else close();
  };

  const onKeyDown = (_cm: unknown, ev: KeyboardEvent) => {
    if (!popup) {
      if (
        (ev.ctrlKey || ev.metaKey) &&
        !ev.altKey &&
        (ev.key === " " || ev.code === "Space")
      ) {
        ev.preventDefault();
        open();
      }
      return;
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      close();
      return;
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      active = (active + 1) % items.length;
      render();
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      active = (active - 1 + items.length) % items.length;
      render();
      return;
    }
    if (ev.key === "Enter" || ev.key === "Tab") {
      ev.preventDefault();
      pick(active);
      return;
    }
  };

  const onScroll = () => {
    if (popup) place();
  };

  const onBlur = () => {
    window.setTimeout(() => {
      const ae = document.activeElement;
      if (popup && ae && popup.contains(ae)) return;
      close();
    }, 120);
  };

  cm.on("change", onChange);
  cm.on("keydown", onKeyDown);
  cm.on("scroll", onScroll);
  cm.on("blur", onBlur);

  // Prefetch; refresh open list once names arrive if still typing.
  void ensureRunnerApiNames().then(() => {
    if (popup) open();
  });

  return {
    open,
    close,
    dispose: () => {
      close();
      if (cm.off) {
        cm.off("change", onChange);
        cm.off("keydown", onKeyDown);
        cm.off("scroll", onScroll);
        cm.off("blur", onBlur);
      }
    },
  };
}
