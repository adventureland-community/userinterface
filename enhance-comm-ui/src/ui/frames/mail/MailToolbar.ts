import { e } from "../../../host/react";
import {
  mailIdsForItemsSelectAll,
  markAllUnreadRead,
  markVisibleRead,
  openCompose,
  requestMailCacheRefresh,
  takeMailCommand,
  type MailPill,
  type MailRow,
  type MailStoreSnapshot,
} from "../../../host/mail";
import { MailSearchBar } from "./MailSearchBar";

export type MailBrowseMode = "messages" | "items";

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
  browseMode: MailBrowseMode;
  setBrowseMode: (mode: MailBrowseMode) => void;
  /** Items-mode stack selection (mail ids for the highlighted tile). */
  selectedItemMailIds: string[] | null;
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
    browseMode,
    setBrowseMode,
    selectedItemMailIds,
  } = props;

  const itemsMode = browseMode === "items";
  const itemsSelect = itemsMode
    ? mailIdsForItemsSelectAll(filtered, selectedItemMailIds)
    : null;
  const selectTargetIds = itemsSelect
    ? itemsSelect.ids
    : filtered.map((m) => m.id);
  const selectHasStack = !!(itemsSelect && itemsSelect.kind === "stack");

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
        "div",
        {
          className: "comm-mail__items-seg",
          role: "group",
          title: "Messages list or bank-style item inventory",
        },
        e(
          "button",
          {
            type: "button",
            className:
              "comm-mail__items-seg-btn" +
              (browseMode === "messages" ? " is-on" : ""),
            onClick: () => setBrowseMode("messages"),
          },
          "Messages",
        ),
        e(
          "button",
          {
            type: "button",
            className:
              "comm-mail__items-seg-btn" +
              (browseMode === "items" ? " is-on" : ""),
            onClick: () => setBrowseMode("items"),
          },
          "Items",
        ),
      ),
      browseMode === "messages"
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__pill" + (collapseRepeats ? " is-on" : ""),
              title:
                "Stack identical sends (same from/to + subject/body, or same item)",
              onClick: () => setCollapseRepeats(!collapseRepeats),
            },
            "Stack",
          )
        : null,
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
      checkedIds.length
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn",
              title: "Clear every checked mail",
              onClick: () => setSelectedIds({}),
            },
            "Clear selection",
          )
        : selectTargetIds.length
          ? e(
              "button",
              {
                type: "button",
                className: "comm-mail__btn",
                title: selectHasStack
                  ? "Select mails for the highlighted item stack"
                  : itemsMode
                    ? "Select all untaken attachments in the current filter"
                    : "Select all messages in the current search / filter",
                onClick: () => {
                  const next: Record<string, boolean> = {};
                  for (let i = 0; i < selectTargetIds.length; i++) {
                    next[selectTargetIds[i]] = true;
                  }
                  setSelectedIds(next);
                },
              },
              selectHasStack
                ? "Select stack " + selectTargetIds.length
                : "Select all " + selectTargetIds.length,
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
            // Soft-merge head, then re-verify every warmed page in place.
            void requestMailCacheRefresh();
          },
          disabled: !!snap.refreshProgress,
          title: snap.refreshProgress
            ? "Cache refresh in progress"
            : "Re-verify the whole warmed cache without wiping it",
        },
        "Refresh",
      ),
    ),
  );
}
