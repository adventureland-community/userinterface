/**
 * Pure helpers for mail cache persistence / head reconciliation.
 *
 * Adventure Land uses skip-cursor pages (cursor ≈ offset). When the newest
 * page changes, common feed/cache practice is:
 *   • soft-merge / stitch the head onto the cached list at an id overlap
 *   • keep the contiguous tail (do not refetch every page)
 *   • only drop the tail when there is no overlap (hard divergence)
 * See: infinite-query “patch page 0”, optimistic prepend, overlap stitch.
 */

import { applyPullMeta, mergeHeadPage } from "./merge";
import type { MailRow, PullMailPage } from "./types";

/** Stock pull_mail page size (server limit). */
export const MAIL_HEAD_PAGE_SIZE = 40;

export type HeadReconcileStrategy =
  | "unchanged"
  | "prepend"
  | "stitch"
  | "truncate"
  | "replace";

export type HeadReconcileResult = {
  mails: MailRow[];
  nextCursor: string | null;
  hasMore: boolean;
  strategy: HeadReconcileStrategy;
};

/** Stable fingerprint of the newest `limit` rows (ids + taken). */
export function headFingerprint(
  mails: MailRow[],
  limit: number = MAIL_HEAD_PAGE_SIZE,
): string {
  const n = Math.min(mails.length, limit);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const m = mails[i];
    const taken =
      m.taken === true ? "1" : m.taken === false ? "0" : "-";
    parts.push(m.id + ":" + taken);
  }
  return parts.join("|");
}

function indexOfId(rows: MailRow[], id: string): number {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return i;
  }
  return -1;
}

function cloneRow(m: MailRow): MailRow {
  const next: MailRow = {
    id: m.id,
    fro: m.fro,
    to: m.to,
    subject: m.subject,
    message: m.message,
    sent: m.sent,
  };
  if (m.read != null) next.read = m.read;
  if (m.item) next.item = { ...m.item };
  if (m.taken != null) next.taken = m.taken;
  if (m.system != null) next.system = m.system;
  return next;
}

/**
 * Soft-update rows that appear in `page` onto matching ids in `existing`
 * (taken flags, subject, …) without reordering.
 */
function patchExistingFromPage(
  existing: MailRow[],
  page: MailRow[],
): MailRow[] {
  if (!page.length) return existing.slice();
  const byId = new Map<string, MailRow>();
  for (let i = 0; i < page.length; i++) byId.set(page[i].id, page[i]);
  const out: MailRow[] = [];
  for (let i = 0; i < existing.length; i++) {
    const prev = existing[i];
    const patch = byId.get(prev.id);
    out.push(patch ? Object.assign({}, prev, patch) : prev);
  }
  return out;
}

export type HeadOverlap = {
  /** Index into `head` where the overlap starts. */
  headStart: number;
  /** Index into `existing` where that overlap anchors. */
  existingStart: number;
  /** Contiguous matching length from those starts. */
  matchLen: number;
};

/**
 * Best id-overlap between a fresh head page and the cached list.
 * Prefers longer matches, then overlaps closer to the top of the head
 * (so pure prepends win over weaker mid-list matches).
 */
export function findHeadOverlap(
  existing: MailRow[],
  head: MailRow[],
): HeadOverlap | null {
  if (!existing.length || !head.length) return null;
  let best: HeadOverlap | null = null;
  for (let headStart = 0; headStart < head.length; headStart++) {
    const existingStart = indexOfId(existing, head[headStart].id);
    if (existingStart < 0) continue;
    let matchLen = 0;
    while (
      headStart + matchLen < head.length &&
      existingStart + matchLen < existing.length &&
      head[headStart + matchLen].id ===
        existing[existingStart + matchLen].id
    ) {
      matchLen += 1;
    }
    if (matchLen === 0) continue;
    if (
      !best ||
      matchLen > best.matchLen ||
      (matchLen === best.matchLen && headStart < best.headStart)
    ) {
      best = { headStart, existingStart, matchLen };
    }
  }
  return best;
}

function strategyFromOverlap(
  overlap: HeadOverlap,
  headLen: number,
): "unchanged" | "prepend" | "stitch" {
  const { headStart, existingStart, matchLen } = overlap;
  if (headStart === 0 && existingStart === 0 && matchLen === headLen) {
    return "unchanged";
  }
  // New rows pushed in front of a still-contiguous cache prefix.
  if (existingStart === 0 && headStart > 0) return "prepend";
  // Head[0] still anchors at existing[0] but window slid (taken-only already
  // handled via fingerprint); treat as prepend-ish keep.
  if (headStart === 0 && existingStart === 0) return "prepend";
  // Delete / reorder in the newest window — drop rows above the anchor,
  // keep the contiguous tail.
  return "stitch";
}

/**
 * Stitch a fresh head page onto a cached list at the best id overlap.
 * New rows are pushed in front; the contiguous tail after the overlap is kept.
 * Returns null when there is no overlap (caller should truncate to head).
 */
export function stitchHeadOntoCache(
  existing: MailRow[],
  head: MailRow[],
): {
  mails: MailRow[];
  strategy: "unchanged" | "prepend" | "stitch";
} | null {
  if (!head.length) return null;
  if (!existing.length) {
    return { mails: head.map(cloneRow), strategy: "prepend" };
  }

  const overlap = findHeadOverlap(existing, head);
  if (!overlap) return null;

  const { existingStart, matchLen } = overlap;
  const headIds = new Set<string>();
  for (let i = 0; i < head.length; i++) headIds.add(head[i].id);

  const out: MailRow[] = [];
  for (let i = 0; i < head.length; i++) {
    const live = head[i];
    const prevIdx = indexOfId(existing, live.id);
    const prev = prevIdx >= 0 ? existing[prevIdx] : null;
    out.push(prev ? Object.assign({}, prev, live) : cloneRow(live));
  }

  const tailStart = existingStart + matchLen;
  for (let i = tailStart; i < existing.length; i++) {
    const row = existing[i];
    if (headIds.has(row.id)) continue;
    out.push(row);
  }

  return {
    mails: out,
    strategy: strategyFromOverlap(overlap, head.length),
  };
}

/** True when the new head shares a contiguous id overlap with the cache. */
export function canKeepOlderAfterHead(
  existing: MailRow[],
  page: MailRow[],
): boolean {
  return findHeadOverlap(existing, page) != null;
}

/**
 * After a fresh head pull, stitch onto the cache when possible so older
 * pages are kept; only truncate when the head shares no ids with the cache.
 */
export function reconcileAfterHeadPull(
  existing: MailRow[],
  headPage: PullMailPage,
  prevCursor: string | null,
  prevHasMore: boolean,
): HeadReconcileResult {
  const page = headPage.mail;
  const meta = applyPullMeta(headPage);

  if (!headPage.more) {
    return {
      mails: mergeHeadPage([], page),
      nextCursor: null,
      hasMore: false,
      strategy: "replace",
    };
  }

  if (!existing.length) {
    return {
      mails: mergeHeadPage([], page),
      nextCursor: meta.nextCursor,
      hasMore: meta.hasMore,
      strategy: "replace",
    };
  }

  const fpNew = headFingerprint(page, page.length || MAIL_HEAD_PAGE_SIZE);
  const fpOld = headFingerprint(existing, page.length || MAIL_HEAD_PAGE_SIZE);
  if (fpNew === fpOld) {
    return {
      mails: patchExistingFromPage(existing, page),
      nextCursor: prevCursor,
      hasMore: prevHasMore || meta.hasMore,
      strategy: "unchanged",
    };
  }

  const stitched = stitchHeadOntoCache(existing, page);
  if (stitched) {
    const merged = stitched.mails;
    const hasMore = prevHasMore || meta.hasMore;
    return {
      mails: merged,
      // Contiguous skip cursor: we hold a prefix of the server inbox.
      nextCursor: hasMore ? String(merged.length) : null,
      hasMore,
      strategy: stitched.strategy,
    };
  }

  return {
    mails: mergeHeadPage([], page),
    nextCursor: meta.nextCursor,
    hasMore: meta.hasMore,
    strategy: "truncate",
  };
}
