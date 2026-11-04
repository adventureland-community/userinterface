import { getReact, e } from "../../../host/react";
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
  /** Phone — denser chrome, filters behind a toggle. */
  compact?: boolean;
};

export function MailToolbar(props: MailToolbarProps): any {
  const React = getReact();
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
    compact,
  } = props;

  const itemsMode = browseMode === "items";
  const itemsSelect = itemsMode
    ? mailIdsForItemsSelectAll(filtered, selectedItemMailIds)
    : null;
  const selectTargetIds = itemsSelect
    ? itemsSelect.ids
    : filtered.map((m) => m.id);
  const selectHasStack = !!(itemsSelect && itemsSelect.kind === "stack");
  const hasSelection = checkedIds.length > 0;
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const showBulk = !compact || actionsOpen || hasSelection;

  const bulkButtons: any[] = [];
  if (browseMode === "messages" && !compact) {
    bulkButtons.push(
      e(
        "button",
        {
          key: "stack",
          type: "button",
          className: "comm-mail__pill" + (collapseRepeats ? " is-on" : ""),
          title:
            "Stack identical sends (same from/to + subject/body, or same item)",
          onClick: () => setCollapseRepeats(!collapseRepeats),
        },
        "Stack",
      ),
    );
  }
  if (pill === "unread") {
    bulkButtons.push(
      e(
        "button",
        {
          key: "mark-all",
          type: "button",
          className: "comm-mail__btn",
          onClick: () => {
            void markAllUnreadRead();
          },
        },
        "Mark all read",
      ),
    );
  }
  if (hasSelection) {
    bulkButtons.push(
      e(
        "button",
        {
          key: "clear",
          type: "button",
          className: "comm-mail__btn",
          title: "Clear every checked mail",
          onClick: () => setSelectedIds({}),
        },
        "Clear selection",
      ),
      e(
        "button",
        {
          key: "delete",
          type: "button",
          className: "comm-mail__btn",
          onClick: () => {
            void doDelete(checkedIds);
          },
        },
        "Delete " + checkedIds.length,
      ),
    );
  } else if (selectTargetIds.length) {
    bulkButtons.push(
      e(
        "button",
        {
          key: "select",
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
      ),
    );
  }
  if (takeableCheckedIds.length) {
    bulkButtons.push(
      e(
        "button",
        {
          key: "take",
          type: "button",
          className: "comm-mail__btn comm-mail__btn--gold",
          disabled: !canTake || snap.commandBusy,
          onClick: () => {
            takeMailCommand(takeableCheckedIds);
            setSelectedIds({});
          },
        },
        snap.commandBusy ? "Working…" : "Take " + takeableCheckedIds.length,
      ),
    );
  }
  bulkButtons.push(
    e(
      "button",
      {
        key: "mark-read",
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
        key: "refresh",
        type: "button",
        className: "comm-mail__btn",
        onClick: () => {
          void requestMailCacheRefresh();
        },
        disabled: !!snap.refreshProgress,
        title: snap.refreshProgress
          ? "Cache refresh in progress"
          : "Re-verify the whole warmed cache without wiping it",
      },
      "Refresh",
    ),
  );

  if (compact && browseMode === "messages") {
    bulkButtons.unshift(
      e(
        "button",
        {
          key: "stack",
          type: "button",
          className: "comm-mail__pill" + (collapseRepeats ? " is-on" : ""),
          title:
            "Stack identical sends (same from/to + subject/body, or same item)",
          onClick: () => setCollapseRepeats(!collapseRepeats),
        },
        "Stack",
      ),
    );
  }

  return e(
    "div",
    {
      className: "comm-mail__toolbar" + (compact ? " is-compact" : ""),
    },
    e(MailSearchBar, {
      query,
      setQuery,
      pill,
      setPillPersist,
      compact,
    }),
    e(
      "div",
      { className: "comm-mail__toolbar-primary" },
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
          compact ? "Msgs" : "Messages",
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
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn comm-mail__btn--gold",
          onClick: () => openCompose(),
        },
        "Compose",
      ),
      compact
        ? e(
            "button",
            {
              type: "button",
              className:
                "comm-mail__btn comm-mail__more-btn" +
                (showBulk ? " is-on" : ""),
              "aria-expanded": showBulk ? "true" : "false",
              title: "Stack, select, mark read, refresh",
              onClick: () => {
                if (hasSelection) return;
                setActionsOpen(!actionsOpen);
              },
            },
            hasSelection ? "Actions" : actionsOpen ? "Less" : "More",
          )
        : null,
      !compact ? bulkButtons : null,
    ),
    compact && showBulk
      ? e("div", { className: "comm-mail__toolbar-bulk" }, ...bulkButtons)
      : null,
  );
}
