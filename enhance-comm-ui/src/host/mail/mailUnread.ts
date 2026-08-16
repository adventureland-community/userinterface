/**
 * Unread / X.unread sync, badge, watch, and open-read actions.
 */

import { readMail, readMailMany } from "./api";
import { requestMailHead } from "./mailCache";
import { schedulePersistMailCache } from "./mailPersist";
import { markRowsRead } from "./mailUnreadLogic";
import {
  commit,
  emitToast,
  getLastSeenUnread,
  getLocallyReadIds,
  getMails,
  getPanelOpen,
  setStatus,
} from "./mailState";

/** Stock Comm unread counter on window.X.
 * Server recounts unread with `.limit(100)` (send_mail / read_mail / SAC),
 * so the published count never exceeds 100 even if the inbox has more.
 */
export const SERVER_UNREAD_CAP = 100;

export function getXUnread(): number {
  const x = window.X as { unread?: number } | undefined;
  return Math.max(0, Number(x && x.unread) || 0);
}

/** Badge / chrome label; `100+` when at the server cap. */
export function formatUnreadBadgeLabel(n: number): string {
  const c = Math.max(0, Math.floor(Number(n) || 0));
  if (c >= SERVER_UNREAD_CAP) return SERVER_UNREAD_CAP + "+";
  return String(c);
}

/** Mail unread badge DOM sync — chrome leaf next to X.unread helpers. */
export function syncMailBadge(): void {
  if (typeof document === "undefined") return;
  const badge = document.querySelector(
    "[data-ecu-mail-badge]",
  ) as HTMLElement | null;
  if (!badge) return;
  const n = getXUnread();
  badge.textContent = formatUnreadBadgeLabel(n);
  badge.hidden = n === 0;
  badge.title =
    n >= SERVER_UNREAD_CAP
      ? "Unread mail (server reports at most 100)"
      : n
        ? n + " unread"
        : "";
}

export function applyXUnread(
  count: number,
  opts?: { quiet?: boolean },
): void {
  const n = Math.max(0, Number(count) || 0);
  const prevSeen = getLastSeenUnread();
  if (typeof window !== "undefined" && window.X) {
    (window.X as { unread?: number }).unread = n;
  }
  try {
    syncMailBadge();
  } catch {
    /* badge optional during early boot */
  }
  // Unchanged count — avoid re-rendering the whole mail panel on the 2s watch.
  if (prevSeen >= 0 && n === prevSeen) return;
  if (opts && opts.quiet) {
    commit({ lastSeenUnread: n });
    return;
  }
  if (prevSeen < 0) {
    commit({ lastSeenUnread: n });
    return;
  }
  if (n > prevSeen) {
    const delta = n - prevSeen;
    commit({ lastSeenUnread: n });
    if (getPanelOpen()) {
      void requestMailHead("X.unread↑ (new mail)");
    } else {
      emitToast(delta === 1 ? "1 new mail" : delta + " new mails");
    }
    return;
  }
  commit({ lastSeenUnread: n });
  if (getPanelOpen()) void requestMailHead("X.unread↓ (external read)");
}

export function syncUnreadFromX(): void {
  applyXUnread(getXUnread());
}

export function findNewestUnreadId(): string | null {
  const mails = getMails();
  for (let i = 0; i < mails.length; i++) {
    if (mails[i].read === false) return mails[i].id;
  }
  return null;
}

export async function openMailRow(id: string): Promise<void> {
  const mails = getMails();
  let m = null as (typeof mails)[0] | null;
  for (let i = 0; i < mails.length; i++) {
    if (mails[i].id === id) {
      m = mails[i];
      break;
    }
  }
  if (!m) return;
  const wasUnread = m.read === false;
  getLocallyReadIds().add(id);
  commit({
    view: { kind: "read", id },
    mails: markRowsRead(mails, new Set([id])),
    unreadStuckHint: "",
  });
  schedulePersistMailCache();
  const res = await readMail(id);
  if (res.ok) {
    // Successful read_mail means the server marked it read — trust that.
    // X.unread may stay flat when the row was only locally unread.
    if (res.unreadCount != null) applyXUnread(res.unreadCount, { quiet: true });
    else if (wasUnread) {
      const cur = getXUnread();
      if (cur > 0) applyXUnread(cur - 1, { quiet: true });
    }
    commit({ unreadStuckHint: "" });
    return;
  }
  if (wasUnread) {
    commit({
      unreadStuckHint: "Could not mark read on server — try Refresh",
    });
  }
}

export async function openNewestUnread(): Promise<void> {
  await requestMailHead("open");
  const id = findNewestUnreadId();
  if (id) await openMailRow(id);
  else commit({ view: { kind: "list" } });
}

export async function markVisibleRead(ids: string[]): Promise<void> {
  const mails = getMails();
  const unreadIds: string[] = [];
  const idSet = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    let m = null as (typeof mails)[0] | null;
    for (let j = 0; j < mails.length; j++) {
      if (mails[j].id === ids[i]) {
        m = mails[j];
        break;
      }
    }
    if (m && m.read === false) {
      getLocallyReadIds().add(ids[i]);
      unreadIds.push(ids[i]);
      idSet.add(ids[i]);
    }
  }
  if (!unreadIds.length) return;
  commit({ mails: markRowsRead(mails, idSet) });
  schedulePersistMailCache();
  const res = await readMailMany(unreadIds);
  if (res.data && res.data.unreadCount != null) {
    applyXUnread(res.data.unreadCount, { quiet: true });
  } else {
    applyXUnread(Math.max(0, getXUnread() - unreadIds.length), {
      quiet: true,
    });
  }
}

export async function markAllUnreadRead(): Promise<void> {
  const mails = getMails();
  const ids: string[] = [];
  for (let i = 0; i < mails.length; i++) {
    if (mails[i].read === false) ids.push(mails[i].id);
  }
  if (!ids.length) {
    setStatus("No unread mail in cache");
    return;
  }
  await markVisibleRead(ids);
  setStatus("Marked " + ids.length + " read");
}

export function bootMailUnreadWatch(): void {
  if (getLastSeenUnread() < 0) {
    commit({ lastSeenUnread: getXUnread() });
  }
}

let unreadWatchInstalled = false;
let unreadWatchTimer = 0;

export function installMailUnreadWatch(): void {
  if (unreadWatchInstalled) return;
  unreadWatchInstalled = true;
  bootMailUnreadWatch();
  // SAC runs ~every 4s on Comm; sample a bit faster so badge/list react promptly.
  unreadWatchTimer = window.setInterval(() => {
    applyXUnread(getXUnread());
  }, 2000);
}

export function uninstallMailUnreadWatch(): void {
  if (unreadWatchTimer) {
    window.clearInterval(unreadWatchTimer);
    unreadWatchTimer = 0;
  }
  unreadWatchInstalled = false;
}
