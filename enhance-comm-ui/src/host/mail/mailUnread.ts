/**
 * Unread / X.unread sync, badge, watch, and open-read actions.
 */

import { scalePollMs } from "../../lib/perfPrefs";
import { readMail, readMailMany } from "./api";
import { requestMailHead } from "./mailCache";
import {
  buildNewMailToast,
  pickNewMailRows,
} from "./mailNewNotify";
import { schedulePersistMailCache } from "./mailPersist";
import {
  markRowsRead,
  shouldHoldUnreadUntilVerified,
} from "./mailUnreadLogic";
import {
  commit,
  emitToast,
  getLastSeenUnread,
  getLocallyReadIds,
  getMails,
  getPanelOpen,
  setStatus,
} from "./mailState";
import { buildNewMailToastNode } from "../../ui/frames/mail/mailNewToastView";

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

function paintMailBadge(badge: HTMLElement, n: number): void {
  badge.textContent = formatUnreadBadgeLabel(n);
  badge.hidden = n === 0;
  badge.title =
    n >= SERVER_UNREAD_CAP
      ? "Unread mail (server reports at most 100)"
      : n
        ? n + " unread"
        : "";
}

/** Mail unread badge DOM sync — every `[data-ecu-mail-badge]` leaf. */
export function syncMailBadge(): void {
  if (typeof document === "undefined") return;
  const badges = document.querySelectorAll("[data-ecu-mail-badge]");
  if (!badges.length) return;
  const n = getXUnread();
  for (let i = 0; i < badges.length; i++) {
    paintMailBadge(badges[i] as HTMLElement, n);
  }
}

function writeXUnread(n: number): void {
  if (typeof window !== "undefined" && window.X) {
    (window.X as { unread?: number }).unread = n;
  }
  try {
    syncMailBadge();
  } catch {
    /* badge optional during early boot */
  }
}

/** In-flight verify so stale SAC zeros do not spam pull_mail. */
let pendingUnreadVerify: Promise<void> | null = null;

async function verifyUnreadDecrease(): Promise<void> {
  try {
    await requestMailHead("X.unread↓ (verify)", { force: true });
  } catch {
    /* keep sticky lastSeen until a later sample */
  } finally {
    pendingUnreadVerify = null;
  }
}

export function applyXUnread(
  count: number,
  opts?: { quiet?: boolean },
): void {
  const n = Math.max(0, Number(count) || 0);
  const prevSeen = getLastSeenUnread();
  const quiet = !!(opts && opts.quiet);

  // Stale SAC `info.mail` can drop to 0 right after mail_received. Hold the
  // higher last-seen count and confirm with pull_mail (quiet apply).
  if (
    shouldHoldUnreadUntilVerified({
      prevSeen,
      reported: n,
      quiet,
    })
  ) {
    writeXUnread(prevSeen);
    if (!pendingUnreadVerify) {
      pendingUnreadVerify = verifyUnreadDecrease();
    }
    return;
  }

  writeXUnread(n);
  // Unchanged count — avoid re-rendering the whole mail panel on the 2s watch.
  if (prevSeen >= 0 && n === prevSeen) return;
  if (quiet) {
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
      void announceNewMailToast(delta);
    }
    return;
  }
  commit({ lastSeenUnread: n });
  if (getPanelOpen()) void requestMailHead("X.unread↓ (external read)");
}

export function syncUnreadFromX(): void {
  applyXUnread(getXUnread());
}

/** Pull newest page, then toast from → to · item (with icon when attached). */
async function announceNewMailToast(delta: number): Promise<void> {
  const want = Math.max(1, delta | 0);
  const pinned = Math.max(want, getXUnread());
  try {
    await requestMailHead("X.unread↑ (new mail toast)");
  } catch {
    /* still toast a count if the pull fails */
  }
  // Fetch path does not run stock handle_information; quiet apply from the
  // pull covers the usual case. If unread still slipped below the pin, restore.
  if (pinned > 0 && getXUnread() < pinned) {
    applyXUnread(pinned, { quiet: true });
  } else {
    syncMailBadge();
  }
  const rows = pickNewMailRows(getMails(), want);
  const payload = buildNewMailToast(rows, want);
  emitToast({
    text: payload.text,
    durationMs: payload.durationMs,
    node: buildNewMailToastNode(payload.rows, payload.head),
  });
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
  syncMailBadge();
}

let unreadWatchInstalled = false;
let unreadWatchTimer = 0;

export function installMailUnreadWatch(): void {
  if (unreadWatchInstalled) return;
  unreadWatchInstalled = true;
  bootMailUnreadWatch();
  // SAC runs ~every 4s on Comm; sample a bit faster so badge/list react promptly.
  // Phone stretches the effective cadence (see scalePollMs) without pausing trackers.
  let lastSample = 0;
  unreadWatchTimer = window.setInterval(() => {
    const every = scalePollMs(2000, "data");
    const now = Date.now();
    if (now - lastSample < every) return;
    lastSample = now;
    applyXUnread(getXUnread());
  }, 1000);
}

export function uninstallMailUnreadWatch(): void {
  if (unreadWatchTimer) {
    window.clearInterval(unreadWatchTimer);
    unreadWatchTimer = 0;
  }
  unreadWatchInstalled = false;
  pendingUnreadVerify = null;
}
