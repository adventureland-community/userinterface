/**
 * Delete pacing + ETA — gaps match mailDelete finalizeDeletes.
 */

import {
  MAIL_DELETE_GAP_MAX_MS,
  MAIL_DELETE_GAP_MS,
  MAIL_DELETE_GAP_STEP_MS,
} from "./types";
import { formatDurationCompact } from "../../lib/format";

/** Seed API cost until the first delete_mail samples land. */
export const MAIL_DELETE_API_DEFAULT_MS = 250;

/** Gap before the next delete_mail — ramps slightly on long batches. */
export function deleteGapMs(index: number): number {
  if (index <= 0) return 0;
  const ramp = Math.min(
    index * MAIL_DELETE_GAP_STEP_MS,
    MAIL_DELETE_GAP_MAX_MS - MAIL_DELETE_GAP_MS,
  );
  return Math.min(
    MAIL_DELETE_GAP_MS + Math.max(0, ramp),
    MAIL_DELETE_GAP_MAX_MS,
  );
}

/**
 * Remaining work after `done` deletes finished (next index is `done`).
 * Uses scheduled gaps + avg API ms when empirical pace is not ready.
 */
export function estimateDeleteRemainingMs(
  done: number,
  total: number,
  avgApiMs: number,
): number {
  const remaining = total - done;
  if (remaining <= 0) return 0;
  let gaps = 0;
  for (let i = done; i < total; i++) gaps += deleteGapMs(i);
  const api = Math.max(0, avgApiMs);
  return gaps + remaining * api;
}

/**
 * Prefer measured pace once a few deletes completed; else schedule estimate.
 */
export function estimateDeleteEtaMs(opts: {
  done: number;
  total: number;
  startedAt: number;
  now?: number;
  avgApiMs?: number;
}): number {
  const { done, total, startedAt } = opts;
  const remaining = total - done;
  if (remaining <= 0) return 0;
  const now = opts.now != null ? opts.now : Date.now();
  if (done >= 2 && startedAt > 0 && now > startedAt) {
    const per = (now - startedAt) / done;
    if (per > 0) return Math.round(per * remaining);
  }
  return Math.round(
    estimateDeleteRemainingMs(
      done,
      total,
      opts.avgApiMs != null ? opts.avgApiMs : MAIL_DELETE_API_DEFAULT_MS,
    ),
  );
}

/** "~45s" / "~3m" for progress labels; empty when nothing useful to show. */
export function formatDeleteEta(etaMs: number): string {
  if (!(etaMs > 400)) return "";
  const compact = formatDurationCompact(etaMs / 1000);
  return compact ? "~" + compact : "";
}

/** Single UI label for delete progress (Status card owns this). */
export function formatDeleteProgressLabel(progress: {
  done: number;
  total: number;
  etaMs: number;
}): string {
  const base = "Deleting " + progress.done + " / " + progress.total;
  const eta = formatDeleteEta(progress.etaMs);
  return eta ? base + " · " + eta + " left" : base;
}
