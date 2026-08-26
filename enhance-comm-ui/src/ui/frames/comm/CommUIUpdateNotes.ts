/**
 * Adventure.land server update notes modal (stock welcome / All Update Notes).
 * Separate from ECU What's New / Changelog.
 *
 * Layout mirrors ECU changelog: date list on the left, notes for the
 * selected day on the right.
 */

import { getReact, e } from "../../../host/react";
import { patchSettings } from "../../../lib/settings";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import {
  segmentUpdateNote,
  updateNoteRefIconKind,
} from "../../../lib/updateNoteRefs";
import { GameIcon } from "../../chrome/GameIcon";
import {
  appendPageUpdateNotes,
  fetchUpdateNotesPage,
  groupUpdateNotesByStamp,
  latestDeployNotes,
  readLastDeploy,
  readPageUpdateNotes,
  readPageUpdateNotesMore,
  updateNoteKind,
  updateNoteKindLabel,
  type UpdateNote,
  type UpdateNoteGroup,
  type UpdateNotesOpenMode,
} from "../../../host/updateNotes";
import { injectCommSetupWizardCss } from "./commSetupWizardCss";

export type CommUIUpdateNotesProps = {
  mode: UpdateNotesOpenMode;
  onDone: () => void;
};

function markSeen(lastDeploy: string): void {
  if (!lastDeploy) return;
  patchSettings({ serverUpdateNotesSeenDeploy: lastDeploy });
}

function groupKey(group: UpdateNoteGroup, index: number): string {
  return group.stamp || `undated-${index}`;
}

function renderNoteText(note: string): any {
  const segments = segmentUpdateNote(note);
  const kids: any[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === "text") {
      kids.push(seg.text);
      continue;
    }
    kids.push(
      e(
        "span",
        {
          key: `ref-${i}-${seg.kind}-${seg.id}`,
          className: "ecu-comm-wiz-un-ref",
          title: `${seg.kind}: ${seg.id}`,
        },
        e(GameIcon, {
          id: seg.id,
          kind: updateNoteRefIconKind(seg.kind),
          size: 26,
          ctype: seg.kind === "class" ? seg.id : undefined,
          title: seg.text,
        }),
        e("span", { className: "ecu-comm-wiz-un-ref-label" }, seg.text),
      ),
    );
  }
  return e("div", { className: "ecu-comm-wiz-un-note" }, ...kids);
}

function renderNoteItem(entry: UpdateNote, key: string): any {
  const kind = updateNoteKind(entry.note);
  const kindLabel = updateNoteKindLabel(kind);
  return e(
    "div",
    {
      key,
      className:
        "ecu-comm-wiz-cl-item ecu-comm-wiz-un-item" +
        (kind !== "other" ? ` ecu-comm-wiz-un-item--${kind}` : "") +
        (kindLabel ? " ecu-comm-wiz-un-item--badged" : ""),
    },
    kindLabel
      ? e(
          "span",
          {
            className: `ecu-comm-wiz-cl-kind ecu-comm-wiz-un-kind ecu-comm-wiz-un-kind--${kind}`,
          },
          kindLabel,
        )
      : null,
    renderNoteText(entry.note),
  );
}

export function CommUIUpdateNotes(props: CommUIUpdateNotesProps): any {
  injectCommSetupWizardCss();
  const React = getReact();

  const [notes, setNotes] = React.useState(() => readPageUpdateNotes());
  const [more, setMore] = React.useState(() => readPageUpdateNotesMore());
  const [lastDeploy] = React.useState(() => readLastDeploy(notes));
  const [browseAll, setBrowseAll] = React.useState(props.mode === "all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null as string | null);

  const latest = latestDeployNotes(notes, lastDeploy);
  const deployLabel = lastDeploy || latest.lastDeploy;
  const latestStamp =
    (latest.notes[0] && (latest.notes[0].deployed || latest.notes[0].date)) ||
    deployLabel;

  const displayNotes: UpdateNote[] = browseAll ? notes : latest.notes;
  const groups = groupUpdateNotesByStamp(displayNotes);
  const showNav = browseAll || groups.length > 1;

  const [selectedKey, setSelectedKey] = React.useState(() =>
    groups.length ? groupKey(groups[0], 0) : "",
  );

  React.useEffect(() => {
    if (!groups.length) {
      setSelectedKey("");
      return;
    }
    setSelectedKey((prev: string) => {
      for (let i = 0; i < groups.length; i++) {
        if (groupKey(groups[i], i) === prev) return prev;
      }
      return groupKey(groups[0], 0);
    });
  }, [browseAll, notes.length, more]);

  const selected =
    groups.find((g, i) => groupKey(g, i) === selectedKey) || groups[0] || null;
  const selectedIsLatest = !!(
    selected &&
    latestStamp &&
    selected.stamp === latestStamp
  );

  const dismiss = () => {
    markSeen(deployLabel);
    props.onDone();
  };

  const onDoneRef = React.useRef(props.onDone);
  onDoneRef.current = props.onDone;
  const deployRef = React.useRef(deployLabel);
  deployRef.current = deployLabel;

  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        markSeen(deployRef.current);
        onDoneRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadMore = () => {
    if (loading || !more) return;
    setLoading(true);
    setError(null);
    setBrowseAll(true);
    fetchUpdateNotesPage(notes.length)
      .then((page) => {
        const merged = appendPageUpdateNotes(page);
        setNotes(merged);
        setMore(page.more);
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to load more notes";
        setError(msg);
      })
      .then(() => setLoading(false));
  };

  const heading = browseAll || showNav ? "Update Notes" : "Server update";
  const sub = deployLabel
    ? `Last Update ${deployLabel}`
    : "Adventure.land release notes";

  const nav = showNav
    ? e(
        "nav",
        {
          className: "ecu-comm-wiz-cl-nav",
          "aria-label": "Update dates",
        },
        ...groups.map((group, i) => {
          const key = groupKey(group, i);
          const isLatest = !!(latestStamp && group.stamp === latestStamp);
          const count = group.notes.length;
          return e(
            "button",
            {
              key,
              type: "button",
              className:
                "ecu-comm-wiz-cl-nav-btn" +
                (selectedKey === key ? " is-active" : "") +
                (isLatest ? " is-new" : " is-seen"),
              onClick: () => setSelectedKey(key),
            },
            e(
              "span",
              { className: "ecu-comm-wiz-cl-nav-title-row" },
              e(
                "span",
                { className: "ecu-comm-wiz-cl-nav-title" },
                group.stamp || "Undated",
              ),
              isLatest
                ? e("span", { className: "ecu-comm-wiz-cl-badge-new" }, "Latest")
                : null,
            ),
            e(
              "span",
              { className: "ecu-comm-wiz-cl-nav-date" },
              count === 1 ? "1 note" : `${count} notes`,
            ),
          );
        }),
        browseAll && more
          ? e(
              "button",
              {
                key: "more",
                type: "button",
                className: "ecu-comm-wiz-btn ecu-comm-wiz-un-nav-more",
                disabled: loading,
                onClick: loadMore,
              },
              loading ? "Loading…" : "Load more",
            )
          : null,
        browseAll && !more && groups.length
          ? e(
              "div",
              { key: "begin", className: "ecu-comm-wiz-un-begin" },
              "The Beginning",
            )
          : null,
      )
    : null;

  const bodyKids: any[] = [];
  if (!selected) {
    bodyKids.push(
      e(
        "p",
        { key: "empty", className: "ecu-comm-wiz-un-empty" },
        "No update notes on this page yet.",
      ),
    );
  } else {
    bodyKids.push(
      e(
        "div",
        { key: "day-meta", className: "ecu-comm-wiz-un-day-meta" },
        e(
          "span",
          { className: "ecu-comm-wiz-un-day-stamp" },
          selected.stamp || "Undated",
        ),
        selectedIsLatest
          ? e("span", { className: "ecu-comm-wiz-un-day-badge" }, "Latest")
          : null,
        e(
          "span",
          { className: "ecu-comm-wiz-un-day-count" },
          selected.notes.length === 1
            ? "1 note"
            : `${selected.notes.length} notes`,
        ),
      ),
    );
    const cards: any[] = [];
    for (let i = 0; i < selected.notes.length; i++) {
      cards.push(renderNoteItem(selected.notes[i], `n-${i}`));
    }
    bodyKids.push(
      e(
        "div",
        { key: "cards", className: "ecu-comm-wiz-cl-items ecu-comm-wiz-un-grid" },
        ...cards,
      ),
    );
  }
  if (error) {
    bodyKids.push(
      e("p", { key: "err", className: "ecu-comm-wiz-un-error" }, error),
    );
  }

  const footKids: any[] = [];
  if (!browseAll) {
    footKids.push(
      e(
        "button",
        {
          key: "all",
          type: "button",
          className: "ecu-comm-wiz-btn",
          onClick: () => setBrowseAll(true),
        },
        "All update notes",
      ),
    );
  }
  footKids.push(
    e(
      "button",
      {
        key: "ok",
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
        className: "ecu-comm-wiz ecu-comm-wiz--changelog ecu-comm-wiz--un",
        style: PIXEL_TEXT,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": heading,
        onMouseDown: (ev: any) => ev.stopPropagation(),
      },
      e(
        "div",
        { className: "ecu-comm-wiz-cl-head" },
        e("div", { className: "ecu-comm-wiz-logo" }, "Adventure.land"),
        e("h3", null, heading),
        e("div", { className: "ecu-comm-wiz-cl-ver" }, sub),
        latest.pending && !browseAll
          ? e(
              "p",
              { className: "ecu-comm-wiz-un-pending" },
              `Latest notes ${notes[0] && notes[0].deployed ? notes[0].deployed : ""}`,
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
      ),
      e(
        "div",
        {
          className:
            "ecu-comm-wiz-cl-shell" +
            (showNav ? " ecu-comm-wiz-cl-shell--nav" : ""),
        },
        nav,
        e(
          "div",
          { className: "ecu-comm-wiz-cl-body ecu-comm-wiz-un-body" },
          ...bodyKids,
        ),
      ),
      e(
        "div",
        { className: "ecu-comm-wiz-cl-foot ecu-comm-wiz-actions" },
        ...footKids,
      ),
    ),
  );
}
