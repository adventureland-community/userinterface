import { e } from "../../../host/react";
import {
  forwardMail,
  getMailCapabilities,
  openMailRow,
  replyToMail,
  setMailView,
  takeMailCommand,
  undoDeleteMail,
  type MailRow,
  type MailStoreSnapshot,
} from "../../../host/mail";
import { ItemInstance } from "../../chrome/ItemInstance";
import { formatMailRelative } from "./mailFormat";

export type MailReadPaneProps = {
  snap: MailStoreSnapshot;
  selected: MailRow;
  wide: boolean;
  doDelete: (ids: string[]) => void;
};

export function MailReadPane(props: MailReadPaneProps): any {
  const { snap, selected, wide, doDelete } = props;
  const caps = getMailCapabilities([], 1);

  return e(
    "div",
    null,
    !wide
      ? e(
          "button",
          {
            type: "button",
            className: "comm-mail__btn",
            onClick: () => setMailView({ kind: "list" }),
          },
          "← Back",
        )
      : null,
    e(
      "h3",
      { style: { margin: "0 0 8px", fontSize: 18, fontWeight: 600 } },
      selected.subject,
    ),
    e(
      "div",
      { className: "comm-mail__meta" },
      "From " +
        selected.fro +
        " · To " +
        selected.to +
        " · " +
        formatMailRelative(selected.sent),
    ),
    e(
      "div",
      { style: { marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.45 } },
      selected.message || "",
    ),
    selected.item
      ? e(
          "div",
          {
            className:
              "comm-mail__attach" +
              (selected.taken ? " is-taken" : " is-takeable"),
          },
          e(
            "div",
            {
              className:
                "comm-mail__item" + (selected.taken ? " is-taken" : ""),
            },
            e(ItemInstance, {
              name: String(selected.item.name),
              skin:
                typeof selected.item.skin === "string"
                  ? selected.item.skin
                  : undefined,
              level:
                typeof selected.item.level === "number"
                  ? selected.item.level
                  : undefined,
              q:
                typeof selected.item.q === "number"
                  ? selected.item.q
                  : undefined,
              p:
                typeof selected.item.p === "string"
                  ? selected.item.p
                  : undefined,
              size: 40,
            }),
          ),
          e(
            "div",
            { className: "comm-mail__attach-meta" },
            e("strong", null, selected.item.name),
            selected.item.level != null ? " +" + selected.item.level : null,
            typeof selected.item.q === "number" && selected.item.q > 1
              ? " ×" + selected.item.q
              : null,
            e(
              "div",
              {
                className:
                  "comm-mail__attach-state" +
                  (selected.taken ? " is-taken" : " is-takeable"),
              },
              selected.taken ? "Taken — already in a bag" : "Ready to take",
            ),
          ),
        )
      : null,
    snap.unreadStuckHint
      ? e(
          "div",
          { className: "comm-mail__status is-warn" },
          snap.unreadStuckHint,
        )
      : null,
    e(
      "div",
      { className: "comm-mail__acts" },
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn comm-mail__btn--gold",
          onClick: () => replyToMail(selected),
        },
        "Reply",
      ),
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn",
          onClick: () => forwardMail(selected),
        },
        "Forward",
      ),
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn",
          disabled:
            !caps.canTake ||
            !(selected.item && !selected.taken) ||
            snap.commandBusy,
          title: selected.taken
            ? "Attachment already taken"
            : !caps.canTake
              ? caps.reason || "Cannot take"
              : "Take attachment into observed bag",
          onClick: () => takeMailCommand(selected.id),
        },
        snap.commandBusy
          ? "Working…"
          : selected.item && selected.taken
            ? "Taken"
            : "Take",
      ),
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn",
          onClick: () => {
            void doDelete([selected.id]);
          },
        },
        "Delete",
      ),
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn",
          onClick: () => {
            let u: MailRow | null = null;
            for (let i = 0; i < snap.mails.length; i++) {
              const m = snap.mails[i];
              if (m.read === false && m.id !== selected.id) {
                u = m;
                break;
              }
            }
            if (u) void openMailRow(u.id);
          },
        },
        "Next unread",
      ),
      snap.undoCount
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn",
              onClick: () => undoDeleteMail(),
            },
            "Undo delete",
          )
        : null,
    ),
  );
}
