import { e } from "../../../host/react";
import {
  markAllUnreadRead,
  markVisibleRead,
  openCompose,
  requestMailHead,
  takeMailCommand,
  type MailPill,
  type MailRow,
  type MailStoreSnapshot,
} from "../../../host/mail";
import { MailSearchBar } from "./MailSearchBar";

export type MailToolbarProps = {
  snap: MailStoreSnapshot;
  pill: MailPill;
  setPillPersist: (p: MailPill) => void;
  query: string;
  setQuery: (q: string) => void;
  filtered: MailRow[];
  checkedIds: string[];
  takeableCheckedIds: string[];
  canTake: boolean;
  doDelete: (ids: string[]) => void;
  setSelectedIds: (ids: Record<string, boolean>) => void;
  collapseRepeats: boolean;
  setCollapseRepeats: (on: boolean) => void;
};

export function MailToolbar(props: MailToolbarProps): any {
  const {
    snap,
    pill,
    setPillPersist,
    query,
    setQuery,
    filtered,
    checkedIds,
    takeableCheckedIds,
    canTake,
    doDelete,
    setSelectedIds,
    collapseRepeats,
    setCollapseRepeats,
  } = props;

  return e(
    "div",
    { className: "comm-mail__toolbar" },
    e(MailSearchBar, {
      query,
      setQuery,
      pill,
      setPillPersist,
    }),
    e(
      "div",
      { className: "comm-mail__toolbar-actions" },
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__pill" + (collapseRepeats ? " is-on" : ""),
          title:
            "Stack identical sends (same from/to + subject/body, or same item)",
          onClick: () => setCollapseRepeats(!collapseRepeats),
        },
        "Stack",
      ),
      pill === "unread"
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn",
              onClick: () => {
                void markAllUnreadRead();
              },
            },
            "Mark all read",
          )
        : null,
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn comm-mail__btn--gold",
          onClick: () => openCompose(),
        },
        "Compose",
      ),
      filtered.length
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn",
              title:
                checkedIds.length === filtered.length
                  ? "Clear selection"
                  : "Select all messages in the current search / filter",
              onClick: () => {
                if (checkedIds.length === filtered.length) {
                  setSelectedIds({});
                  return;
                }
                const next: Record<string, boolean> = {};
                for (let i = 0; i < filtered.length; i++) {
                  next[filtered[i].id] = true;
                }
                setSelectedIds(next);
              },
            },
            checkedIds.length === filtered.length
              ? "Clear selection"
              : "Select all " + filtered.length,
          )
        : null,
      checkedIds.length
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn",
              onClick: () => {
                void doDelete(checkedIds);
              },
            },
            "Delete " + checkedIds.length,
          )
        : null,
      takeableCheckedIds.length
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn comm-mail__btn--gold",
              disabled: !canTake || snap.commandBusy,
              onClick: () => {
                takeMailCommand(takeableCheckedIds);
                setSelectedIds({});
              },
            },
            snap.commandBusy ? "Working…" : "Take " + takeableCheckedIds.length,
          )
        : null,
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn",
          onClick: () => {
            const ids: string[] = [];
            for (let i = 0; i < filtered.length; i++) {
              ids.push(filtered[i].id);
            }
            void markVisibleRead(ids);
          },
        },
        "Mark read",
      ),
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn",
          onClick: () => {
            void requestMailHead("Refresh", { force: true });
          },
        },
        "Refresh",
      ),
    ),
  );
}
