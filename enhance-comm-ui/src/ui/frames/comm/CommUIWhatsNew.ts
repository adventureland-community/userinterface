/**
 * What's New modal — unseen upgrades auto-open, or full CHANGELOG from
 * control strip → Changelog. Dismiss always marks latest as seen.
 *
 * Full history / multi-entry: version nav + one release at a time.
 * Body scrolls; header and Got it stay fixed inside a viewport-safe shell.
 */

import { getReact, e } from "../../../host/react";
import { patchSettings } from "../../../lib/settings";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import { injectCommSetupWizardCss } from "./commSetupWizardCss";
import {
  changelogKindLabel,
  latestChangelogId,
  type ChangelogEntry,
  type ChangelogItem,
  type ChangelogKind,
} from "../../../lib/changelog";

export type CommUIWhatsNewProps = {
  entries: ChangelogEntry[];
  /** Full history from control strip — always use version browse. */
  browseAll?: boolean;
  onDone: () => void;
};

const KIND_ORDER: ChangelogKind[] = ["feature", "fix", "improve", "ui"];

function itemsGridClass(count: number): string {
  return (
    "ecu-comm-wiz-cl-items" + (count >= 2 ? " ecu-comm-wiz-cl-items--grid" : "")
  );
}

function renderChangelogItem(item: ChangelogItem, key: string): any {
  const kind = item.kind;
  return e(
    "div",
    {
      key,
      className:
        "ecu-comm-wiz-cl-item" +
        (item.highlight ? " ecu-comm-wiz-cl-item--highlight" : "") +
        (kind ? ` ecu-comm-wiz-cl-item--kind-${kind}` : ""),
    },
    e(
      "div",
      { className: "ecu-comm-wiz-cl-item-top" },
      e("span", { className: "ecu-comm-wiz-cl-item-label" }, item.label),
      kind
        ? e(
            "span",
            {
              className: `ecu-comm-wiz-cl-kind ecu-comm-wiz-cl-kind--${kind}`,
            },
            changelogKindLabel(kind),
          )
        : null,
    ),
    e("div", { className: "ecu-comm-wiz-cl-item-detail" }, item.detail),
  );
}

function groupRestByKind(
  rest: ChangelogItem[],
): { kind: ChangelogKind | null; items: ChangelogItem[] }[] {
  const byKind = new Map<ChangelogKind | "other", ChangelogItem[]>();
  for (let i = 0; i < rest.length; i++) {
    const item = rest[i];
    const key: ChangelogKind | "other" = item.kind ? item.kind : "other";
    const list = byKind.get(key);
    if (list) list.push(item);
    else byKind.set(key, [item]);
  }
  const groups: { kind: ChangelogKind | null; items: ChangelogItem[] }[] = [];
  for (let i = 0; i < KIND_ORDER.length; i++) {
    const kind = KIND_ORDER[i];
    const items = byKind.get(kind);
    if (items && items.length) groups.push({ kind, items });
  }
  const other = byKind.get("other");
  if (other && other.length) groups.push({ kind: null, items: other });
  return groups;
}

function renderEntryBody(
  entry: ChangelogEntry,
  opts?: { showDate?: boolean },
): any {
  const highlights: ChangelogItem[] = [];
  const rest: ChangelogItem[] = [];
  for (let i = 0; i < entry.items.length; i++) {
    const item = entry.items[i];
    if (item.highlight) highlights.push(item);
    else rest.push(item);
  }

  const children: any[] = [];
  if (entry.summary) {
    children.push(
      e(
        "p",
        { key: "summary", className: "ecu-comm-wiz-cl-summary" },
        entry.summary,
      ),
    );
  }
  // Date lives in the version nav when browsing; only show under the
  // summary once when there is no nav (single-entry What's New).
  if (opts?.showDate && entry.date) {
    children.push(
      e("div", { key: "date", className: "ecu-comm-wiz-cl-date" }, entry.date),
    );
  }
  if (highlights.length) {
    children.push(
      e(
        "div",
        { key: "hl-label", className: "ecu-comm-wiz-cl-section-label" },
        "Highlights",
      ),
      e(
        "div",
        {
          key: "hl-list",
          className: itemsGridClass(highlights.length),
        },
        ...highlights.map((item, i) =>
          renderChangelogItem(item, `hl-${entry.id}-${i}`),
        ),
      ),
    );
  }
  if (rest.length) {
    if (highlights.length) {
      children.push(
        e(
          "div",
          {
            key: "rest-label",
            className:
              "ecu-comm-wiz-cl-section-label ecu-comm-wiz-cl-section-label--also",
          },
          "Also in this release",
        ),
      );
    }
    const groups = groupRestByKind(rest);
    const useKindGroups = groups.length > 1;
    if (useKindGroups) {
      for (let g = 0; g < groups.length; g++) {
        const group = groups[g];
        const label = group.kind ? changelogKindLabel(group.kind) : "Other";
        children.push(
          e(
            "div",
            {
              key: `kind-label-${entry.id}-${g}`,
              className: "ecu-comm-wiz-cl-kind-group-label",
            },
            label,
          ),
          e(
            "div",
            {
              key: `kind-list-${entry.id}-${g}`,
              className: itemsGridClass(group.items.length),
            },
            ...group.items.map((item, i) =>
              renderChangelogItem(item, `item-${entry.id}-${g}-${i}`),
            ),
          ),
        );
      }
    } else {
      children.push(
        e(
          "div",
          {
            key: "rest-list",
            className: itemsGridClass(rest.length),
          },
          ...rest.map((item, i) =>
            renderChangelogItem(item, `item-${entry.id}-${i}`),
          ),
        ),
      );
    }
  }
  return e("div", { className: "ecu-comm-wiz-cl-entry" }, ...children);
}

export function CommUIWhatsNew(props: CommUIWhatsNewProps): any {
  injectCommSetupWizardCss();
  const React = getReact();
  const entries = props.entries;
  const showNav = !!props.browseAll || entries.length > 1;

  const [selectedId, setSelectedId] = React.useState(() =>
    entries[0] ? entries[0].id : "",
  );

  React.useEffect(() => {
    const first = entries[0];
    if (!first) {
      setSelectedId("");
      return;
    }
    setSelectedId((prev: string) =>
      entries.some((entry) => entry.id === prev) ? prev : first.id,
    );
  }, [entries]);

  const dismiss = () => {
    patchSettings({ changelogSeenId: latestChangelogId() });
    props.onDone();
  };

  const onDoneRef = React.useRef(props.onDone);
  onDoneRef.current = props.onDone;

  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        patchSettings({ changelogSeenId: latestChangelogId() });
        onDoneRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selected =
    entries.find((entry) => entry.id === selectedId) || entries[0] || null;

  const heading = props.browseAll
    ? "Changelog"
    : entries.length === 1 && selected
      ? `What's new in ${selected.title}`
      : "What's new";

  const header = e(
    "div",
    { className: "ecu-comm-wiz-cl-head" },
    e("div", { className: "ecu-comm-wiz-logo" }, "Comm UI"),
    e("h3", null, heading),
    showNav && selected
      ? e("div", { className: "ecu-comm-wiz-cl-ver" }, selected.title)
      : null,
    e(
      "button",
      {
        type: "button",
        className: "ecu-comm-wiz-cl-close",
        title: "Close",
        "aria-label": "Close",
        onClick: dismiss,
      },
      "×",
    ),
  );

  const nav = showNav
    ? e(
        "nav",
        {
          className: "ecu-comm-wiz-cl-nav",
          "aria-label": "Versions",
        },
        ...entries.map((entry) =>
          e(
            "button",
            {
              key: entry.id,
              type: "button",
              className:
                "ecu-comm-wiz-cl-nav-btn" +
                (selected && selected.id === entry.id ? " is-active" : ""),
              onClick: () => setSelectedId(entry.id),
            },
            e("span", { className: "ecu-comm-wiz-cl-nav-title" }, entry.title),
            e("span", { className: "ecu-comm-wiz-cl-nav-date" }, entry.date),
          ),
        ),
      )
    : null;

  const body = e(
    "div",
    { className: "ecu-comm-wiz-cl-body" },
    selected ? renderEntryBody(selected, { showDate: !showNav }) : null,
  );

  const footer = e(
    "div",
    { className: "ecu-comm-wiz-cl-foot ecu-comm-wiz-actions" },
    e(
      "button",
      {
        type: "button",
        className: "ecu-comm-wiz-btn primary",
        onClick: dismiss,
      },
      "Got it",
    ),
  );

  return e(
    "div",
    {
      className: "ecu-comm-wiz-backdrop ecu-comm-wiz-backdrop--changelog",
      onMouseDown: (ev: any) => {
        if (ev.target === ev.currentTarget) dismiss();
      },
    },
    e(
      "div",
      {
        className: "ecu-comm-wiz ecu-comm-wiz--changelog",
        style: PIXEL_TEXT,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": heading,
        onMouseDown: (ev: any) => ev.stopPropagation(),
      },
      header,
      e(
        "div",
        {
          className:
            "ecu-comm-wiz-cl-shell" +
            (showNav ? " ecu-comm-wiz-cl-shell--nav" : ""),
        },
        nav,
        body,
      ),
      footer,
    ),
  );
}
