/**
 * Collapse near-duplicate mails in the list (same party + subject / same item).
 * Pure — UI owns expand state.
 */

import type { MailRow } from "./types";
import { mailSentMs, sortMailsNewestFirst } from "./mailSort";

export type MailCollapseGroup = {
  key: string;
  /** Newest-first as given by the filtered list order. */
  mails: MailRow[];
  head: MailRow;
  unread: number;
  untaken: number;
};

function norm(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase();
}

/** Stable signature for stacking repeats. */
export function mailCollapseKey(m: MailRow): string {
  const fro = norm(m.fro);
  const to = norm(m.to);
  if (m.item && m.item.name) {
    const name = norm(String(m.item.name));
    const level =
      typeof m.item.level === "number" && Number.isFinite(m.item.level)
        ? String(m.item.level)
        : "";
    const q =
      typeof m.item.q === "number" &&
      Number.isFinite(m.item.q) &&
      m.item.q !== 1
        ? String(m.item.q)
        : "";
    // Taken vs untaken stay together so a stack can show “3 left”.
    return ["item", fro, to, name, level, q].join("\0");
  }
  const subject = norm(m.subject);
  const message = norm(m.message).slice(0, 120);
  return ["plain", fro, to, subject, message].join("\0");
}

/**
 * Group filtered rows by collapse key, preserving first-seen (newest) order.
 * Singletons are still returned as groups of size 1.
 * Within each stack, rows are newest-first; `head` is the newest mail.
 */
export function collapseMailRows(mails: MailRow[]): MailCollapseGroup[] {
  const order: string[] = [];
  const byKey: Record<string, MailRow[]> = {};
  for (let i = 0; i < mails.length; i++) {
    const m = mails[i];
    const key = mailCollapseKey(m);
    if (!byKey[key]) {
      byKey[key] = [];
      order.push(key);
    }
    byKey[key].push(m);
  }
  const groups: MailCollapseGroup[] = [];
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const rows = sortMailsNewestFirst(byKey[key]);
    let unread = 0;
    let untaken = 0;
    for (let j = 0; j < rows.length; j++) {
      if (rows[j].read === false) unread += 1;
      if (rows[j].item && !rows[j].taken) untaken += 1;
    }
    groups.push({
      key,
      mails: rows,
      head: rows[0],
      unread,
      untaken,
    });
  }
  // Stack order follows newest head (in case input wasn’t already sorted).
  groups.sort((a, b) => {
    const d = mailSentMs(b.head) - mailSentMs(a.head);
    if (d !== 0) return d;
    return String(b.head.id).localeCompare(String(a.head.id));
  });
  return groups;
}

/**
 * Total attached quantity still available in a collapsed stack (untaken only).
 * Missing / non-positive `q` counts as 1. Taken mails are excluded.
 * Returns null when there is no item or only a single remaining unit.
 */
export function mailStackItemQuantity(g: MailCollapseGroup): number | null {
  if (!g.head.item) return null;
  let sum = 0;
  for (let i = 0; i < g.mails.length; i++) {
    const m = g.mails[i];
    if (!m.item || m.taken) continue;
    const q =
      typeof m.item.q === "number" && Number.isFinite(m.item.q) && m.item.q > 0
        ? m.item.q
        : 1;
    sum += q;
  }
  return sum > 1 ? sum : null;
}
