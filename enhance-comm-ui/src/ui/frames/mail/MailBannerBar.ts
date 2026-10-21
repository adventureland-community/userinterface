import { getReact, e } from "../../../host/react";
import {
  buildMailboxCapsView,
  clearNewMailBanner,
  countAttachmentsByRecipient,
  formatCapFraction,
  formatDeleteProgressLabel,
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
};

/** Compact summary — full roster lives in MailCapsModal. */
function renderCapsCard(
  view: MailboxCapsView,
  onOpenDetails: () => void,
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
  const { snap, caps } = props;
  const [now, setNow] = React.useState(() => Date.now());
  const [capsOpen, setCapsOpen] = React.useState(false);
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
    : undoActive
      ? snap.undoCount === 1
        ? "Deleted"
        : "Deleted " + snap.undoCount
      : snap.status;
  const observeLine = caps.observeName
    ? "Observing " + caps.observeName
    : caps.reason || "Not observing · inbox only";
  const observeOn = !!caps.observeName;
  const showStatus = !!snap.deleteProgress || !!snap.status || undoActive;
  const ownedNames = selfCharacterNames();
  const capView = buildMailboxCapsView({
    fills: countAttachmentsByRecipient(snap.mails, ownedNames),
    incomplete: !!snap.hasMore,
    preferName: caps.observeName,
    ownedNames,
  });
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
            " new · click to dismiss · attachments pinned at top",
        )
      : null,
    e(
      "div",
      { className: "comm-mail__chrome" },
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
            "cache " +
              snap.mails.length +
              (snap.hasMore ? "+" : "") +
              " · unread " +
              unread,
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
      renderCapsCard(capView, () => setCapsOpen(true)),
      showStatus
        ? e(
            "div",
            {
              className:
                "comm-mail__card comm-mail__card--status" +
                (snap.deleteProgress
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
                undoActive && !snap.deleteProgress
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
              snap.deleteProgress
                ? e(
                    "div",
                    {
                      className: "comm-mail__delete-track",
                      role: "progressbar",
                      "aria-valuemin": 0,
                      "aria-valuemax": snap.deleteProgress.total,
                      "aria-valuenow": snap.deleteProgress.done,
                    },
                    e("div", {
                      className: "comm-mail__delete-fill",
                      style: {
                        width:
                          snap.deleteProgress.total > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (100 * snap.deleteProgress.done) /
                                    snap.deleteProgress.total,
                                ),
                              ) + "%"
                            : "0%",
                      },
                    }),
                  )
                : null,
            ),
          )
        : null,
    ),
    capsOpen
      ? e(MailCapsModal, {
          view: capView,
          onClose: () => setCapsOpen(false),
        })
      : null,
  );
}
