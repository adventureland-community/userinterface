import { getReact, e } from "../../host/react";
import { runCommandSnippet } from "../../host/commandRun";
import {
  COMMAND_CM_HEIGHT_PX,
  disposeCodeMirror,
  getHostCodeMirror,
  mountCommandCodeMirror,
  syncCommandCodeMirrorSize,
  type CodeMirrorEditor,
} from "../../host/codemirror";
import {
  buildSnippetTree,
  findSnippetById,
  flattenVisibleSnippets,
} from "../../lib/commandSnippets";
import {
  loadSettings,
  saveSettings,
  type CommandSnippet,
} from "../../lib/settings";
import { TYPE } from "../../lib/typeScale";
import { detectViewportProfile } from "../../lib/viewport";
import { PanelExpandButton } from "../chrome/panelExpandControl";
import { usePhoneShellExpand } from "../chrome/usePhoneShellExpand";
import { ensureCommandPanelCss } from "./commandPanelCss";

export type CommandPanelProps = {
  /** External prefill (stock show_commander / open hook). */
  seedDraft?: string | null;
  /** Bumps when COMMAND is opened so seedDraft re-applies. */
  openSeq?: number;
  /** Restore saved frame size after leaving expand mode. */
  onFrameSizeRestore?: (size: { w: number; h: number }) => void;
  /** Phone swipe-down closes the command panel. */
  onRequestClose?: () => void;
};

type PhoneTab = "code" | "snippets";

export { buildSnippetTree } from "../../lib/commandSnippets";

function btnStyle(opts?: {
  accent?: boolean;
  danger?: boolean;
}): Record<string, any> {
  const accent = opts?.accent === true;
  const danger = opts?.danger === true;
  return {
    cursor: "pointer",
    fontSize: TYPE.body,
    padding: "5px 11px",
    border: danger
      ? "1px solid #844"
      : accent
        ? "1px solid #a86"
        : "1px solid #555",
    background: danger ? "#2a1515" : accent ? "#2a2410" : "#1a1a1a",
    color: danger ? "#eaa" : accent ? "#ffe08a" : "#ccc",
    textShadow: "none",
    fontWeight: "normal",
  };
}

function newId(): string {
  return `snip-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
}

export function CommandPanel(props: CommandPanelProps): any {
  const React = getReact();
  ensureCommandPanelCss();
  const seedDraft = props.seedDraft;
  const openSeq = props.openSeq || 0;

  const [draft, setDraft] = React.useState(
    () => loadSettings().commandDraft || "",
  );
  const [snippets, setSnippets] = React.useState(
    () => loadSettings().commandSnippets.slice() as CommandSnippet[],
  );
  const [lastRunId, setLastRunId] = React.useState(
    () => loadSettings().commandLastRunId as string | null,
  );
  const [newName, setNewName] = React.useState("");
  const [newFolder, setNewFolder] = React.useState("");
  const [snippetQuery, setSnippetQuery] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(
    () => Object.create(null) as Record<string, boolean>,
  );
  const [status, setStatus] = React.useState("");
  const [statusOk, setStatusOk] = React.useState(null as boolean | null);
  const [selectedId, setSelectedId] = React.useState(null as string | null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState(
    null as string | null,
  );
  const [treeHi, setTreeHi] = React.useState(0);
  const [cmAvailable] = React.useState(() => !!getHostCodeMirror());
  const [narrow, setNarrow] = React.useState(false);
  const [phoneUi] = React.useState(() => detectViewportProfile() === "phone");
  const [expanded, setExpanded] = React.useState(
    () => detectViewportProfile() === "phone",
  );
  // Phone: Quick templates read denser than a mostly-empty CodeMirror.
  const [phoneTab, setPhoneTab] = React.useState(
    () =>
      (detectViewportProfile() === "phone" ? "snippets" : "code") as PhoneTab,
  );
  const rootRef = React.useRef(null as HTMLDivElement | null);
  const headRef = React.useRef(null as HTMLDivElement | null);

  usePhoneShellExpand({
    panelId: "command",
    shellClass: "ecu-command-shell-expanded",
    rootRef,
    headRef,
    expanded,
    setExpanded,
    onFrameSizeRestore: props.onFrameSizeRestore,
    onRequestClose: props.onRequestClose,
  });

  const editorHostRef = React.useRef(null as HTMLDivElement | null);
  const textareaRef = React.useRef(null as HTMLTextAreaElement | null);
  const cmRef = React.useRef(null as CodeMirrorEditor | null);
  const skipCmSyncRef = React.useRef(false);
  const draftRef = React.useRef(draft);
  const persistDraftRef = React.useRef((value: string) => {
    setDraft(value);
    saveSettings({ commandDraft: value });
  });
  const runCodeRef = React.useRef(
    (_code: string, _snipId?: string | null) => {},
  );

  draftRef.current = draft;

  const persistDraft = (value: string) => {
    setDraft(value);
    saveSettings({ commandDraft: value });
  };
  persistDraftRef.current = persistDraft;

  const persistSnippets = (next: CommandSnippet[]) => {
    setSnippets(next);
    saveSettings({ commandSnippets: next });
  };

  const persistLastRun = (id: string | null) => {
    setLastRunId(id);
    saveSettings({ commandLastRunId: id });
  };

  const runCode = (code: string, snipId?: string | null) => {
    const result = runCommandSnippet(code);
    setStatus(result.status);
    setStatusOk(result.ok);
    if (result.ok) {
      const selected = findSnippetById(snippets, selectedId);
      const matchId =
        snipId ||
        (selected && selected.code === draft ? selectedId : null);
      if (matchId) {
        persistLastRun(matchId);
      } else {
        for (let i = 0; i < snippets.length; i++) {
          if (snippets[i].code === code || snippets[i].code === draft) {
            persistLastRun(snippets[i].id);
            break;
          }
        }
      }
    }
  };
  runCodeRef.current = runCode;

  const readEditorCode = () => {
    const cm = cmRef.current;
    if (cm) return cm.getValue();
    const el = textareaRef.current;
    if (el) return el.value;
    return draftRef.current;
  };

  const refreshEditor = () => {
    const cm = cmRef.current;
    const host = editorHostRef.current;
    if (!cm || !host) return;
    syncCommandCodeMirrorSize(cm, host);
  };

  const onRun = () => {
    runCode(readEditorCode(), selectedId);
  };

  React.useEffect(() => {
    if (!cmAvailable) return;
    const host = editorHostRef.current;
    if (!host) return;

    const cm = mountCommandCodeMirror(host, {
      value: draftRef.current,
      onChange: (value) => {
        skipCmSyncRef.current = true;
        persistDraftRef.current(value);
      },
      onCtrlEnter: () => {
        runCodeRef.current(readEditorCode());
      },
    });
    cmRef.current = cm;
    if (cm) {
      try {
        cm.focus();
        syncCommandCodeMirrorSize(cm, host);
      } catch {
        // ignore
      }
    }

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (cmRef.current && editorHostRef.current) {
              syncCommandCodeMirrorSize(cmRef.current, editorHostRef.current);
            }
          })
        : null;
    if (ro) ro.observe(host);

    const onViewport = () => {
      window.requestAnimationFrame(() => refreshEditor());
    };
    window.addEventListener("resize", onViewport);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", onViewport);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", onViewport);
      if (vv) vv.removeEventListener("resize", onViewport);
      disposeCodeMirror(host);
      cmRef.current = null;
    };
  }, [cmAvailable]);

  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => refreshEditor());
    return () => window.cancelAnimationFrame(id);
  }, [status, openSeq, snippets.length, snippetQuery, phoneTab, expanded]);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;
      const next = entry.contentRect.width < 520;
      setNarrow((prev: boolean) => (prev === next ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (typeof seedDraft === "string") {
      persistDraft(seedDraft);
    }
    const cm = cmRef.current;
    if (cm) {
      try {
        if (typeof seedDraft === "string" && cm.getValue() !== seedDraft) {
          skipCmSyncRef.current = true;
          cm.setValue(seedDraft);
        }
        cm.focus();
        refreshEditor();
      } catch {
        // ignore
      }
      return;
    }
    const el = textareaRef.current;
    if (el && typeof el.focus === "function") {
      try {
        el.focus();
      } catch {
        // ignore
      }
    }
  }, [openSeq, seedDraft]);

  React.useEffect(() => {
    const cm = cmRef.current;
    if (!cm) return;
    if (skipCmSyncRef.current) {
      skipCmSyncRef.current = false;
      if (cm.getValue() === draft) return;
    }
    if (cm.getValue() !== draft) {
      skipCmSyncRef.current = true;
      cm.setValue(draft);
    }
  }, [draft]);

  const selected = findSnippetById(snippets, selectedId);
  const dirty = !!(selected && draft !== selected.code);

  const writeEditor = (code: string) => {
    const cm = cmRef.current;
    if (cm && cm.getValue() !== code) {
      skipCmSyncRef.current = true;
      try {
        cm.setValue(code);
      } catch {
        // ignore
      }
    }
    persistDraft(code);
  };

  const onPick = (snip: CommandSnippet) => {
    setSelectedId(snip.id);
    setConfirmDeleteId(null);
    setNewName(snip.name);
    setNewFolder(snip.folder || "");
    writeEditor(snip.code);
    if (narrow) setPhoneTab("code");
  };

  const onUpdateSnippet = () => {
    if (!selectedId) {
      setStatus("Select a snippet to update");
      setStatusOk(false);
      return;
    }
    const name = String(newName || "").trim() || "Snippet";
    const code = String(readEditorCode() || "");
    if (!code.trim()) {
      setStatus("Write a command before saving");
      setStatusOk(false);
      return;
    }
    if (code !== draft) persistDraft(code);
    const folder = String(newFolder || "").trim();
    const next: CommandSnippet[] = [];
    for (let i = 0; i < snippets.length; i++) {
      const row = snippets[i];
      if (row.id !== selectedId) {
        next.push(row);
        continue;
      }
      const snip: CommandSnippet = {
        id: row.id,
        name,
        code,
      };
      if (folder) snip.folder = folder;
      if (row.pinned) snip.pinned = true;
      next.push(snip);
    }
    persistSnippets(next);
    setStatus(
      folder ? `Updated “${name}” in ${folder}` : `Updated “${name}”`,
    );
    setStatusOk(true);
  };

  const onSaveAsSnippet = () => {
    const name = String(newName || "").trim() || "Snippet";
    const code = String(readEditorCode() || "");
    if (!code.trim()) {
      setStatus("Write a command before saving");
      setStatusOk(false);
      return;
    }
    if (code !== draft) persistDraft(code);
    const folder = String(newFolder || "").trim();
    const snip: CommandSnippet = { id: newId(), name, code };
    if (folder) snip.folder = folder;
    const next = snippets.slice();
    next.push(snip);
    persistSnippets(next);
    setSelectedId(snip.id);
    setStatus(folder ? `Saved “${name}” in ${folder}` : `Saved “${name}”`);
    setStatusOk(true);
  };

  const onDelete = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setStatus("Click × again to confirm delete");
      setStatusOk(null);
      return;
    }
    const next: CommandSnippet[] = [];
    for (let i = 0; i < snippets.length; i++) {
      if (snippets[i].id !== id) next.push(snippets[i]);
    }
    persistSnippets(next);
    if (selectedId === id) setSelectedId(null);
    if (lastRunId === id) persistLastRun(null);
    setConfirmDeleteId(null);
    setStatus("Snippet removed");
    setStatusOk(true);
  };

  const onTogglePin = (id: string) => {
    const next: CommandSnippet[] = [];
    for (let i = 0; i < snippets.length; i++) {
      const row = snippets[i];
      if (row.id !== id) {
        next.push(row);
        continue;
      }
      const snip: CommandSnippet = {
        id: row.id,
        name: row.name,
        code: row.code,
      };
      if (row.folder) snip.folder = row.folder;
      if (!row.pinned) snip.pinned = true;
      next.push(snip);
    }
    persistSnippets(next);
  };

  const onReRunLast = () => {
    const snip = findSnippetById(snippets, lastRunId);
    if (!snip) {
      setStatus("No last-run snippet");
      setStatusOk(false);
      return;
    }
    onPick(snip);
    runCode(snip.code, snip.id);
  };

  const onKeyDown = (ev: any) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
      ev.preventDefault();
      onRun();
    }
  };

  const toggleFolder = (key: string) => {
    setCollapsed((prev: Record<string, boolean>) => {
      const next = Object.assign(Object.create(null), prev);
      next[key] = !prev[key];
      return next;
    });
  };

  const inputStyle = {
    fontSize: TYPE.name,
    padding: "6px 9px",
    background: "#141414",
    color: "#eee",
    border: "1px solid #555",
    boxSizing: "border-box",
    textShadow: "none",
    fontWeight: "normal",
  };

  const tree = buildSnippetTree(snippets, snippetQuery);
  const searching = !!snippetQuery.trim();
  const flat = flattenVisibleSnippets(tree, collapsed, searching);
  const hi = flat.length ? Math.min(treeHi, flat.length - 1) : 0;

  const onTreeKeyDown = (ev: any) => {
    if (!flat.length) return;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setTreeHi((hi + 1) % flat.length);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setTreeHi((hi - 1 + flat.length) % flat.length);
    } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      const snip = flat[hi];
      if (snip) {
        onPick(snip);
        runCode(snip.code, snip.id);
      }
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const snip = flat[hi];
      if (snip) onPick(snip);
    }
  };

  const treeNodes: any[] = [];
  for (let f = 0; f < tree.length; f++) {
    const bucket = tree[f];
    const isOpen = searching ? true : !collapsed[bucket.key];
    treeNodes.push(
      e(
        "button",
        {
          key: "folder-" + bucket.key,
          type: "button",
          className: "CommandPanel-folder",
          onClick: () => toggleFolder(bucket.key),
          title: isOpen ? "Collapse" : "Expand",
        },
        e(
          "span",
          { className: "CommandPanel-folder__twist" },
          isOpen ? "▼" : "▶",
        ),
        e("span", {}, bucket.label),
        e(
          "span",
          { style: { color: "#666", marginLeft: "auto", fontSize: "14px" } },
          String(bucket.items.length),
        ),
      ),
    );
    if (!isOpen) continue;
    for (let i = 0; i < bucket.items.length; i++) {
      const snip = bucket.items[i];
      const active = selectedId === snip.id;
      const isLast = lastRunId === snip.id;
      const flatIdx = flat.indexOf(snip);
      const isHi = flatIdx === hi;
      const confirming = confirmDeleteId === snip.id;
      treeNodes.push(
        e(
          "div",
          {
            key: snip.id,
            className:
              "CommandPanel-snip" +
              (active ? " is-on" : "") +
              (isHi ? " is-hi" : "") +
              (isLast ? " is-last" : ""),
          },
          e(
            "button",
            {
              type: "button",
              className: "CommandPanel-snip__pin",
              title: snip.pinned ? "Unpin" : "Pin",
              onClick: () => onTogglePin(snip.id),
            },
            snip.pinned ? "★" : "☆",
          ),
          e(
            "button",
            {
              type: "button",
              className: "CommandPanel-snip__pick",
              title: snip.code,
              onClick: () => {
                setTreeHi(Math.max(0, flatIdx));
                onPick(snip);
              },
            },
            snip.name,
            isLast
              ? e("span", { className: "CommandPanel-snip__last" }, " last")
              : null,
          ),
          e(
            "button",
            {
              type: "button",
              className: "CommandPanel-snip__run",
              title: "Run snippet",
              onClick: () => {
                onPick(snip);
                runCode(snip.code, snip.id);
              },
            },
            "Run",
          ),
          e(
            "button",
            {
              type: "button",
              className:
                "CommandPanel-snip__del" + (confirming ? " is-confirm" : ""),
              title: confirming ? "Confirm delete" : "Delete snippet",
              onClick: () => onDelete(snip.id),
            },
            confirming ? "Yes" : "×",
          ),
        ),
      );
    }
  }

  const editor = cmAvailable
    ? e("div", {
        ref: editorHostRef,
        className: "CommandPanel-editor",
        "data-ecu-tour": "command-editor",
      })
    : e("textarea", {
        ref: textareaRef,
        className: "CommandPanel-editor",
        "data-ecu-tour": "command-editor",
        value: draft,
        spellCheck: false,
        onChange: (ev: any) => persistDraft(ev.target.value),
        onKeyDown,
        placeholder: "loot()\nuse_skill('town')",
        style: Object.assign({}, inputStyle, {
          lineHeight: "1.45",
          fontSize: "18px",
          minHeight: `${COMMAND_CM_HEIGHT_PX}px`,
        }),
      });

  const lastSnip = findSnippetById(snippets, lastRunId);
  // Phone always uses Code|Quick tabs — don't wait for ResizeObserver narrow.
  const usePhoneTabs = phoneUi || narrow;
  const showCode = !usePhoneTabs || phoneTab === "code";
  const showSnippets = !usePhoneTabs || phoneTab === "snippets";
  const hintLabel = phoneUi
    ? "Write code · Save template · Quick to re-run"
    : "observer → code_eval · Ctrl+Enter · Ctrl+Space";

  const toolbar = e(
    "div",
    { className: "CommandPanel-toolbar" },
    e(
      "button",
      {
        type: "button",
        className: "CommandPanel-run",
        onClick: onRun,
        style: btnStyle({ accent: true }),
      },
      "Run",
    ),
    e("input", {
      type: "text",
      value: newName,
      placeholder: phoneUi ? "Template name" : "Snippet name",
      onChange: (ev: any) => setNewName(ev.target.value),
      style: Object.assign({}, inputStyle, {
        flex: "1 1 120px",
        minWidth: "100px",
      }),
    }),
    phoneUi
      ? null
      : e("input", {
          type: "text",
          value: newFolder,
          placeholder: "Folder (optional)",
          onChange: (ev: any) => setNewFolder(ev.target.value),
          style: Object.assign({}, inputStyle, {
            flex: "0 1 110px",
            minWidth: "90px",
          }),
        }),
    selected
      ? e(
          "button",
          {
            type: "button",
            onClick: onUpdateSnippet,
            style: btnStyle({ accent: dirty }),
            title: "Overwrite the selected snippet",
          },
          dirty ? "Update ●" : "Update",
        )
      : null,
    e(
      "button",
      {
        type: "button",
        onClick: onSaveAsSnippet,
        style: btnStyle({ accent: phoneUi && !selected }),
        title: "Save editor as a new template",
      },
      phoneUi ? "Save template" : "Save as",
    ),
  );

  const phoneTabs = usePhoneTabs
    ? e(
        "div",
        {
          className: "CommandPanel-tabs",
          role: "tablist",
          "aria-label": "Command views",
        },
        e(
          "button",
          {
            type: "button",
            role: "tab",
            className:
              "CommandPanel-tab" + (phoneTab === "code" ? " is-active" : ""),
            "aria-selected": phoneTab === "code",
            onClick: () => setPhoneTab("code"),
          },
          "Code",
        ),
        e(
          "button",
          {
            type: "button",
            role: "tab",
            className:
              "CommandPanel-tab" +
              (phoneTab === "snippets" ? " is-active" : ""),
            "aria-selected": phoneTab === "snippets",
            onClick: () => setPhoneTab("snippets"),
          },
          "Quick",
          snippets.length
            ? e(
                "span",
                { className: "CommandPanel-tabCount" },
                String(snippets.length),
              )
            : null,
        ),
      )
    : null;

  const statusEl = e(
    "div",
    {
      className:
        "CommandPanel-status" +
        (statusOk === true
          ? " is-ok"
          : statusOk === false
            ? " is-err"
            : ""),
      style: {
        fontSize: TYPE.body,
        color: status
          ? statusOk === false
            ? "#eaa"
            : statusOk === true
              ? "#9a9"
              : "#aaa"
          : "transparent",
        minHeight: "1.25em",
        flex: "0 0 auto",
      },
    },
    status || "\u00a0",
  );

  const side = e(
    "aside",
    {
      className: "CommandPanel-side",
      "aria-label": "Command snippets",
      tabIndex: 0,
      onKeyDown: onTreeKeyDown,
    },
    e(
      "div",
      { className: "CommandPanel-side__head" },
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            justifyContent: "space-between",
          },
        },
        e("div", { className: "CommandPanel-side__title" }, "Snippets"),
        lastSnip
          ? e(
              "button",
              {
                type: "button",
                className: "CommandPanel-rerun",
                title: "Re-run “" + lastSnip.name + "”",
                onClick: onReRunLast,
              },
              "Re-run",
            )
          : null,
      ),
      e("input", {
        type: "search",
        value: snippetQuery,
        placeholder: phoneUi ? "Search snippets…" : "Search… ↑↓ Enter",
        onChange: (ev: any) => {
          setSnippetQuery(ev.target.value);
          setTreeHi(0);
        },
        style: Object.assign({}, inputStyle, {
          width: "100%",
          fontSize: TYPE.body,
          padding: "4px 8px",
        }),
      }),
    ),
    treeNodes.length
      ? e("div", { className: "CommandPanel-tree" }, ...treeNodes)
      : e(
          "div",
          { className: "CommandPanel-empty" },
          snippets.length
            ? "No snippets match this search."
            : phoneUi
              ? e(
                  React.Fragment,
                  null,
                  e(
                    "div",
                    null,
                    "No templates yet — write code, then Save template.",
                  ),
                  e(
                    "button",
                    {
                      type: "button",
                      className: "CommandPanel-empty__code",
                      onClick: () => setPhoneTab("code"),
                    },
                    "Open Code",
                  ),
                )
              : "No snippets yet — write a command and Save as.",
        ),
  );

  return e(
    "div",
    {
      ref: rootRef,
      className:
        "CommandPanel" +
        (narrow ? " is-narrow" : "") +
        (phoneUi ? " is-phone" : "") +
        (expanded ? " is-expanded" : "") +
        (usePhoneTabs ? " is-phone-tabs" : "") +
        (usePhoneTabs ? " tab-" + phoneTab : ""),
      "data-ecu-panel": "command",
      "data-ecu-tour": "command-panel",
      style: {
        border: "2px solid #555",
        background: "rgba(0,0,0,0.88)",
        padding: "12px",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
        fontSize: TYPE.name,
        color: "#eee",
        textShadow: "none",
        fontWeight: "normal",
        pointerEvents: "auto",
      },
    },
    e(
      "div",
      {
        ref: headRef,
        className: "CommandPanel-head",
      },
      e(
        "div",
        { className: "CommandPanel-title" },
        "Command",
        dirty
          ? e(
              "span",
              {
                className: "CommandPanel-dirty",
                title: "Editor differs from selected snippet",
              },
              " · edited",
            )
          : null,
      ),
      e("div", { className: "CommandPanel-sub" }, hintLabel),
      e("span", { className: "CommandPanel-headGrow" }),
      e(PanelExpandButton, {
        expanded,
        onToggle: () => setExpanded(!expanded),
        expandTitle: "Expand command",
        restoreTitle: "Restore command size",
        className: "CommandPanel-expand",
      }),
    ),
    !phoneUi ? phoneTabs : null,
    e(
      "div",
      { className: "CommandPanel-body" },
      showCode
        ? e(
            "div",
            { className: "CommandPanel-main" },
            editor,
            phoneUi ? null : toolbar,
            phoneUi ? null : statusEl,
          )
        : null,
      showSnippets ? side : null,
    ),
    phoneUi
      ? e(
          "div",
          { className: "CommandPanel-phoneFoot" },
          phoneTab === "code" ? toolbar : null,
          phoneTab === "code" ? statusEl : null,
          phoneTabs,
          props.onRequestClose
            ? e(
                "button",
                {
                  type: "button",
                  className: "CommandPanel-phoneDone",
                  onClick: () =>
                    props.onRequestClose && props.onRequestClose(),
                },
                "Done",
              )
            : null,
        )
      : null,
  );
}
