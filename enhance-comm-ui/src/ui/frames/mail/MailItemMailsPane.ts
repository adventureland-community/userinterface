import { e } from "../../../host/react";
import {
  mailIdsForItemsTake,
  openMailRow,
  takeMailCommand,
  type MailAggItem,
  type MailRow,
  type MailStoreSnapshot,
} from "../../../host/mail";
import { itemInstanceLabel } from "../../../lib/gameIcon";
import { ItemInstance } from "../../chrome/ItemInstance";
import { mailItemIcon, mailWhenColumn, rowMeta } from "./mailRowShared";

export type MailItemMailsPaneProps = {
  snap: MailStoreSnapshot;
  agg: MailAggItem;
  mails: MailRow[];
  selected: MailRow | null;
  selectedIds: Record<string, boolean>;
  toggleCheck: (id: string, on: boolean) => void;
  canTake: boolean;
  setSelectedIds: (ids: Record<string, boolean>) => void;
};

export function MailItemMailsPane(props: MailItemMailsPaneProps): any {
  const {
    snap,
    agg,
    mails,
    selected,
    selectedIds,
    toggleCheck,
    canTake,
    setSelectedIds,
  } = props;

  const label =
    itemInstanceLabel(agg.name, {
      p: agg.p != null ? agg.p : undefined,
      level: agg.level,
    }) || agg.name;

  const takeableIds: string[] = [];
  for (let i = 0; i < mails.length; i++) {
    const m = mails[i];
    if (m.item && !m.taken && m.canTake !== false) takeableIds.push(m.id);
  }

  const checkedTakeable: string[] = [];
  for (let i = 0; i < takeableIds.length; i++) {
    if (selectedIds[takeableIds[i]]) checkedTakeable.push(takeableIds[i]);
  }

  let anyChecked = false;
  for (let i = 0; i < mails.length; i++) {
    if (selectedIds[mails[i].id]) {
      anyChecked = true;
      break;
    }
  }

  const takeIds = mailIdsForItemsTake({
    takeableIds,
    checkedTakeableIds: checkedTakeable,
    preferredId: selected ? selected.id : null,
  });

  return e(
    "div",
    { className: "comm-mail__item-mails" },
    e(
      "div",
      { className: "comm-mail__item-mails-hd" },
      e(ItemInstance, {
        name: agg.name,
        level: agg.level,
        q: agg.q,
        p: agg.p != null ? String(agg.p) : undefined,
        size: 36,
      }),
      e("div", { className: "comm-mail__item-mails-title" }, label),
      anyChecked
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
        : takeableIds.length
          ? e(
              "button",
              {
                type: "button",
                className: "comm-mail__btn",
                title: "Check every untaken mail in this stack",
                onClick: () => {
                  const next: Record<string, boolean> = {};
                  for (let i = 0; i < takeableIds.length; i++) {
                    next[takeableIds[i]] = true;
                  }
                  setSelectedIds(next);
                },
              },
              "Select " + takeableIds.length,
            )
          : null,
      takeIds.length
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn comm-mail__btn--gold",
              disabled: !canTake || snap.commandBusy,
              title: checkedTakeable.length
                ? "Take checked attachments"
                : "Take one attachment (check boxes to take several)",
              onClick: () => {
                takeMailCommand(takeIds);
                setSelectedIds({});
              },
            },
            snap.commandBusy ? "Working…" : "Take " + takeIds.length,
          )
        : null,
      e(
        "div",
        { className: "comm-mail__item-mails-sub" },
        "×" +
          agg.q +
          " · " +
          mails.length +
          (mails.length === 1 ? " mail" : " mails") +
          (agg.recipients.length
            ? " · " + agg.recipients.join(", ")
            : ""),
      ),
    ),
    e(
      "div",
      { className: "comm-mail__item-mails-list" },
      mails.map((m: MailRow) => {
        const unread = m.read === false;
        const checked = !!selectedIds[m.id];
        const rowTakeable = !!(m.item && !m.taken && m.canTake !== false);
        return e(
          "div",
          {
            key: m.id,
            className:
              "comm-mail__row" +
              (unread ? " is-unread" : "") +
              (selected && selected.id === m.id ? " is-sel" : "") +
              (checked ? " is-check" : "") +
              (m.item && !m.taken ? " has-item" : "") +
              (m.item && m.taken ? " item-taken" : ""),
            onClick: () => {
              void openMailRow(m.id);
            },
          },
          e(
            "div",
            { className: "comm-mail__lead" },
            e("input", {
              className: "comm-mail__check",
              type: "checkbox",
              checked,
              onClick: (ev: any) => ev.stopPropagation(),
              onChange: (ev: any) => toggleCheck(m.id, !!ev.target.checked),
            }),
            e("div", { className: "comm-mail__dot" }),
          ),
          e(
            "div",
            { className: "comm-mail__main" },
            e(
              "div",
              { className: "comm-mail__sub" },
              e(
                "span",
                { className: "comm-mail__title" },
                m.subject || "(no subject)",
              ),
            ),
            e("div", { className: "comm-mail__meta" }, rowMeta(m)),
          ),
          mailWhenColumn(m.sent),
          rowTakeable
            ? e(
                "button",
                {
                  type: "button",
                  className: "comm-mail__btn comm-mail__row-take",
                  disabled: !canTake || snap.commandBusy,
                  title: "Take this attachment",
                  onClick: (ev: { stopPropagation: () => void }) => {
                    ev.stopPropagation();
                    takeMailCommand(m.id);
                  },
                },
                snap.commandBusy ? "…" : "Take",
              )
            : null,
          mailItemIcon(m),
        );
      }),
    ),
  );
}
