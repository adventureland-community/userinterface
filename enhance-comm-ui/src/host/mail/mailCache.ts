/**
 * Mail pull / prefetch / head cache.
 */

import { pullMailPage } from "./api";
import { schedulePersistMailCache } from "./mailPersist";
import { reconcileAfterHeadPull } from "./mailPersistLogic";
import { assignLocalReadFlags } from "./mailUnreadLogic";
import {
  commit,
  getCommandBusy,
  getHasMore,
  getLoadingMore,
  getLocallyReadIds,
  getMails,
  getNextCursor,
  getPanelOpen,
  getLastHeadAt,
  setStatus,
} from "./mailState";
import { appendCursorPage, applyPullMeta } from "./merge";
import {
  MAIL_HEAD_TTL_MS,
  MAIL_PREFETCH_GAP_MAX_MS,
  MAIL_PREFETCH_GAP_MS,
  MAIL_PREFETCH_GAP_STEP_MS,
} from "./types";
import { getXUnread } from "./xUnread";

let pullInFlight = false;
let prefetchTimer = 0;
let prefetchPages = 0;
/** Consecutive background pull failures — backs off further. */
let prefetchFailStreak = 0;
/** Shared head/cursor pull so Refresh waits instead of no-op while in flight. */
let activePull: Promise<boolean> | null = null;

export function stopPrefetch(): void {
  if (prefetchTimer) {
    window.clearTimeout(prefetchTimer);
    prefetchTimer = 0;
  }
  commit({ prefetchArmed: false });
}

export function resetPrefetchPages(): void {
  prefetchPages = 0;
  prefetchFailStreak = 0;
}

function prefetchDelayMs(): number {
  const ramp = Math.min(
    prefetchPages * MAIL_PREFETCH_GAP_STEP_MS,
    MAIL_PREFETCH_GAP_MAX_MS - MAIL_PREFETCH_GAP_MS,
  );
  const failExtra = Math.min(prefetchFailStreak * 1000, 8000);
  return Math.min(
    MAIL_PREFETCH_GAP_MS + Math.max(0, ramp) + failExtra,
    MAIL_PREFETCH_GAP_MAX_MS + 8000,
  );
}

/** Keep pulling older pages while the panel is open and the server has more. */
export function schedulePrefetch(): void {
  stopPrefetch();
  if (!getPanelOpen() || !getHasMore() || getLoadingMore() || pullInFlight) {
    return;
  }
  commit({ prefetchArmed: true });
  prefetchTimer = window.setTimeout(() => {
    prefetchTimer = 0;
    commit({ prefetchArmed: false });
    void loadOlderMail({ background: true });
  }, prefetchDelayMs());
}

async function runPull(
  mode: "head" | "cursor",
  reason: string,
  cursor?: string | null,
): Promise<boolean> {
  if (activePull) {
    try {
      await activePull;
    } catch {
      /* ignore prior failure */
    }
    // After waiting, head refresh may still be needed (force/open).
    if (mode === "cursor" && (pullInFlight || getLoadingMore())) {
      return false;
    }
  }

  const work = (async (): Promise<boolean> => {
    if (pullInFlight) return false;
    pullInFlight = true;
    commit(
      mode === "head"
        ? { loading: true, loadingMore: false }
        : { loadingMore: true },
    );
    try {
      const res = await pullMailPage(mode === "cursor" ? cursor : null);
      if (!res.ok || !res.data) {
        setStatus(
          res.reason === "no_mail_payload"
            ? "Mail pull returned no list — try Refresh"
            : "Mail pull failed",
          "err",
        );
        return false;
      }
      const page = res.data;
      const mails = getMails();
      const prevIds = new Set<string>();
      for (let i = 0; i < mails.length; i++) prevIds.add(mails[i].id);
      const bootstrap = mode === "head" && mails.length === 0;
      if (mode === "head") {
        const reconciled = reconcileAfterHeadPull(
          mails,
          page,
          getNextCursor(),
          getHasMore(),
        );
        const assigned = assignLocalReadFlags(
          reconciled.mails,
          prevIds,
          bootstrap,
          bootstrap ? getXUnread() : 0,
          getLocallyReadIds(),
        );
        const patch: Parameters<typeof commit>[0] = {
          mails: assigned.rows,
          nextCursor: reconciled.nextCursor,
          hasMore: reconciled.hasMore,
          lastHeadAt: Date.now(),
          lastHeadReason: reason,
        };
        if (reason.indexOf("X.unread↑") === 0 && assigned.newIds.length) {
          patch.newMailCount = assigned.newIds.length;
        }
        if (!getCommandBusy()) {
          let strat = "";
          if (reconciled.strategy === "unchanged") strat = " · cache ok";
          else if (reconciled.strategy === "prepend") {
            strat = " · pushed new";
          } else if (reconciled.strategy === "stitch") {
            strat = " · kept older";
          } else if (reconciled.strategy === "truncate") {
            strat = " · refreshed head";
          }
          patch.status =
            "Loaded " +
            assigned.rows.length +
            (reconciled.hasMore ? "+" : "") +
            strat +
            " · " +
            reason;
          patch.statusKind = "";
        }
        commit(patch);
      } else {
        const assigned = assignLocalReadFlags(
          appendCursorPage(mails, page.mail),
          prevIds,
          false,
          0,
          getLocallyReadIds(),
        );
        const meta = applyPullMeta(page);
        const patch: Parameters<typeof commit>[0] = {
          mails: assigned.rows,
          nextCursor: meta.nextCursor,
          hasMore: meta.hasMore,
        };
        // Prefetch progress lives in the activity chrome — avoid status spam.
        if (!reason.startsWith("prefetch")) {
          patch.status =
            "Loaded · " +
            assigned.rows.length +
            (meta.hasMore ? "+" : "");
          patch.statusKind = "";
        }
        commit(patch);
      }
      schedulePersistMailCache();
      return true;
    } finally {
      pullInFlight = false;
      commit({ loading: false, loadingMore: false });
    }
  })();

  activePull = work;
  try {
    return await work;
  } finally {
    if (activePull === work) activePull = null;
  }
}

export async function requestMailHead(
  reason: string,
  opts?: { force?: boolean },
): Promise<void> {
  const force = !!(opts && opts.force);
  const lastHeadAt = getLastHeadAt();
  const should =
    reason === "Refresh" ||
    force ||
    reason.indexOf("X.unread") === 0 ||
    reason.indexOf("command") === 0 ||
    getMails().length === 0 ||
    lastHeadAt === 0 ||
    Date.now() - lastHeadAt >= MAIL_HEAD_TTL_MS;
  if (!should && reason !== "Refresh" && !force) return;
  await runPull("head", reason);
  if (getPanelOpen()) schedulePrefetch();
}

export async function loadOlderMail(opts?: {
  background?: boolean;
}): Promise<void> {
  const background = !!(opts && opts.background);
  if (!getHasMore() || getLoadingMore() || pullInFlight) return;
  if (!getNextCursor() && getMails().length > 0) {
    commit({ hasMore: false });
    return;
  }
  const ok = await runPull(
    "cursor",
    background ? "prefetch" : "load-older",
    getNextCursor(),
  );
  if (background) {
    if (ok) {
      prefetchPages += 1;
      prefetchFailStreak = 0;
    } else {
      prefetchFailStreak += 1;
    }
    // Only auto-chain background warming — manual Load older is one page.
    if (getPanelOpen()) schedulePrefetch();
  }
}

export function clearNewMailBanner(): void {
  commit({ newMailCount: 0 });
}
