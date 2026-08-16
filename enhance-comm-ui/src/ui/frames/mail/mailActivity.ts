import type { MailStoreSnapshot } from "../../../host/mail";

export type MailActivityMode = "idle" | "pull" | "warm" | "command" | "delete";

export function resolveMailActivity(snap: MailStoreSnapshot): {
  mode: MailActivityMode;
  label: string;
} {
  if (snap.deleteProgress) {
    return { mode: "delete", label: "Deleting" };
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
