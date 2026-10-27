/**
 * Full-cache Refresh pacing + ETA (re-pull every warmed page in place).
 * Deep pages fetch in parallel batches; ETA assumes that concurrency.
 */

import {
  MAIL_REFRESH_BATCH_GAP_MS,
  MAIL_REFRESH_CONCURRENCY,
} from "./types";
import { MAIL_HEAD_PAGE_SIZE } from "./mailPersistLogic";
import { formatDurationCompact } from "../../lib/format";

/** Seed wall-clock cost per parallel batch until samples land. */
export const MAIL_REFRESH_API_DEFAULT_MS = 220;

export type MailRefreshProgress = {
  done: number;
  total: number;
  etaMs: number;
  /** Completed pages per second (0 until the first page finishes). */
  ratePerSec: number;
};

/** How many pull_mail pages cover a contiguous cache of `mailCount` rows. */
export function refreshPageCount(
  mailCount: number,
  pageSize: number = MAIL_HEAD_PAGE_SIZE,
): number {
  if (!(mailCount > 0) || !(pageSize > 0)) return 1;
  return Math.max(1, Math.ceil(mailCount / pageSize));
}

/**
 * Skip-cursors for a full in-place refresh of `mailCount` rows.
 * First entry is always `null` (head); deeper pages follow 40, 80, …
 */
export function refreshPageCursors(
  mailCount: number,
  pageSize: number = MAIL_HEAD_PAGE_SIZE,
): Array<string | null> {
  const pages = refreshPageCount(mailCount, pageSize);
  const out: Array<string | null> = [null];
  for (let p = 1; p < pages; p++) {
    out.push(String(p * pageSize));
  }
  return out;
}

/** Split deep-page cursors into parallel fetch batches. */
export function chunkRefreshCursors(
  cursors: string[],
  concurrency: number = MAIL_REFRESH_CONCURRENCY,
): string[][] {
  const n = concurrency > 0 ? concurrency : 1;
  const out: string[][] = [];
  for (let i = 0; i < cursors.length; i += n) {
    out.push(cursors.slice(i, i + n));
  }
  return out;
}

/**
 * Remaining work after `done` pages, assuming `concurrency` in-flight pulls
 * and a short gap between batches.
 */
export function estimateRefreshRemainingMs(
  done: number,
  total: number,
  avgBatchApiMs: number,
  concurrency: number = MAIL_REFRESH_CONCURRENCY,
): number {
  const remaining = total - done;
  if (remaining <= 0) return 0;
  const conc = concurrency > 0 ? concurrency : 1;
  const batches = Math.ceil(remaining / conc);
  const gaps = Math.max(0, batches - 1) * MAIL_REFRESH_BATCH_GAP_MS;
  return gaps + batches * Math.max(0, avgBatchApiMs);
}

export function estimateRefreshEtaMs(opts: {
  done: number;
  total: number;
  startedAt: number;
  now?: number;
  avgApiMs?: number;
  concurrency?: number;
}): number {
  const { done, total, startedAt } = opts;
  const remaining = total - done;
  if (remaining <= 0) return 0;
  const now = opts.now != null ? opts.now : Date.now();
  if (done >= 1 && startedAt > 0 && now > startedAt) {
    const per = (now - startedAt) / done;
    if (per > 0) return Math.round(per * remaining);
  }
  return Math.round(
    estimateRefreshRemainingMs(
      done,
      total,
      opts.avgApiMs != null ? opts.avgApiMs : MAIL_REFRESH_API_DEFAULT_MS,
      opts.concurrency != null ? opts.concurrency : MAIL_REFRESH_CONCURRENCY,
    ),
  );
}

export function refreshRatePerSec(opts: {
  done: number;
  startedAt: number;
  now?: number;
}): number {
  if (!(opts.done > 0) || !(opts.startedAt > 0)) return 0;
  const now = opts.now != null ? opts.now : Date.now();
  const elapsed = now - opts.startedAt;
  if (!(elapsed > 0)) return 0;
  return opts.done / (elapsed / 1000);
}

function formatRefreshEta(etaMs: number): string {
  if (!(etaMs > 400)) return "";
  const compact = formatDurationCompact(etaMs / 1000);
  return compact ? "~" + compact + " left" : "";
}

function formatRefreshRate(ratePerSec: number): string {
  if (!(ratePerSec > 0)) return "";
  const rounded =
    ratePerSec >= 10
      ? String(Math.round(ratePerSec))
      : ratePerSec.toFixed(1).replace(/\.0$/, "");
  return rounded + " p/s";
}

/** Status / activity label for an in-flight cache Refresh. */
export function formatRefreshProgressLabel(progress: MailRefreshProgress): string {
  const base =
    "Refreshing cache · " + progress.done + "/" + progress.total;
  const parts = [base];
  const rate = formatRefreshRate(progress.ratePerSec);
  if (rate) parts.push(rate);
  const eta = formatRefreshEta(progress.etaMs);
  if (eta) parts.push(eta);
  return parts.join(" · ");
}
