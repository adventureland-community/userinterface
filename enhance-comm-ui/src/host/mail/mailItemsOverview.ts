/**
 * Aggregate untaken mail attachments across the inbox (bank-style inventory).
 * Cap-counting rules match mailCaps — one mail = one mailbox slot; qty sums for display.
 */

import {
  countAttachmentsByRecipient,
  countsTowardAttachCap,
  type CharMailboxFill,
} from "./mailCaps";
import type { MailItem, MailRow } from "./types";

export type MailAggItem = {
  key: string;
  name: string;
  level?: number;
  p: string | null;
  /** Sum of item.q (default 1) across mails. */
  q: number;
  mailIds: string[];
  /** Distinct `to` display names for this stack. */
  recipients: string[];
};

export type MailRecipientItemSection = {
  /** Display casing from mail `to` or fill. */
  name: string;
  fill: CharMailboxFill | null;
  items: MailAggItem[];
};

/** Same shape as bank aggKey: name + level + title. */
export function mailItemAggKey(item: MailItem): string {
  return (
    String(item.name) +
    "\0" +
    (item.level != null ? String(item.level) : "") +
    "\0" +
    (item.p != null ? String(item.p) : "")
  );
}

function isInventoryMail(m: MailRow): boolean {
  if (!countsTowardAttachCap(m)) return false;
  if (m.canTake === false) return false;
  if (!m.item || !m.item.name) return false;
  return true;
}

function itemQty(item: MailItem): number {
  if (item.q != null && Number.isFinite(item.q)) return Number(item.q);
  return 1;
}

/**
 * Merge identical name/level/title attachments across mails.
 * Only untaken attachments that count toward caps (and can_take !== false).
 */
export function aggregateMailItems(mails: MailRow[]): MailAggItem[] {
  const byKey: Record<string, MailAggItem> = Object.create(null);
  const recipSeen: Record<string, Set<string>> = Object.create(null);
  for (let i = 0; i < mails.length; i++) {
    const m = mails[i];
    if (!isInventoryMail(m) || !m.item) continue;
    const key = mailItemAggKey(m.item);
    let row = byKey[key];
    if (!row) {
      row = {
        key,
        name: String(m.item.name),
        level: m.item.level,
        p: m.item.p != null ? String(m.item.p) : null,
        q: 0,
        mailIds: [],
        recipients: [],
      };
      byKey[key] = row;
      recipSeen[key] = new Set();
    }
    row.q += itemQty(m.item);
    row.mailIds.push(m.id);
    const display = String(m.to || "").trim();
    const rkey = display.toLowerCase();
    if (display && !recipSeen[key].has(rkey)) {
      recipSeen[key].add(rkey);
      row.recipients.push(display);
    }
  }
  const keys = Object.keys(byKey);
  const out: MailAggItem[] = [];
  for (let i = 0; i < keys.length; i++) out.push(byKey[keys[i]]);
  out.sort((a, b) => {
    const n = a.name.localeCompare(b.name);
    if (n !== 0) return n;
    const la = a.level != null ? a.level : -1;
    const lb = b.level != null ? b.level : -1;
    if (la !== lb) return la - lb;
    return String(a.p || "").localeCompare(String(b.p || ""));
  });
  return out;
}

/** Mails in `pool` that belong to an aggregated stack (preserve pool order). */
export function mailsForAgg(
  pool: MailRow[],
  agg: MailAggItem | null | undefined,
): MailRow[] {
  if (!agg || !agg.mailIds.length) return [];
  const want = new Set(agg.mailIds);
  const out: MailRow[] = [];
  for (let i = 0; i < pool.length; i++) {
    if (want.has(pool[i].id)) out.push(pool[i]);
  }
  return out;
}

export function findMailAggByKey(
  items: MailAggItem[],
  key: string | null | undefined,
): MailAggItem | null {
  if (!key) return null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].key === key) return items[i];
  }
  return null;
}

/**
 * Sections per destination character (attach-cap unit), highest fill first.
 * Each section re-aggregates only that recipient's inventory mails.
 */
export function groupMailItemsByRecipient(
  mails: MailRow[],
  fills?: CharMailboxFill[],
): MailRecipientItemSection[] {
  const fillList =
    fills && fills.length
      ? fills
      : countAttachmentsByRecipient(mails);
  const fillByKey = new Map<string, CharMailboxFill>();
  for (let i = 0; i < fillList.length; i++) {
    fillByKey.set(fillList[i].name.toLowerCase(), fillList[i]);
  }

  const buckets = new Map<string, { name: string; rows: MailRow[] }>();
  for (let i = 0; i < mails.length; i++) {
    const m = mails[i];
    if (!isInventoryMail(m)) continue;
    const display = String(m.to || "").trim();
    const key = display.toLowerCase();
    if (!key) continue;
    const prev = buckets.get(key);
    if (prev) prev.rows.push(m);
    else buckets.set(key, { name: display, rows: [m] });
  }

  const sections: MailRecipientItemSection[] = [];
  buckets.forEach((bucket, key) => {
    const fill = fillByKey.get(key) || null;
    sections.push({
      name: fill ? fill.name : bucket.name,
      fill,
      items: aggregateMailItems(bucket.rows),
    });
  });
  sections.sort((a, b) => {
    const ca = a.fill ? a.fill.count : a.items.reduce((n, it) => n + it.mailIds.length, 0);
    const cb = b.fill ? b.fill.count : b.items.reduce((n, it) => n + it.mailIds.length, 0);
    if (cb !== ca) return cb - ca;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return sections;
}

/** True when any of the stack's recipients is at/over the attach cap. */
export function mailAggTouchesFullCap(
  agg: MailAggItem,
  fills: CharMailboxFill[],
): boolean {
  if (!fills.length || !agg.recipients.length) return false;
  const full = new Set<string>();
  for (let i = 0; i < fills.length; i++) {
    if (fills[i].pressure === "full") {
      full.add(fills[i].name.toLowerCase());
    }
  }
  if (!full.size) return false;
  for (let i = 0; i < agg.recipients.length; i++) {
    if (full.has(agg.recipients[i].toLowerCase())) return true;
  }
  return false;
}

export type MailItemsSelectTarget = {
  ids: string[];
  /** Highlighted stack vs every untaken attachment in the filter. */
  kind: "stack" | "all";
};

/**
 * Toolbar Select-all targets in Items mode.
 * Prefer the highlighted stack when any of its mails are still in `filtered`;
 * otherwise every untaken attachment mail in the filter.
 */
export function mailIdsForItemsSelectAll(
  filtered: MailRow[],
  selectedItemMailIds: string[] | null | undefined,
): MailItemsSelectTarget {
  if (selectedItemMailIds && selectedItemMailIds.length) {
    const want = new Set(selectedItemMailIds);
    const stack: string[] = [];
    for (let i = 0; i < filtered.length; i++) {
      if (want.has(filtered[i].id)) stack.push(filtered[i].id);
    }
    if (stack.length) return { ids: stack, kind: "stack" };
  }
  const agg = aggregateMailItems(filtered);
  const out: string[] = [];
  for (let i = 0; i < agg.length; i++) {
    const ids = agg[i].mailIds;
    for (let j = 0; j < ids.length; j++) out.push(ids[j]);
  }
  return { ids: out, kind: "all" };
}

/** True when every id in `ids` is checked (extras elsewhere are ignored). */
export function mailIdsAllChecked(
  ids: string[],
  selectedIds: Record<string, boolean>,
): boolean {
  if (!ids.length) return false;
  for (let i = 0; i < ids.length; i++) {
    if (!selectedIds[ids[i]]) return false;
  }
  return true;
}
