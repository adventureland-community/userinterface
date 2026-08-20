import { getReact, e } from "../../host/react";
import { emitObserverCommand } from "../../host/al";
import {
  COMMAND_CM_HEIGHT_PX,
  disposeCodeMirror,
  getHostCodeMirror,
  mountCommandCodeMirror,
  type CodeMirrorEditor,
} from "../../host/codemirror";
import {
  loadSettings,
  saveSettings,
  type CommandSnippet,
} from "../../lib/settings";
import { TYPE } from "../../lib/typeScale";

export type CommandPanelProps = {
  /** External prefill (stock show_commander / open hook). */
  seedDraft?: string | null;
  /** Bumps when COMMAND is opened so seedDraft re-applies. */
  openSeq?: number;
};

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
  const seedDraft = props.seedDraft;
  const openSeq = props.openSeq || 0;

  const [draft, setDraft] = React.useState(
    () => loadSettings().commandDraft || "",
  );
  const [snippets, setSnippets] = React.useState(
    () => loadSettings().commandSnippets.slice() as CommandSnippet[],
  );
  const [newName, setNewName] = React.useState("");
  const [newFolder, setNewFolder] = React.useState("");
  const [snippetQuery, setSnippetQuery] = React.useState("");
  const [folderFilter, setFolderFilter] = React.useState("all");
  const [status, setStatus] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(null as string | null);
  const [cmAvailable] = React.useState(() => !!getHostCodeMirror());

  const editorHostRef = React.useRef(null as HTMLDivElement | null);
  const textareaRef = React.useRef(null as HTMLTextAreaElement | null);
  const cmRef = React.useRef(null as CodeMirrorEditor | null);
  const skipCmSyncRef = React.useRef(false);
  const draftRef = React.useRef(draft);
  const persistDraftRef = React.useRef((value: string) => {
    setDraft(value);
    saveSettings({ commandDraft: value });
  });
  const runCodeRef = React.useRef((_code: string) => {});

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

  const runCode = (code: string) => {
    const ok = emitObserverCommand(code);
    if (ok) {
      setStatus("Sent to observed character");
    } else {
      setStatus("No socket or empty command");
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

  const onRun = () => {
    runCode(readEditorCode());
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
        cm.refresh();
      } catch {
        // ignore
      }
    }

    return () => {
      disposeCodeMirror(host);
      cmRef.current = null;
    };
  }, [cmAvailable]);

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
        cm.refresh();
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
    // skipCmSyncRef means React draft was driven by a CM change — but if a
    // snippet/seed update batched in the same turn, CM may still be stale.
    if (skipCmSyncRef.current) {
      skipCmSyncRef.current = false;
      if (cm.getValue() === draft) return;
    }
    if (cm.getValue() !== draft) {
      skipCmSyncRef.current = true;
      cm.setValue(draft);
    }
  }, [draft]);

  const onSaveSnippet = () => {
    const name = String(newName || "").trim() || "Snippet";
    const code = String(readEditorCode() || "");
    if (!code.trim()) {
      setStatus("Write a command before saving");
      return;
    }
    if (code !== draft) persistDraft(code);
    const folder = String(newFolder || "").trim();
    const snip: CommandSnippet = { id: newId(), name, code };
    if (folder) snip.folder = folder;
    const next = snippets.slice();
    next.push(snip);
    persistSnippets(next);
    setNewName("");
    setStatus(folder ? `Saved “${name}” in ${folder}` : `Saved “${name}”`);
  };

  const onDelete = (id: string) => {
    const next: CommandSnippet[] = [];
    for (let i = 0; i < snippets.length; i++) {
      if (snippets[i].id !== id) next.push(snippets[i]);
    }
    persistSnippets(next);
    if (selectedId === id) setSelectedId(null);
    setStatus("Snippet removed");
  };

  const onPick = (snip: CommandSnippet) => {
    setSelectedId(snip.id);
    const cm = cmRef.current;
    if (cm && cm.getValue() !== snip.code) {
      skipCmSyncRef.current = true;
      try {
        cm.setValue(snip.code);
      } catch {
        // ignore
      }
    }
    persistDraft(snip.code);
  };

  const onKeyDown = (ev: any) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
      ev.preventDefault();
      onRun();
    }
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

  const folders: string[] = [];
  for (let i = 0; i < snippets.length; i++) {
    const f = snippets[i].folder;
    if (f && folders.indexOf(f) < 0) folders.push(f);
  }
  folders.sort((a, b) => a.localeCompare(b));

  const q = snippetQuery.trim().toLowerCase();
  const filtered: CommandSnippet[] = [];
  for (let i = 0; i < snippets.length; i++) {
    const snip = snippets[i];
    if (folderFilter === "__none__" && snip.folder) continue;
    if (
      folderFilter !== "all" &&
      folderFilter !== "__none__" &&
      (snip.folder || "") !== folderFilter
    ) {
      continue;
    }
    if (q) {
      const hay =
        `${snip.name} ${snip.code} ${snip.folder || ""}`.toLowerCase();
      if (hay.indexOf(q) < 0) continue;
    }
    filtered.push(snip);
  }

  const snippetRows: any[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const snip = filtered[i];
    const active = selectedId === snip.id;
    const preview = snip.code.replace(/\s+/g, " ").trim();
    snippetRows.push(
      e(
        "div",
        {
          key: snip.id,
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 7px",
            border: active ? "1px solid #a86" : "1px solid #3a3a3a",
            background: active ? "rgba(60,50,20,0.55)" : "rgba(18,18,18,0.9)",
          },
        },
        e(
          "button",
          {
            type: "button",
            onClick: () => onPick(snip),
            title: snip.code,
            style: {
              flex: 1,
              minWidth: 0,
              textAlign: "left",
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: "#eee",
              padding: 0,
              fontSize: TYPE.name,
              lineHeight: "1.3",
              textShadow: "none",
              fontWeight: "normal",
            },
          },
          e(
            "div",
            {
              style: {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            snip.folder
              ? e(
                  "span",
                  {},
                  e(
                    "span",
                    { style: { color: "#a86", marginRight: "6px" } },
                    snip.folder,
                  ),
                  snip.name,
                )
              : snip.name,
          ),
          e(
            "div",
            {
              style: {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "#999",
                fontSize: TYPE.body,
                marginTop: "2px",
              },
            },
            preview || "(empty)",
          ),
        ),
        e(
          "button",
          {
            type: "button",
            title: "Run snippet",
            onClick: () => {
              onPick(snip);
              runCode(snip.code);
            },
            style: btnStyle({ accent: true }),
          },
          "Run",
        ),
        e(
          "button",
          {
            type: "button",
            title: "Delete snippet",
            onClick: () => onDelete(snip.id),
            style: btnStyle({ danger: true }),
          },
          "×",
        ),
      ),
    );
  }

  const editor = cmAvailable
    ? e("div", {
        ref: editorHostRef,
        className: "CommandPanel-editor",
        style: {
          width: "100%",
          minWidth: 0,
          alignSelf: "stretch",
        },
      })
    : e("textarea", {
        ref: textareaRef,
        value: draft,
        rows: 14,
        spellCheck: false,
        onChange: (ev: any) => persistDraft(ev.target.value),
        onKeyDown,
        placeholder: "loot()\n// or any CODE for the watched character",
        style: Object.assign({}, inputStyle, {
          width: "100%",
          resize: "vertical",
          minHeight: `${COMMAND_CM_HEIGHT_PX}px`,
          height: `${COMMAND_CM_HEIGHT_PX}px`,
          lineHeight: "1.4",
          boxSizing: "border-box",
        }),
      });

  return e(
    "div",
    {
      className: "CommandPanel",
      style: {
        display: "flex",
        flexDirection: "column",
        border: "2px solid #555",
        background: "rgba(0,0,0,0.88)",
        gap: "10px",
        padding: "12px",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        maxHeight: "78vh",
        overflowX: "hidden",
        overflowY: "auto",
        boxSizing: "border-box",
        fontSize: TYPE.name,
        color: "#eee",
        textShadow: "none",
        fontWeight: "normal",
      },
    },
    e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "8px",
        },
      },
      e("div", { style: { fontSize: "20px", color: "#ffe08a" } }, "Command"),
      e(
        "div",
        { style: { fontSize: TYPE.body, color: "#aaa" } },
        "observer → code_eval · Ctrl+Enter",
      ),
    ),
    editor,
    e(
      "div",
      {
        style: {
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        },
      },
      e(
        "button",
        {
          type: "button",
          onClick: onRun,
          style: btnStyle({ accent: true }),
        },
        "Run",
      ),
      e("input", {
        type: "text",
        value: newName,
        placeholder: "Snippet name",
        onChange: (ev: any) => setNewName(ev.target.value),
        style: Object.assign({}, inputStyle, {
          flex: "1 1 140px",
          minWidth: "120px",
        }),
      }),
      e("input", {
        type: "text",
        value: newFolder,
        placeholder: "Folder (optional)",
        onChange: (ev: any) => setNewFolder(ev.target.value),
        style: Object.assign({}, inputStyle, {
          flex: "0 1 120px",
          minWidth: "100px",
        }),
      }),
      e(
        "button",
        {
          type: "button",
          onClick: onSaveSnippet,
          style: btnStyle(),
        },
        "Save snippet",
      ),
    ),
    status
      ? e("div", { style: { fontSize: TYPE.body, color: "#9a9" } }, status)
      : null,
    e(
      "div",
      {
        style: {
          fontSize: TYPE.name,
          color: "#ccc",
          borderTop: "1px solid #333",
          paddingTop: "8px",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
        },
      },
      e("span", {}, "Snippets"),
      e("input", {
        type: "search",
        value: snippetQuery,
        placeholder: "Search…",
        onChange: (ev: any) => setSnippetQuery(ev.target.value),
        style: Object.assign({}, inputStyle, {
          flex: "1 1 140px",
          minWidth: "120px",
          fontSize: TYPE.body,
          padding: "4px 8px",
        }),
      }),
      e(
        "select",
        {
          value: folderFilter,
          onChange: (ev: any) => setFolderFilter(ev.target.value),
          style: Object.assign({}, inputStyle, {
            flex: "0 1 140px",
            fontSize: TYPE.body,
            padding: "4px 8px",
          }),
        },
        e("option", { value: "all" }, "All folders"),
        e("option", { value: "__none__" }, "No folder"),
        ...folders.map((f) => e("option", { key: f, value: f }, f)),
      ),
    ),
    snippetRows.length
      ? e(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            },
          },
          ...snippetRows,
        )
      : e(
          "div",
          { style: { fontSize: TYPE.body, color: "#777" } },
          snippets.length
            ? "No snippets match this search/folder."
            : "No snippets yet — write a command and Save snippet.",
        ),
  );
}
