/**
 * Full per-character attach-cap breakdown (200/char, 20 from one account).
 * Opened from the compact caps chrome card.
 */

import { getReact, e } from "../../../host/react";
import {
  fillCapLabel,
  fillCapPct,
  formatCapFraction,
  MAIL_ATTACH_CAP,
  MAIL_ATTACH_SENDER_CAP,
  type CharMailboxFill,
  type MailboxCapsView,
} from "../../../host/mail";
import { CommModalPortal } from "../comm/commModalPortal";

export type MailCapsModalProps = {
  view: MailboxCapsView;
  onClose: () => void;
};

type CapFilter = "all" | "full" | "near" | "ok" | "clear";

function filterFills(
  fills: CharMailboxFill[],
  filter: CapFilter,
): CharMailboxFill[] {
  if (filter === "all") return fills;
  const out: CharMailboxFill[] = [];
  for (let i = 0; i < fills.length; i++) {
    const f = fills[i];
    if (filter === "full" && f.pressure === "full") out.push(f);
    else if (filter === "near" && f.pressure === "warn") out.push(f);
    else if (filter === "ok" && f.pressure === "" && f.count > 0) out.push(f);
    else if (filter === "clear" && f.count === 0) out.push(f);
  }
  return out;
}

function renderCapRow(fill: CharMailboxFill, incomplete: boolean): any {
  const pressure = fill.pressure;
  const label = fillCapLabel(fill);
  return e(
    "div",
    {
      key: fill.name.toLowerCase(),
      className:
        "comm-mail__caps-row" + (pressure ? " is-" + pressure : ""),
    },
    e(
      "div",
      { className: "comm-mail__caps-row-top" },
      e("span", { className: "comm-mail__caps-row-name" }, fill.name),
      e(
        "span",
        {
          className:
            "comm-mail__cap-frac" + (pressure ? " is-" + pressure : ""),
        },
        formatCapFraction(fill.count, MAIL_ATTACH_CAP, incomplete),
      ),
      e(
        "span",
        {
          className:
            "comm-mail__cap-state" + (pressure ? " is-" + pressure : ""),
        },
        label,
      ),
    ),
    e(
      "div",
      {
        className: "comm-mail__cap-meter",
        role: "progressbar",
        "aria-valuemin": 0,
        "aria-valuemax": MAIL_ATTACH_CAP,
        "aria-valuenow": Math.min(MAIL_ATTACH_CAP, fill.count),
      },
      e("div", {
        className:
          "comm-mail__cap-meter-fill" + (pressure ? " is-" + pressure : ""),
        style: { width: fillCapPct(fill.count) + "%" },
      }),
    ),
  );
}

export function MailCapsModal(props: MailCapsModalProps): any {
  const React = getReact();
  const { view, onClose } = props;
  const [filter, setFilter] = React.useState("all" as CapFilter);

  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = filterFills(view.fills, filter);
  const filters: Array<{ id: CapFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: view.fills.length },
    { id: "full", label: "Full", count: view.fullCount },
    { id: "near", label: "Near", count: view.warnCount },
    { id: "ok", label: "Holding", count: view.okCount },
    {
      id: "clear",
      label: "Clear",
      count: Math.max(0, view.fills.length - view.holdingCount),
    },
  ];

  return e(
    CommModalPortal,
    null,
    e(
      "div",
      {
        className: "comm-mail__caps-backdrop",
        role: "presentation",
        onMouseDown: (ev: { target: unknown; currentTarget: unknown }) => {
          if (ev.target === ev.currentTarget) onClose();
        },
      },
      e(
        "div",
        {
          className: "comm-mail__caps-modal",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Mail attachment caps",
          onMouseDown: (ev: { stopPropagation: () => void }) =>
            ev.stopPropagation(),
        },
        e(
          "div",
          { className: "comm-mail__caps-modal-hd" },
          e(
            "div",
            { className: "comm-mail__caps-modal-hd-copy" },
            e("div", { className: "comm-mail__caps-modal-title" }, "Attach caps"),
            e(
              "div",
              { className: "comm-mail__caps-modal-sub" },
              MAIL_ATTACH_CAP +
                " uncollected per character · max " +
                MAIL_ATTACH_SENDER_CAP +
                " from one sending account",
            ),
          ),
          e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn",
              onClick: onClose,
            },
            "Close",
          ),
        ),
        e(
          "div",
          { className: "comm-mail__caps-modal-filters" },
          filters.map((f) =>
            e(
              "button",
              {
                key: f.id,
                type: "button",
                className:
                  "comm-mail__caps-filter" +
                  (filter === f.id ? " is-on" : ""),
                onClick: () => setFilter(f.id),
              },
              f.label + " " + f.count,
            ),
          ),
        ),
        e(
          "div",
          { className: "comm-mail__caps-modal-list" },
          rows.length
            ? rows.map((fill) => renderCapRow(fill, view.incomplete))
            : e(
                "div",
                { className: "comm-mail__caps-modal-empty" },
                "No characters in this filter.",
              ),
        ),
      ),
    ),
  );
}
