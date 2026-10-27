import { getReact, e } from "../../../host/react";
import {
  aggregateMailItems,
  deleteMailRows,
  filterMails,
  getMailCapabilities,
  getMailObservingSnap,
  getMailSnapshot,
  mailSearchEmptyHint,
  mailSearchWantsBurst,
  openCompose,
  openMailRow,
  replyToMail,
  setMailSearchBurst,
  setMailView,
  subscribeMailItemsCue,
  subscribeMailStore,
  takeMailCommand,
  undoDeleteMail,
  type MailAggItem,
  type MailPill,
  type MailRow,
} from "../../../host/mail";
import { loadSettings, saveSettings } from "../../../lib/settings";
import { ensureMailCss } from "./mailCss";
import { selfCharacterNames } from "./mailFormat";
import { MailBannerBar } from "./MailBannerBar";
import { MailComposePane } from "./MailComposePane";
import { MailItemMailsPane } from "./MailItemMailsPane";
import { MailItemsPane, type MailItemsGroup } from "./MailItemsPane";
import { MailListPane } from "./MailListPane";
import { MailReadPane } from "./MailReadPane";
import { MailToolbar, type MailBrowseMode } from "./MailToolbar";

function useMailSnap() {
  const React = getReact();
  const [snap, setSnap] = React.useState(() => getMailSnapshot());
  React.useEffect(
    () => subscribeMailStore(() => setSnap(getMailSnapshot())),
    [],
  );
  return snap;
}

/** Poll window.observing so Character/Send track observe start/stop and gold. */
function useMailObservingSnap() {
  const React = getReact();
  const read = () => getMailObservingSnap();
  const fpOf = (obs: ReturnType<typeof getMailObservingSnap>) => {
    if (!obs) return "";
    return String(obs.name || "") + "\0" + String(obs.gold ?? "");
  };
  const [obs, setObs] = React.useState(read);
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const next = read();
      setObs((prev: ReturnType<typeof getMailObservingSnap>) =>
        fpOf(prev) === fpOf(next) ? prev : next,
      );
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  return obs;
}

export function MailPanel(): any {
  const React = getReact();
  ensureMailCss();
  const snap = useMailSnap();
  const mailObs = useMailObservingSnap();
  const [pill, setPill] = React.useState(() => {
    try {
      const raw = loadSettings().mailPill;
      const allowed = ["all", "unread", "item", "tome", "fromme"];
      const next = (
        allowed.indexOf(String(raw)) >= 0 ? raw : "all"
      ) as MailPill;
      // Roster may not be ready yet — avoid empty To me / From me.
      if (
        (next === "tome" || next === "fromme") &&
        !selfCharacterNames().length
      ) {
        return "all" as MailPill;
      }
      return next;
    } catch {
      return "all" as MailPill;
    }
  });
  const [collapseRepeats, setCollapseRepeats] = React.useState(() => {
    try {
      return loadSettings().mailCollapseRepeats !== false;
    } catch {
      return true;
    }
  });
  const [browseMode, setBrowseMode] = React.useState(() => {
    try {
      return loadSettings().mailBrowseMode === "items"
        ? ("items" as MailBrowseMode)
        : ("messages" as MailBrowseMode);
    } catch {
      return "messages" as MailBrowseMode;
    }
  });
  const [itemsGroup, setItemsGroup] = React.useState(() => {
    try {
      return loadSettings().mailItemsGroup === "recipient"
        ? ("recipient" as MailItemsGroup)
        : ("all" as MailItemsGroup);
    } catch {
      return "all" as MailItemsGroup;
    }
  });
  const [selectedItemKey, setSelectedItemKey] = React.useState(
    null as string | null,
  );
  const [selectedItemMailIds, setSelectedItemMailIds] = React.useState(
    null as string[] | null,
  );
  const [focusRecipient, setFocusRecipient] = React.useState(
    null as string | null,
  );
  const [focusToken, setFocusToken] = React.useState(0);
  const [expandedKeys, setExpandedKeys] = React.useState(
    {} as Record<string, boolean>,
  );
  const [query, setQuery] = React.useState("");
  const [toInput, setToInput] = React.useState("");
  const [suggestOpen, setSuggestOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState(
    {} as Record<string, boolean>,
  );
  const wide = typeof window !== "undefined" && window.innerWidth >= 900;

  const selfNames = selfCharacterNames();
  const draftAttachesList =
    snap.view.kind === "compose" ? snap.view.draft.attaches.slice() : [];
  const draftToCount =
    snap.view.kind === "compose" ? Math.max(1, snap.view.draft.to.length) : 1;
  const caps = getMailCapabilities(draftAttachesList, draftToCount, mailObs);

  const setPillPersist = (next: MailPill) => {
    setPill(next);
    try {
      saveSettings({ mailPill: next });
    } catch {
      /* ignore */
    }
  };
  const setCollapsePersist = (on: boolean) => {
    setCollapseRepeats(on);
    if (!on) setExpandedKeys({});
    try {
      saveSettings({ mailCollapseRepeats: on });
    } catch {
      /* ignore */
    }
  };
  const setBrowseModePersist = (mode: MailBrowseMode) => {
    setBrowseMode(mode);
    if (mode === "messages") {
      setSelectedItemKey(null);
      setSelectedItemMailIds(null);
    }
    try {
      saveSettings({ mailBrowseMode: mode });
    } catch {
      /* ignore */
    }
  };
  const setItemsGroupPersist = (g: MailItemsGroup) => {
    setItemsGroup(g);
    try {
      saveSettings({ mailItemsGroup: g });
    } catch {
      /* ignore */
    }
  };
  const setGroupExpanded = (key: string, on: boolean) => {
    setExpandedKeys((prev: Record<string, boolean>) => {
      const next = { ...prev };
      if (on) next[key] = true;
      else delete next[key];
      return next;
    });
  };
  const filtered = filterMails(snap.mails, { pill, query, selfNames });

  React.useEffect(() => {
    return subscribeMailItemsCue((cue) => {
      setBrowseMode("items");
      setItemsGroup("recipient");
      setSelectedItemKey(null);
      setSelectedItemMailIds(null);
      setSelectedIds({});
      setFocusRecipient(cue.recipient);
      setFocusToken((n: number) => n + 1);
      try {
        saveSettings({
          mailBrowseMode: "items",
          mailItemsGroup: "recipient",
        });
      } catch {
        /* ignore */
      }
      const view = getMailSnapshot().view;
      if (view.kind === "read" || view.kind === "compose") {
        setMailView({ kind: "list" });
      }
    });
  }, []);

  React.useEffect(() => {
    const burst = mailSearchWantsBurst({
      query,
      hasMore: snap.hasMore,
    });
    setMailSearchBurst(burst);
    return () => {
      setMailSearchBurst(false);
    };
  }, [query, snap.hasMore]);

  const searchEmptyHint = mailSearchEmptyHint({
    query,
    hasMore: snap.hasMore,
    matchCount: filtered.length,
    loadedCount: snap.mails.length,
  });

  let selected: MailRow | null = null;
  if (snap.view.kind === "read") {
    for (let i = 0; i < snap.mails.length; i++) {
      if (snap.mails[i].id === snap.view.id) {
        selected = snap.mails[i];
        break;
      }
    }
  }

  const isReading = snap.view.kind === "read";
  const isCompose = snap.view.kind === "compose";
  const checkedIds: string[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (selectedIds[filtered[i].id]) checkedIds.push(filtered[i].id);
  }
  const takeableCheckedIds: string[] = [];
  for (let i = 0; i < checkedIds.length; i++) {
    let row: MailRow | null = null;
    for (let j = 0; j < snap.mails.length; j++) {
      if (snap.mails[j].id === checkedIds[i]) {
        row = snap.mails[j];
        break;
      }
    }
    if (row && row.item && !row.taken && row.canTake !== false) {
      takeableCheckedIds.push(row.id);
    }
  }

  const itemsMode = browseMode === "items";
  const selectedItemMails: MailRow[] = (() => {
    if (!itemsMode || !selectedItemMailIds || !selectedItemMailIds.length) {
      return [];
    }
    const want = new Set(selectedItemMailIds);
    const out: MailRow[] = [];
    for (let i = 0; i < filtered.length; i++) {
      if (want.has(filtered[i].id)) out.push(filtered[i]);
    }
    return out;
  })();
  const selectedAggResolved: MailAggItem | null = (() => {
    if (!itemsMode || !selectedItemKey || !selectedItemMails.length) return null;
    const rebuilt = aggregateMailItems(selectedItemMails);
    for (let i = 0; i < rebuilt.length; i++) {
      if (rebuilt[i].key === selectedItemKey) return rebuilt[i];
    }
    // Key drift (level/title) — fall back to first rebuilt stack.
    return rebuilt[0] || null;
  })();

  const className =
    "comm-mail" +
    (wide ? "" : " is-narrow") +
    (isReading ? " is-reading" : "") +
    (isCompose ? " is-compose" : "") +
    (itemsMode ? " is-items" : "");

  const toggleCheck = (id: string, on: boolean) => {
    setSelectedIds((prev: Record<string, boolean>) => {
      const next = { ...prev };
      if (on) next[id] = true;
      else delete next[id];
      return next;
    });
  };

  const onSelectItem = (agg: MailAggItem) => {
    setSelectedItemKey(agg.key);
    setSelectedItemMailIds(agg.mailIds.slice());
    const next: Record<string, boolean> = {};
    for (let i = 0; i < agg.mailIds.length; i++) {
      next[agg.mailIds[i]] = true;
    }
    setSelectedIds(next);
    if (snap.view.kind === "read" || snap.view.kind === "compose") {
      setMailView({ kind: "list" });
    }
  };

  const doDelete = async (ids: string[]) => {
    const result = await deleteMailRows(ids);
    if (result === "need-confirm") {
      const ok = window.confirm(
        ids.length === 1
          ? "This mail still has an untaken item. Delete anyway?"
          : "Some selected mail still has untaken items. Delete anyway?",
      );
      if (!ok) return;
      await deleteMailRows(ids, { confirmed: true });
    }
    setSelectedIds({});
  };

  let pane: any = e(
    "div",
    { className: "comm-mail__empty" },
    itemsMode ? "Select an item" : "Select a message",
  );
  if (isCompose) {
    pane = e(MailComposePane, {
      snap,
      wide,
      selfNames,
      caps,
      toInput,
      setToInput,
      suggestOpen,
      setSuggestOpen,
    });
  } else if (selected) {
    pane = e(MailReadPane, { snap, selected, wide, caps, doDelete });
  } else if (itemsMode && selectedAggResolved) {
    pane = e(MailItemMailsPane, {
      snap,
      agg: selectedAggResolved,
      mails: selectedItemMails,
      selected,
      selectedIds,
      toggleCheck,
      canTake: caps.canTake,
      setSelectedIds,
    });
  }

  const navPool =
    itemsMode && selectedItemMails.length ? selectedItemMails : filtered;

  return e(
    "div",
    {
      className,
      tabIndex: 0,
      onKeyDown: (ev: any) => {
        const tag = (ev.target && ev.target.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (ev.key === "c") {
          ev.preventDefault();
          openCompose();
        }
        if (ev.key === "r" && selected) {
          ev.preventDefault();
          replyToMail(selected);
        }
        if (ev.key === "Escape") {
          if (isCompose || (isReading && !wide)) setMailView({ kind: "list" });
          else if (itemsMode && selectedItemKey) {
            setSelectedItemKey(null);
            setSelectedItemMailIds(null);
            setSelectedIds({});
          }
        }
        if (ev.key === "j" || ev.key === "k") {
          let idx = -1;
          for (let i = 0; i < navPool.length; i++) {
            if (selected && navPool[i].id === selected.id) {
              idx = i;
              break;
            }
          }
          const next = ev.key === "j" ? idx + 1 : idx - 1;
          if (next >= 0 && next < navPool.length) {
            void openMailRow(navPool[next].id);
          }
        }
        if ((ev.key === "Delete" || ev.key === "#") && selected) {
          void doDelete(checkedIds.length ? checkedIds : [selected.id]);
        }
        if (ev.key === "u") undoDeleteMail();
        if (ev.key === "t") {
          const takeIds =
            takeableCheckedIds.length > 0
              ? takeableCheckedIds
              : selected &&
                  selected.item &&
                  !selected.taken &&
                  selected.canTake !== false
                ? [selected.id]
                : [];
          if (takeIds.length && caps.canTake && !snap.commandBusy) {
            ev.preventDefault();
            takeMailCommand(takeIds);
            setSelectedIds({});
          }
        }
      },
    },
    e(MailToolbar, {
      snap,
      pill,
      setPillPersist,
      query,
      setQuery,
      filtered,
      checkedIds,
      takeableCheckedIds,
      canTake: caps.canTake,
      doDelete,
      setSelectedIds,
      selectedIds,
      collapseRepeats,
      setCollapseRepeats: setCollapsePersist,
      browseMode,
      setBrowseMode: setBrowseModePersist,
      selectedItemMailIds,
    }),
    e(MailBannerBar, { snap, caps }),
    e(
      "div",
      { className: "comm-mail__body" },
      itemsMode
        ? e(MailItemsPane, {
            snap,
            filtered,
            itemsGroup,
            setItemsGroup: setItemsGroupPersist,
            selectedItemKey,
            selectedItemMailIds,
            onSelectItem,
            focusRecipient,
            focusToken,
          })
        : e(MailListPane, {
            snap,
            filtered,
            selected,
            selectedIds,
            toggleCheck,
            collapseRepeats,
            expandedKeys,
            setGroupExpanded,
            searchEmptyHint,
          }),
      e(
        "div",
        {
          className:
            "comm-mail__pane" +
            (itemsMode && selectedAggResolved && !selected && !isCompose
              ? " is-item-mails"
              : ""),
        },
        pane,
      ),
    ),
  );
}
