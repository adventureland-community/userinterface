/**
 * Unread / X.unread sync and open-read actions.
 */

import { syncMailBadge } from "../commChrome/chromeActions";
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
import { getXUnread } from "./xUnread";

export { getXUnread };

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
  if (n < prevSeen) {
    commit({ lastSeenUnread: n });
    if (getPanelOpen()) void requestMailHead("X.unread↓ (external read)");
    return;
  }
  commit({ lastSeenUnread: n });
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
