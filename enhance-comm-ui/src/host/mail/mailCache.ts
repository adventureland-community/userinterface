/**
 * Mail pull / prefetch / head cache.
 */

import { pullMailPage } from "./api";
import { schedulePersistMailCache } from "./mailPersist";
import {
  cursorsForMailIds,
  patchMailsById,
  reconcileAfterHeadPull,
} from "./mailPersistLogic";
import {
  chunkRefreshCursors,
  estimateRefreshEtaMs,
  formatRefreshProgressLabel,
  refreshPageCount,
  refreshPageCursors,
  refreshRatePerSec,
  type MailRefreshProgress,
} from "./mailRefreshEstimate";
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
  getRefreshProgress,
  setStatus,
} from "./mailState";
import { appendCursorPage, applyPullMeta } from "./merge";
import type { PullMailPage } from "./types";
import {
  MAIL_HEAD_TTL_MS,
  MAIL_PREFETCH_GAP_MAX_MS,
  MAIL_PREFETCH_GAP_MS,
  MAIL_PREFETCH_GAP_STEP_MS,
  MAIL_REFRESH_BATCH_GAP_MS,
  MAIL_REFRESH_CONCURRENCY,
} from "./types";
import { getXUnread } from "./mailUnread";

let pullInFlight = false;
let prefetchTimer = 0;
let prefetchPages = 0;
/** Consecutive background pull failures — backs off further. */
let prefetchFailStreak = 0;
/** Shared head/cursor pull so Refresh waits instead of no-op while in flight. */
let activePull: Promise<boolean> | null = null;
/** Bumps to cancel an in-flight full cache Refresh. */
let refreshSeq = 0;
/**
 * Search is client-side over the loaded cache. While the user has a query and
 * older pages remain, burst-prefetch so citrus (etc.) past page 1 can match.
 */
let searchBurst = false;
const MAIL_SEARCH_BURST_GAP_MS = 120;

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
  if (searchBurst) {
    const failExtra = Math.min(prefetchFailStreak * 400, 4000);
    return MAIL_SEARCH_BURST_GAP_MS + failExtra;
  }
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

/** Enable fast older-page pulls while a mail search query is active. */
export function setMailSearchBurst(on: boolean): void {
  const next = !!on;
  if (searchBurst === next) {
    if (next && getPanelOpen() && getHasMore()) schedulePrefetch();
    return;
  }
  searchBurst = next;
  if (next && getPanelOpen() && getHasMore()) {
    schedulePrefetch();
  }
}

/** Keep pulling older pages while the panel is open and the server has more. */
export function schedulePrefetch(): void {
  stopPrefetch();
  if (
    !getPanelOpen() ||
    !getHasMore() ||
    getLoadingMore() ||
    pullInFlight ||
    getRefreshProgress()
  ) {
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
  mode: "head" | "cursor" | "patch",
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
    if (
      (mode === "cursor" || mode === "patch") &&
      (pullInFlight || getLoadingMore())
    ) {
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
      const res = await pullMailPage(
        mode === "head" ? null : cursor != null ? cursor : null,
      );
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
        // Full Refresh owns the status card via refreshProgress.
        if (!getCommandBusy() && !getRefreshProgress()) {
          let strat = "";
          if (reconciled.strategy === "unchanged") strat = " · cache ok";
          else if (reconciled.strategy === "prepend") {
            strat = " · pushed new";
          } else if (reconciled.strategy === "stitch") {
            strat = " · kept older";
          } else if (reconciled.strategy === "truncate") {
            strat = " · refreshed head";
          } else if (reconciled.strategy === "replace") {
            strat = " · replaced";
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
      } else if (mode === "patch") {
        // Mid-list re-verify (take settle): update taken flags by id only.
        const assigned = assignLocalReadFlags(
          patchMailsById(mails, page.mail),
          prevIds,
          false,
          0,
          getLocallyReadIds(),
        );
        commit({ mails: assigned.rows });
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

function sleepMs(ms: number): Promise<void> {
  if (!(ms > 0)) return Promise.resolve();
  return new Promise((r) => window.setTimeout(r, ms));
}

function commitRefreshProgress(progress: MailRefreshProgress | null): void {
  commit({
    refreshProgress: progress,
    status: progress ? formatRefreshProgressLabel(progress) : "",
    statusKind: progress ? "warn" : "",
  });
}

/** Network-only page fetch for parallel Refresh batches. */
async function fetchMailPage(
  cursor: string | null,
): Promise<PullMailPage | null> {
  const res = await pullMailPage(cursor);
  if (!res.ok || !res.data) return null;
  return res.data;
}

/**
 * Apply one or more already-fetched pages onto the soft-merged cache by id.
 * Callers fetch in parallel; merges stay serial so commits don't race.
 */
function applyFetchedPages(pages: PullMailPage[]): void {
  if (!pages.length) return;
  const mails = getMails();
  const prevIds = new Set<string>();
  for (let i = 0; i < mails.length; i++) prevIds.add(mails[i].id);
  let next = mails;
  for (let i = 0; i < pages.length; i++) {
    next = patchMailsById(next, pages[i].mail);
  }
  const assigned = assignLocalReadFlags(
    next,
    prevIds,
    false,
    0,
    getLocallyReadIds(),
  );
  commit({ mails: assigned.rows });
  schedulePersistMailCache();
}

/**
 * Toolbar Refresh: soft-merge the head, then re-pull every warmed page in
 * place (parallel batches, patch by id) without wiping the list.
 * Shows page progress, rate, and ETA while running.
 */
export async function requestMailCacheRefresh(): Promise<void> {
  if (getRefreshProgress()) return;
  const seq = ++refreshSeq;
  stopPrefetch();
  const startedAt = Date.now();
  let total = refreshPageCount(getMails().length);
  commitRefreshProgress({
    done: 0,
    total,
    etaMs: estimateRefreshEtaMs({ done: 0, total, startedAt }),
    ratePerSec: 0,
  });

  const headOk = await runPull("head", "Refresh");
  if (seq !== refreshSeq) return;
  if (!headOk) {
    commitRefreshProgress(null);
    if (getPanelOpen()) schedulePrefetch();
    return;
  }

  let done = 1;
  total = Math.max(done, refreshPageCount(getMails().length));
  commitRefreshProgress({
    done,
    total,
    etaMs: estimateRefreshEtaMs({ done, total, startedAt }),
    ratePerSec: refreshRatePerSec({ done, startedAt }),
  });

  const deep: string[] = [];
  const planned = refreshPageCursors(getMails().length);
  for (let i = 0; i < planned.length; i++) {
    const c = planned[i];
    if (c != null) deep.push(c);
  }
  const batches = chunkRefreshCursors(deep, MAIL_REFRESH_CONCURRENCY);
  let concurrency = MAIL_REFRESH_CONCURRENCY;

  for (let b = 0; b < batches.length; b++) {
    if (seq !== refreshSeq) return;
    if (b > 0) await sleepMs(MAIL_REFRESH_BATCH_GAP_MS);
    if (seq !== refreshSeq) return;

    let batch = batches[b];
    let pages = await Promise.all(
      batch.map((cursor) => fetchMailPage(cursor)),
    );
    if (seq !== refreshSeq) return;

    // On failure, drop concurrency and retry the batch once (kinder to AL).
    let failed = false;
    for (let i = 0; i < pages.length; i++) {
      if (!pages[i]) {
        failed = true;
        break;
      }
    }
    if (failed && concurrency > 1) {
      concurrency = Math.max(1, Math.floor(concurrency / 2));
      const retryBatches = chunkRefreshCursors(batch, concurrency);
      const recovered: PullMailPage[] = [];
      for (let r = 0; r < retryBatches.length; r++) {
        if (seq !== refreshSeq) return;
        const retryPages = await Promise.all(
          retryBatches[r].map((cursor) => fetchMailPage(cursor)),
        );
        if (seq !== refreshSeq) return;
        for (let i = 0; i < retryPages.length; i++) {
          if (!retryPages[i]) {
            commitRefreshProgress(null);
            setStatus("Cache refresh stopped — pull failed", "err");
            if (getPanelOpen()) schedulePrefetch();
            return;
          }
          recovered.push(retryPages[i]!);
        }
        if (r + 1 < retryBatches.length) {
          await sleepMs(MAIL_REFRESH_BATCH_GAP_MS);
        }
      }
      applyFetchedPages(recovered);
      done += batch.length;
    } else if (failed) {
      commitRefreshProgress(null);
      setStatus("Cache refresh stopped — pull failed", "err");
      if (getPanelOpen()) schedulePrefetch();
      return;
    } else {
      const okPages: PullMailPage[] = [];
      for (let i = 0; i < pages.length; i++) okPages.push(pages[i]!);
      applyFetchedPages(okPages);
      done += batch.length;
    }

    total = Math.max(done, total);
    commitRefreshProgress({
      done,
      total,
      etaMs: estimateRefreshEtaMs({ done, total, startedAt }),
      ratePerSec: refreshRatePerSec({ done, startedAt }),
    });
  }

  if (seq !== refreshSeq) return;
  const n = getMails().length;
  commit({
    refreshProgress: null,
    status:
      "Cache refreshed · " + n + (getHasMore() ? "+" : "") + " · Refresh",
    statusKind: "",
    lastHeadReason: "Refresh",
  });
  schedulePersistMailCache();
  if (getPanelOpen()) schedulePrefetch();
}

/**
 * Re-pull skip-cursor pages that contain `ids` and patch taken / subject
 * onto the soft-merged cache (does not extend or truncate the list).
 */
export async function refreshMailIds(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const cursors = cursorsForMailIds(getMails(), ids);
  for (let i = 0; i < cursors.length; i++) {
    await runPull("patch", "settle · ids", cursors[i]);
  }
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
