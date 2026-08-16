import { getReact, e } from "../../../host/react";
import {
  clearNewMailBanner,
  getXUnread,
  type MailCapabilities,
  type MailStoreSnapshot,
} from "../../../host/mail";

export type MailBannerBarProps = {
  snap: MailStoreSnapshot;
  caps: MailCapabilities;
};

export type MailActivityMode = "idle" | "pull" | "warm" | "command" | "delete";

export function resolveMailActivity(snap: MailStoreSnapshot): {
  mode: MailActivityMode;
  label: string;
} {
  if (snap.deleteProgress) {
    return {
      mode: "delete",
      label:
        "Deleting " +
        snap.deleteProgress.done +
        " / " +
        snap.deleteProgress.total,
    };
  }
  if (snap.commandBusy) {
    return { mode: "command", label: "Running command" };
  }
  if (snap.loading) {
    return { mode: "pull", label: "Refreshing inbox" };
  }
  if (snap.loadingMore) {
    return {
      mode: "warm",
      label: "Warming cache · " + snap.mails.length + (snap.hasMore ? "+" : ""),
    };
  }
  if (snap.prefetchArmed) {
    return {
      mode: "warm",
      label: "Warming cache · next page…",
    };
  }
  return { mode: "idle", label: "" };
}

function formatHeadAge(lastHeadAt: number, now: number): string {
  if (lastHeadAt === 0) return "never";
  const sec = Math.max(0, Math.round((now - lastHeadAt) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return sec + "s ago";
  if (sec < 3600) return Math.max(1, Math.floor(sec / 60)) + "m ago";
  return Math.floor(sec / 3600) + "h ago";
}

/** Observe context + live activity pulse + compact cache stats. */
export function MailBannerBar(props: MailBannerBarProps): any {
  const React = getReact();
  const { snap, caps } = props;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 4000);
    return () => window.clearInterval(id);
  }, []);

  const activity = resolveMailActivity(snap);
  const active = activity.mode !== "idle";
  const unread = getXUnread();
  const headAge = formatHeadAge(snap.lastHeadAt, now);
  // Sample observe snap on each tick (live entity often lacks name).
  const obsName =
    window.observing && window.observing.name
      ? String(window.observing.name)
      : caps.observeName;
  const observeLine = obsName
    ? "Observing " + obsName
    : caps.reason || "Not observing · inbox only";
  const observeOn = !!obsName;
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
      snap.status || snap.deleteProgress
        ? e(
            "div",
            {
              className:
                "comm-mail__card comm-mail__card--status" +
                (snap.deleteProgress
                  ? " is-warn is-progress"
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
                { className: "comm-mail__card-title" },
                snap.deleteProgress
                  ? "Deleting " +
                      snap.deleteProgress.done +
                      " / " +
                      snap.deleteProgress.total
                  : snap.status,
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
  );
}
