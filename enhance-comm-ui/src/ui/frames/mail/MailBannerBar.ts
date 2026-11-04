import { getReact, e } from "../../../host/react";
import {
  buildMailboxCapsView,
  clearNewMailBanner,
  countAttachmentsByRecipient,
  cueMailItemsRecipient,
  formatCapFraction,
  formatDeleteProgressLabel,
  formatRefreshProgressLabel,
  getXUnread,
  MAIL_ATTACH_CAP,
  undoDeleteMail,
  undoSecondsLeft,
  type MailCapabilities,
  type MailStoreSnapshot,
  type MailboxCapsView,
} from "../../../host/mail";
import { formatRelativeAge } from "../../../lib/format";
import { resolveMailActivity } from "./mailActivity";
import { MailCapsModal } from "./MailCapsModal";
import { selfCharacterNames } from "./mailFormat";

export type MailBannerBarProps = {
  snap: MailStoreSnapshot;
  caps: MailCapabilities;
  /** Phone sheet — one-line strip; expand for the desktop status cards. */
  compact?: boolean;
};

/** Compact summary — full roster lives in MailCapsModal. */
function renderCapsCard(
  view: MailboxCapsView,
  onOpenDetails: () => void,
  onViewItems: (recipient: string) => void,
): any {
  const primary = view.primary;
  const pressureClass =
    view.pressure === "full"
      ? " is-cap-full"
      : view.pressure === "warn"
        ? " is-cap-warn"
        : "";
  const primaryPressure = primary ? primary.pressure : "";
  return e(
    "div",
    {
      className: "comm-mail__card comm-mail__card--caps" + pressureClass,
      title: view.title + "\n\nClick for every character.",
    },
    e(
      "div",
      { className: "comm-mail__card-body" },
      e(
        "div",
        { className: "comm-mail__cap-hd" },
        e("div", { className: "comm-mail__card-kicker" }, "Attach caps"),
        e(
          "button",
          {
            type: "button",
            className: "comm-mail__cap-details",
            onClick: (ev: { stopPropagation: () => void }) => {
              ev.stopPropagation();
              onOpenDetails();
            },
          },
          "Details",
        ),
      ),
      e(
        "div",
        {
          className:
            "comm-mail__card-title" +
            (view.pressure ? " is-cap-" + view.pressure : ""),
        },
        view.summaryLine,
      ),
      primary
        ? e(
            "div",
            { className: "comm-mail__cap-primary" },
            e(
              "div",
              { className: "comm-mail__cap-primary-top" },
              e("span", { className: "comm-mail__cap-name" }, primary.name),
              e(
                "span",
                {
                  className:
                    "comm-mail__cap-frac" +
                    (primaryPressure ? " is-" + primaryPressure : ""),
                },
                formatCapFraction(
                  primary.count,
                  MAIL_ATTACH_CAP,
                  view.incomplete,
                ),
              ),
              e(
                "span",
                {
                  className:
                    "comm-mail__cap-state" +
                    (primaryPressure ? " is-" + primaryPressure : ""),
                },
                view.primaryLabel,
              ),
            ),
            e(
              "div",
              {
                className: "comm-mail__cap-meter",
                role: "progressbar",
                "aria-valuemin": 0,
                "aria-valuemax": MAIL_ATTACH_CAP,
                "aria-valuenow": Math.min(MAIL_ATTACH_CAP, primary.count),
              },
              e("div", {
                className:
                  "comm-mail__cap-meter-fill" +
                  (primaryPressure ? " is-" + primaryPressure : ""),
                style: { width: view.primaryPct + "%" },
              }),
            ),
            primary.count > 0
              ? e(
                  "button",
                  {
                    type: "button",
                    className: "comm-mail__cap-open",
                    title: "Items inventory for " + primary.name,
                    onClick: (ev: { stopPropagation: () => void }) => {
                      ev.stopPropagation();
                      onViewItems(primary.name);
                    },
                  },
                  "View items · " + primary.name,
                )
              : null,
          )
        : null,
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__cap-open",
          onClick: onOpenDetails,
        },
        view.fills.length > 1
          ? "View all " + view.fills.length + " characters"
          : "View character caps",
      ),
    ),
  );
}

/** Observe context + live activity pulse + cache stats + attach caps. */
export function MailBannerBar(props: MailBannerBarProps): any {
  const React = getReact();
  const { snap, caps, compact } = props;
  const [now, setNow] = React.useState(() => Date.now());
  const [capsOpen, setCapsOpen] = React.useState(false);
  const [chromeOpen, setChromeOpen] = React.useState(false);
  const undoActive = snap.undoEndsAt > 0 && snap.undoCount > 0;
  React.useEffect(() => {
    const id = window.setInterval(
      () => setNow(Date.now()),
      undoActive ? 250 : 4000,
    );
    return () => window.clearInterval(id);
  }, [undoActive]);

  const activity = resolveMailActivity(snap);
  const active = activity.mode !== "idle";
  const unread = getXUnread();
  const headAge =
    snap.lastHeadAt === 0 ? "never" : formatRelativeAge(snap.lastHeadAt, now);
  const undoSec = undoSecondsLeft(snap.undoEndsAt, now);
  const statusTitle = snap.deleteProgress
    ? formatDeleteProgressLabel(snap.deleteProgress)
    : snap.refreshProgress
      ? formatRefreshProgressLabel(snap.refreshProgress)
      : undoActive
        ? snap.undoCount === 1
          ? "Deleted"
          : "Deleted " + snap.undoCount
        : snap.status;
  const observeLine = caps.observeName
    ? "Observing " + caps.observeName
    : caps.reason || "Not observing · inbox only";
  const observeOn = !!caps.observeName;
  const showStatus =
    !!snap.deleteProgress ||
    !!snap.refreshProgress ||
    !!snap.status ||
    undoActive;
  const progressBar = snap.deleteProgress || snap.refreshProgress;
  /** Phone keeps info status on the strip; cards only for progress / undo / warn / err. */
  const statusNeedsCard =
    !!progressBar ||
    undoActive ||
    snap.statusKind === "warn" ||
    snap.statusKind === "err";
  const ownedNames = selfCharacterNames();
  const capView = buildMailboxCapsView({
    fills: countAttachmentsByRecipient(snap.mails, ownedNames),
    incomplete: !!snap.hasMore,
    preferName: caps.observeName,
    ownedNames,
  });
  const inboxBits =
    snap.mails.length +
    (snap.hasMore ? "+" : "") +
    " · unread " +
    unread;
  const stripLabel = (() => {
    if (compact && showStatus && statusTitle) {
      return statusTitle + " · " + inboxBits;
    }
    if (active) return activity.label + " · " + inboxBits;
    if (observeOn) return observeLine + " · " + inboxBits;
    return "Inbox " + inboxBits;
  })();
  const showCards = !compact || chromeOpen;

  const statusCard = showStatus && (!compact || statusNeedsCard || chromeOpen)
    ? e(
        "div",
        {
          className:
            "comm-mail__card comm-mail__card--status" +
            (progressBar
              ? " is-warn is-progress"
              : undoActive
                ? " is-warn"
                : snap.statusKind === "warn"
                  ? " is-warn"
                  : snap.statusKind === "err"
                    ? " is-err"
                    : " is-info"),
        },
        e(
          "div",
          { className: "comm-mail__card-body" },
          e("div", { className: "comm-mail__card-kicker" }, "Status"),
          e(
            "div",
            { className: "comm-mail__card-title-row" },
            e("div", { className: "comm-mail__card-title" }, statusTitle),
            undoActive && !progressBar
              ? e(
                  "button",
                  {
                    type: "button",
                    className: "comm-mail__btn comm-mail__btn--undo",
                    title: "Restore deleted mail (U)",
                    onClick: (ev: any) => {
                      ev.stopPropagation();
                      undoDeleteMail();
                    },
                  },
                  undoSec > 0 ? "Undo " + undoSec + "s" : "Undo",
                )
              : null,
          ),
          progressBar
            ? e(
                "div",
                {
                  className: "comm-mail__delete-track",
                  role: "progressbar",
                  "aria-valuemin": 0,
                  "aria-valuemax": progressBar.total,
                  "aria-valuenow": progressBar.done,
                },
                e("div", {
                  className: "comm-mail__delete-fill",
                  style: {
                    width:
                      progressBar.total > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (100 * progressBar.done) / progressBar.total,
                            ),
                          ) + "%"
                        : "0%",
                  },
                }),
              )
            : null,
        ),
      )
    : null;

  return e(
    React.Fragment,
    null,
    snap.newMailCount
      ? e(
          "div",
          {
            className: "comm-mail__banner is-new",
            onClick: () => clearNewMailBanner(),
          },
          snap.newMailCount +
            " new · tap to dismiss · attachments pinned at top",
        )
      : null,
    compact
      ? e(
          "div",
          {
            className:
              "comm-mail__chrome-strip" +
              (active ? " is-on is-" + activity.mode : "") +
              (capView.pressure ? " is-cap-" + capView.pressure : ""),
          },
          e("span", {
            className: "comm-mail__pulse",
            "aria-hidden": "true",
          }),
          e(
            "button",
            {
              type: "button",
              className: "comm-mail__chrome-strip-main",
              title: "Show mail status",
              "aria-expanded": chromeOpen ? "true" : "false",
              onClick: () => setChromeOpen(!chromeOpen),
            },
            e("span", { className: "comm-mail__chrome-strip-text" }, stripLabel),
            e(
              "span",
              { className: "comm-mail__chrome-strip-chevron", "aria-hidden": true },
              chromeOpen ? "▴" : "▾",
            ),
          ),
          e(
            "button",
            {
              type: "button",
              className:
                "comm-mail__chrome-strip-caps" +
                (capView.pressure ? " is-" + capView.pressure : ""),
              title: capView.title,
              onClick: () => setCapsOpen(true),
            },
            capView.primary
              ? formatCapFraction(
                  capView.primary.count,
                  MAIL_ATTACH_CAP,
                  capView.incomplete,
                )
              : "Caps",
          ),
        )
      : null,
    showCards
      ? e(
          "div",
          {
            className:
              "comm-mail__chrome" + (compact ? " is-phone-expand" : ""),
          },
          e(
            "div",
            {
              className:
                "comm-mail__card comm-mail__card--activity" +
                (active ? " is-on is-" + activity.mode : ""),
              title: active ? activity.label : "Inbox idle",
              "aria-live": "polite",
            },
            e("span", {
              className: "comm-mail__pulse",
              "aria-hidden": "true",
            }),
            e(
              "div",
              { className: "comm-mail__card-body" },
              e("div", { className: "comm-mail__card-kicker" }, "Activity"),
              e(
                "div",
                { className: "comm-mail__card-title" },
                active ? activity.label : "Ready",
              ),
            ),
          ),
          e(
            "div",
            {
              className:
                "comm-mail__card comm-mail__card--observe" +
                (observeOn ? "" : " is-off"),
            },
            e(
              "div",
              { className: "comm-mail__card-body" },
              e("div", { className: "comm-mail__card-kicker" }, "Character"),
              e("div", { className: "comm-mail__card-title" }, observeLine),
            ),
          ),
          e(
            "div",
            { className: "comm-mail__card comm-mail__card--stats" },
            e(
              "div",
              { className: "comm-mail__card-body" },
              e("div", { className: "comm-mail__card-kicker" }, "Inbox"),
              e(
                "div",
                { className: "comm-mail__card-title" },
                "cache " + inboxBits,
              ),
              e(
                "div",
                { className: "comm-mail__card-sub" },
                "head " +
                  headAge +
                  (snap.lastHeadReason && snap.lastHeadReason !== "—"
                    ? " · " + snap.lastHeadReason
                    : ""),
              ),
            ),
          ),
          renderCapsCard(
            capView,
            () => setCapsOpen(true),
            (name) => {
              setCapsOpen(false);
              cueMailItemsRecipient(name);
            },
          ),
          statusCard,
        )
      : compact && statusCard
        ? e("div", { className: "comm-mail__chrome is-status-only" }, statusCard)
        : null,
    capsOpen
      ? e(MailCapsModal, {
          view: capView,
          onClose: () => setCapsOpen(false),
          onViewItems: (name) => {
            setCapsOpen(false);
            cueMailItemsRecipient(name);
          },
        })
      : null,
  );
}
