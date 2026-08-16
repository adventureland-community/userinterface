import { e } from "../../../host/react";
import {
  mailStackItemQuantity,
  openMailRow,
  type MailCollapseGroup,
  type MailRow,
} from "../../../host/mail";
import { mailItemIcon, mailWhenColumn, stackMeta } from "./mailRowShared";

export type MailStackRowProps = {
  g: MailCollapseGroup;
  selected: MailRow | null;
  selectedIds: Record<string, boolean>;
  toggleCheck: (id: string, on: boolean) => void;
  expanded: boolean;
  setGroupExpanded: (key: string, on: boolean) => void;
};

function groupChecked(
  g: MailCollapseGroup,
  selectedIds: Record<string, boolean>,
): boolean {
  for (let i = 0; i < g.mails.length; i++) {
    if (!selectedIds[g.mails[i].id]) return false;
  }
  return g.mails.length > 0;
}

function groupSomeChecked(
  g: MailCollapseGroup,
  selectedIds: Record<string, boolean>,
): boolean {
  for (let i = 0; i < g.mails.length; i++) {
    if (selectedIds[g.mails[i].id]) return true;
  }
  return false;
}

function stackOpenTarget(g: MailCollapseGroup): MailRow {
  for (let i = 0; i < g.mails.length; i++) {
    if (g.mails[i].read === false) return g.mails[i];
  }
  for (let i = 0; i < g.mails.length; i++) {
    if (g.mails[i].item && !g.mails[i].taken) return g.mails[i];
  }
  return g.head;
}

function itemLabel(m: MailRow): string {
  if (!m.item || !m.item.name) return m.subject || "(no subject)";
  const bits = [String(m.item.name)];
  if (typeof m.item.level === "number") bits.push("+" + m.item.level);
  return bits.join(" ");
}

export function MailStackRow(props: MailStackRowProps): any {
  const {
    g,
    selected,
    selectedIds,
    toggleCheck,
    expanded,
    setGroupExpanded,
  } = props;
  const allOn = groupChecked(g, selectedIds);
  const someOn = groupSomeChecked(g, selectedIds);
  const headSel = !!selected && g.mails.some((m) => m.id === selected.id);
  const title = g.head.item
    ? itemLabel(g.head)
    : g.head.subject || "(no subject)";
  const qtyTotal = mailStackItemQuantity(g);
  const showQtyPill = qtyTotal != null && qtyTotal !== g.untaken;
  const allTaken = !!g.head.item && g.untaken === 0 && g.mails.length > 0;
  let stackHead = g.head;
  if (allTaken) {
    stackHead = Object.assign({}, g.head, { taken: true });
  } else {
    for (let j = 0; j < g.mails.length; j++) {
      if (g.mails[j].item && !g.mails[j].taken) {
        stackHead = g.mails[j];
        break;
      }
    }
  }
  const meta = stackMeta(g);

  return e(
    "div",
    {
      className:
        "comm-mail__row is-stack" +
        (g.unread ? " is-unread" : "") +
        (headSel ? " is-sel" : "") +
        (allOn || someOn ? " is-check" : "") +
        (expanded ? " is-open" : "") +
        (g.untaken ? " has-item" : "") +
        (allTaken ? " item-taken" : ""),
      title: expanded
        ? "Click to collapse · open a nested row to read or take"
        : "Click to expand · " + g.mails.length + " similar mails",
      onClick: () => {
        setGroupExpanded(g.key, !expanded);
      },
    },
    e(
      "div",
      { className: "comm-mail__lead" },
      e("input", {
        className: "comm-mail__check",
        type: "checkbox",
        checked: allOn,
        ref: (el: HTMLInputElement | null) => {
          if (el) el.indeterminate = !allOn && someOn;
        },
        onClick: (ev: any) => ev.stopPropagation(),
        onChange: (ev: any) => {
          const on = !!ev.target.checked;
          for (let j = 0; j < g.mails.length; j++) {
            toggleCheck(g.mails[j].id, on);
          }
        },
      }),
      e("div", { className: "comm-mail__dot" }),
    ),
    e(
      "div",
      { className: "comm-mail__main" },
      e(
        "div",
        { className: "comm-mail__sub" },
        e("span", { className: "comm-mail__title" }, title),
        e(
          "span",
          { className: "comm-mail__chips" },
          e(
            "button",
            {
              type: "button",
              className: "comm-mail__stack-n" + (expanded ? " is-open" : ""),
              title: expanded
                ? "Collapse stack"
                : "Expand " + g.mails.length + " similar",
              "aria-expanded": expanded ? "true" : "false",
              onClick: (ev: any) => {
                ev.stopPropagation();
                setGroupExpanded(g.key, !expanded);
              },
            },
            (expanded ? "▼ " : "▶ ") + "×" + g.mails.length,
          ),
          showQtyPill
            ? e(
                "span",
                {
                  className: "comm-mail__stack-q",
                  title: "Total quantity " + qtyTotal,
                },
                "qty " + qtyTotal,
              )
            : null,
          g.head.item && g.untaken > 0 && g.untaken < g.mails.length
            ? e(
                "span",
                {
                  className: "comm-mail__attach-pill is-takeable",
                  title:
                    g.untaken +
                    " untaken attachment" +
                    (g.untaken === 1 ? "" : "s"),
                },
                g.untaken + " left",
              )
            : null,
          allTaken
            ? e(
                "span",
                {
                  className: "comm-mail__attach-pill is-taken",
                  title: "All attachments taken",
                },
                "Taken",
              )
            : null,
          g.unread
            ? e(
                "button",
                {
                  type: "button",
                  className: "comm-mail__stack-u",
                  title: "Open first unread (" + g.unread + " unread)",
                  onClick: (ev: any) => {
                    ev.stopPropagation();
                    void openMailRow(stackOpenTarget(g).id);
                  },
                },
                g.unread + " new",
              )
            : null,
        ),
      ),
      e("div", { className: "comm-mail__meta", title: meta }, meta),
    ),
    mailWhenColumn(g.head.sent),
    mailItemIcon(stackHead, 36, qtyTotal != null ? qtyTotal : undefined),
  );
}
