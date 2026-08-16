import { e } from "../../../host/react";
import {
  collapseMailRows,
  loadOlderMail,
  openMailRow,
  type MailCollapseGroup,
  type MailRow,
  type MailStoreSnapshot,
} from "../../../host/mail";
import { resolveMailActivity } from "./mailActivity";
import { mailItemIcon, mailWhenColumn, rowMeta } from "./mailRowShared";
import { MailStackRow } from "./MailStackRow";

export type MailListPaneProps = {
  snap: MailStoreSnapshot;
  filtered: MailRow[];
  selected: MailRow | null;
  selectedIds: Record<string, boolean>;
  toggleCheck: (id: string, on: boolean) => void;
  /** When true, stack near-duplicates; expand state is local. */
  collapseRepeats: boolean;
  expandedKeys: Record<string, boolean>;
  setGroupExpanded: (key: string, on: boolean) => void;
};

type ListEntry =
  | { kind: "mail"; key: string; m: MailRow; nested?: boolean }
  | {
      kind: "stack";
      key: string;
      g: MailCollapseGroup;
      expanded: boolean;
    };

function renderMailRow(opts: {
  m: MailRow;
  selected: MailRow | null;
  selectedIds: Record<string, boolean>;
  toggleCheck: (id: string, on: boolean) => void;
  nested?: boolean;
  keyPrefix?: string;
}): any {
  const { m, selected, selectedIds, toggleCheck, nested, keyPrefix } = opts;
  const unread = m.read === false;
  const checked = !!selectedIds[m.id];
  const chips: any[] = [];
  if (m.item && m.taken) {
    chips.push(
      e(
        "span",
        {
          key: "taken",
          className: "comm-mail__attach-pill is-taken",
          title: "Attachment already taken",
        },
        "Taken",
      ),
    );
  }
  const meta = rowMeta(m);
  return e(
    "div",
    {
      key: (keyPrefix || "") + m.id,
      className:
        "comm-mail__row" +
        (nested ? " is-nested" : "") +
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
        chips.length
          ? e("span", { className: "comm-mail__chips" }, ...chips)
          : null,
      ),
      e("div", { className: "comm-mail__meta", title: meta }, meta),
    ),
    mailWhenColumn(m.sent),
    mailItemIcon(m, 36),
  );
}

function buildEntries(opts: {
  filtered: MailRow[];
  collapseRepeats: boolean;
  expandedKeys: Record<string, boolean>;
}): ListEntry[] {
  const { filtered, collapseRepeats, expandedKeys } = opts;
  const out: ListEntry[] = [];
  if (!collapseRepeats) {
    for (let i = 0; i < filtered.length; i++) {
      const m = filtered[i];
      out.push({ kind: "mail", key: m.id, m });
    }
  } else {
    const groups = collapseMailRows(filtered);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (g.mails.length === 1) {
        out.push({ kind: "mail", key: g.head.id, m: g.head });
        continue;
      }
      const expanded = !!expandedKeys[g.key];
      out.push({ kind: "stack", key: "g-" + g.key, g, expanded });
      if (expanded) {
        for (let j = 0; j < g.mails.length; j++) {
          const m = g.mails[j];
          out.push({ kind: "mail", key: "n-" + m.id, m, nested: true });
        }
      }
    }
  }
  return out;
}

export function MailListPane(props: MailListPaneProps): any {
  const {
    snap,
    filtered,
    selected,
    selectedIds,
    toggleCheck,
    collapseRepeats,
    expandedKeys,
    setGroupExpanded,
  } = props;

  const entries = buildEntries({ filtered, collapseRepeats, expandedKeys });

  const activity = resolveMailActivity(snap);
  const warming =
    activity.mode === "warm" || snap.loadingMore || snap.prefetchArmed;

  const nodes: any[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.kind === "mail") {
      nodes.push(
        renderMailRow({
          m: entry.m,
          selected,
          selectedIds,
          toggleCheck,
          nested: entry.nested,
          keyPrefix: entry.nested ? "n-" : "",
        }),
      );
    } else {
      nodes.push(
        e(MailStackRow, {
          key: entry.key,
          g: entry.g,
          selected,
          selectedIds,
          toggleCheck,
          expanded: entry.expanded,
          setGroupExpanded,
        }),
      );
    }
  }
  nodes.push(
    e(
      "div",
      { key: "foot", className: "comm-mail__foot" },
      warming
        ? e(
            "span",
            { className: "comm-mail__foot-warm" },
            e("span", {
              className: "comm-mail__foot-pulse",
              "aria-hidden": "true",
            }),
            activity.label || "Warming cache…",
          )
        : snap.hasMore
          ? e(
              "button",
              {
                type: "button",
                className: "comm-mail__btn",
                onClick: () => {
                  void loadOlderMail();
                },
              },
              "Load older now",
            )
          : snap.mails.length + " messages",
    ),
  );

  return e("div", { className: "comm-mail__list" }, ...nodes);
}
