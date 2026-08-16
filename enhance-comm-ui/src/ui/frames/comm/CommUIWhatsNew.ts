/**
 * What's New modal — unseen upgrades auto-open, or full CHANGELOG from
 * control strip → Changelog. Dismiss always marks latest as seen.
 *
 * Full history / multi-entry: version nav + one release at a time.
 * Body scrolls; header and Got it stay fixed inside a viewport-safe shell.
 *
 * Entry body order: Highlights → feature sections → Also (by kind).
 */

import { getReact, e } from "../../../host/react";
import { getSettings, patchSettings } from "../../../lib/settings";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import { injectCommSetupWizardCss } from "./commSetupWizardCss";
import {
  changelogKindLabel,
  isChangelogEntryUnseen,
  latestChangelogId,
  type ChangelogCard,
  type ChangelogEntry,
  type ChangelogFeatureCard,
  type ChangelogFeatureSection,
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

type CardOpts = {
  /** Cards in the Highlights section get highlight chrome. */
  highlightSection?: boolean;
  /** Feature-section cards may include points; skip kind badge noise. */
  featureSection?: boolean;
};

function renderChangelogItem(
  item: ChangelogCard | ChangelogFeatureCard,
  key: string,
  opts: CardOpts = {},
): any {
  const kind = opts.featureSection ? undefined : item.kind;
  const points =
    opts.featureSection && "points" in item ? item.points : undefined;
  const children: any[] = [
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
  ];
  if (points && points.length) {
    children.push(
      e(
        "ul",
        { className: "ecu-comm-wiz-cl-item-points" },
        ...points.map((point, i) => e("li", { key: `${key}-p${i}` }, point)),
      ),
    );
  }
  return e(
    "div",
    {
      key,
      className:
        "ecu-comm-wiz-cl-item" +
        (opts.highlightSection ? " ecu-comm-wiz-cl-item--highlight" : "") +
        (kind ? ` ecu-comm-wiz-cl-item--kind-${kind}` : ""),
    },
    ...children,
  );
}

function groupRestByKind(
  rest: ChangelogCard[],
): { kind: ChangelogKind | null; items: ChangelogCard[] }[] {
  const byKind = new Map<ChangelogKind | "other", ChangelogCard[]>();
  for (let i = 0; i < rest.length; i++) {
    const item = rest[i];
    const key: ChangelogKind | "other" = item.kind ? item.kind : "other";
    const list = byKind.get(key);
    if (list) list.push(item);
    else byKind.set(key, [item]);
  }
  const groups: { kind: ChangelogKind | null; items: ChangelogCard[] }[] = [];
  for (let i = 0; i < KIND_ORDER.length; i++) {
    const kind = KIND_ORDER[i];
    const items = byKind.get(kind);
    if (items && items.length) groups.push({ kind, items });
  }
  const other = byKind.get("other");
  if (other && other.length) groups.push({ kind: null, items: other });
  return groups;
}

function renderCardGrid(
  items: Array<ChangelogCard | ChangelogFeatureCard>,
  key: string,
  keyPrefix: string,
  opts: CardOpts = {},
): any {
  return e(
    "div",
    { key, className: itemsGridClass(items.length) },
    ...items.map((item, i) =>
      renderChangelogItem(item, `${keyPrefix}-${i}`, opts),
    ),
  );
}

function renderFeatureSection(
  section: ChangelogFeatureSection,
  entryId: string,
  index: number,
): any[] {
  const out: any[] = [
    e(
      "div",
      {
        key: `feat-label-${entryId}-${index}`,
        className:
          "ecu-comm-wiz-cl-section-label ecu-comm-wiz-cl-section-label--feature",
      },
      section.title,
    ),
  ];
  if (section.summary) {
    out.push(
      e(
        "p",
        {
          key: `feat-sum-${entryId}-${index}`,
          className: "ecu-comm-wiz-cl-feature-summary",
        },
        section.summary,
      ),
    );
  }
  out.push(
    renderCardGrid(
      section.items,
      `feat-list-${entryId}-${index}`,
      `feat-${entryId}-${index}`,
      { featureSection: true },
    ),
  );
  return out;
}

function renderRestSections(
  rest: ChangelogCard[],
  entryId: string,
  showAlsoLabel: boolean,
): any[] {
  if (!rest.length) return [];
  const children: any[] = [];
  if (showAlsoLabel) {
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
            key: `kind-label-${entryId}-${g}`,
            className: "ecu-comm-wiz-cl-kind-group-label",
          },
          label,
        ),
        renderCardGrid(
          group.items,
          `kind-list-${entryId}-${g}`,
          `item-${entryId}-${g}`,
        ),
      );
    }
  } else {
    children.push(renderCardGrid(rest, "rest-list", `item-${entryId}`));
  }
  return children;
}

function renderEntryBody(entry: ChangelogEntry): any {
  const highlights = entry.highlights || [];
  const features = entry.features || [];
  const rest = entry.items || [];

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
  if (entry.date) {
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
      renderCardGrid(highlights, "hl-list", `hl-${entry.id}`, {
        highlightSection: true,
      }),
    );
  }
  for (let f = 0; f < features.length; f++) {
    children.push(...renderFeatureSection(features[f], entry.id, f));
  }
  children.push(
    ...renderRestSections(
      rest,
      entry.id,
      !!(highlights.length || features.length),
    ),
  );
  return e("div", { className: "ecu-comm-wiz-cl-entry" }, ...children);
}

export function CommUIWhatsNew(props: CommUIWhatsNewProps): any {
  injectCommSetupWizardCss();
  const React = getReact();
  const entries = props.entries;
  const showNav = !!props.browseAll || entries.length > 1;
  // Snapshot at open — dismiss updates settings, but badges stay stable
  // until the modal closes so "New" does not vanish mid-browse.
  const [seenId] = React.useState(() => getSettings().changelogSeenId ?? null);

  const [selectedId, setSelectedId] = React.useState(() => {
    const firstUnseen = entries.find((entry) =>
      isChangelogEntryUnseen(entry.id, seenId),
    );
    return (firstUnseen || entries[0] || { id: "" }).id;
  });

  React.useEffect(() => {
    const first = entries[0];
    if (!first) {
      setSelectedId("");
      return;
    }
    setSelectedId((prev: string) => {
      if (entries.some((entry) => entry.id === prev)) return prev;
      const firstUnseen = entries.find((entry) =>
        isChangelogEntryUnseen(entry.id, seenId),
      );
      return (firstUnseen || first).id;
    });
  }, [entries, seenId]);

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
  const selectedUnseen = selected
    ? isChangelogEntryUnseen(selected.id, seenId)
    : false;

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
      ? e(
          "div",
          { className: "ecu-comm-wiz-cl-ver" },
          selected.title,
          selectedUnseen
            ? e("span", { className: "ecu-comm-wiz-cl-badge-new" }, "New")
            : null,
          selected.date
            ? e(
                "span",
                { className: "ecu-comm-wiz-cl-ver-date" },
                selected.date,
              )
            : null,
        )
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
        ...entries.map((entry) => {
          const unseen = isChangelogEntryUnseen(entry.id, seenId);
          return e(
            "button",
            {
              key: entry.id,
              type: "button",
              className:
                "ecu-comm-wiz-cl-nav-btn" +
                (selected && selected.id === entry.id ? " is-active" : "") +
                (unseen ? " is-new" : " is-seen"),
              onClick: () => setSelectedId(entry.id),
            },
            e(
              "span",
              { className: "ecu-comm-wiz-cl-nav-title-row" },
              e(
                "span",
                { className: "ecu-comm-wiz-cl-nav-title" },
                entry.title,
              ),
              unseen
                ? e("span", { className: "ecu-comm-wiz-cl-badge-new" }, "New")
                : null,
            ),
            e("span", { className: "ecu-comm-wiz-cl-nav-date" }, entry.date),
          );
        }),
      )
    : null;

  const body = e(
    "div",
    { className: "ecu-comm-wiz-cl-body" },
    selected ? renderEntryBody(selected) : null,
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
