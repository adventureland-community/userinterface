import { getReact, e } from "../../../host/react";
import {
  deleteMailRows,
  filterMails,
  getMailCapabilities,
  getMailSnapshot,
  openCompose,
  openMailRow,
  replyToMail,
  setMailView,
  subscribeMailStore,
  takeMailCommand,
  undoDeleteMail,
  type MailPill,
  type MailRow,
} from "../../../host/mail";
import { loadSettings, saveSettings } from "../../../lib/settings";
import { ensureMailCss } from "./mailCss";
import { selfCharacterNames } from "./mailFormat";
import { MailBannerBar } from "./MailBannerBar";
import { MailComposePane } from "./MailComposePane";
import { MailListPane } from "./MailListPane";
import { MailReadPane } from "./MailReadPane";
import { MailToolbar } from "./MailToolbar";

export type MailPanelProps = {
  layoutEdit?: boolean;
};

function useMailSnap() {
  const React = getReact();
  const [snap, setSnap] = React.useState(() => getMailSnapshot());
  React.useEffect(() => subscribeMailStore(() => setSnap(getMailSnapshot())), []);
  return snap;
}

export function MailPanel(_props: MailPanelProps): any {
  const React = getReact();
  ensureMailCss();
  const snap = useMailSnap();
  // Re-sample window.observing so Send/Character update when observe starts/stops.
  const [, setObsTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setObsTick((n: number) => n + 1), 2000);
    return () => window.clearInterval(id);
  }, []);
  // Touch observe snap each poll so caps/Send refresh when watching starts.
  void (window.observing && window.observing.name);
  const [pill, setPill] = React.useState(() => {
    try {
      const raw = loadSettings().mailPill;
      const allowed = ["all", "unread", "item", "tome", "fromme"];
      return (allowed.indexOf(String(raw)) >= 0 ? raw : "all") as MailPill;
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
  const [expandedKeys, setExpandedKeys] = React.useState(
    {} as Record<string, boolean>,
  );
  const [query, setQuery] = React.useState("");
  const [toInput, setToInput] = React.useState("");
  const [suggestOpen, setSuggestOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState(
    {} as Record<string, boolean>,
  );
  const wide =
    typeof window !== "undefined" && window.innerWidth >= 900;

  const selfNames = selfCharacterNames();
  const draftAttachesList =
    snap.view.kind === "compose" ? snap.view.draft.attaches.slice() : [];
  const draftToCount =
    snap.view.kind === "compose" ? Math.max(1, snap.view.draft.to.length) : 1;
  const caps = getMailCapabilities(draftAttachesList, draftToCount);

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
  const setGroupExpanded = (key: string, on: boolean) => {
    setExpandedKeys((prev: Record<string, boolean>) => {
      const next = { ...prev };
      if (on) next[key] = true;
      else delete next[key];
      return next;
    });
  };
  const filtered = filterMails(snap.mails, { pill, query, selfNames });

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
    if (row && row.item && !row.taken) takeableCheckedIds.push(row.id);
  }

  const className =
    "comm-mail" +
    (wide ? "" : " is-narrow") +
    (isReading ? " is-reading" : "") +
    (isCompose ? " is-compose" : "");

  const toggleCheck = (id: string, on: boolean) => {
    setSelectedIds((prev: Record<string, boolean>) => {
      const next = { ...prev };
      if (on) next[id] = true;
      else delete next[id];
      return next;
    });
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

  let pane: any = e("div", { className: "comm-mail__empty" }, "Select a message");
  if (isCompose) {
    pane = e(MailComposePane, {
      snap,
      wide,
      selfNames,
      toInput,
      setToInput,
      suggestOpen,
      setSuggestOpen,
    });
  } else if (selected) {
    pane = e(MailReadPane, { snap, selected, wide, doDelete });
  }

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
        }
        if (ev.key === "j" || ev.key === "k") {
          let idx = -1;
          for (let i = 0; i < filtered.length; i++) {
            if (selected && filtered[i].id === selected.id) {
              idx = i;
              break;
            }
          }
          const next = ev.key === "j" ? idx + 1 : idx - 1;
          if (next >= 0 && next < filtered.length) {
            void openMailRow(filtered[next].id);
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
              : selected && selected.item && !selected.taken
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
      collapseRepeats,
      setCollapseRepeats: setCollapsePersist,
    }),
    e(MailBannerBar, { snap, caps }),
    e(
      "div",
      { className: "comm-mail__body" },
      e(MailListPane, {
        snap,
        filtered,
        selected,
        selectedIds,
        toggleCheck,
        collapseRepeats,
        expandedKeys,
        setGroupExpanded,
      }),
      e("div", { className: "comm-mail__pane" }, pane),
    ),
  );
}
