/**
 * Rich “new mail” toast / banner copy — from → to + attachment label.
 * Icons are rendered via ItemInstance in the toast/banner views.
 */

import { itemInstanceLabel } from "../../lib/gameIcon";
import type { MailRow } from "./types";

/** Prefer unread rows (newest-first list), else the head of the inbox. */
export function pickNewMailRows(
  mails: MailRow[],
  want: number,
): MailRow[] {
  const n = Math.max(0, Math.floor(Number(want) || 0));
  if (!n || !mails.length) return [];
  const unread: MailRow[] = [];
  for (let i = 0; i < mails.length && unread.length < n; i++) {
    if (mails[i].read === false) unread.push(mails[i]);
  }
  if (unread.length) return unread;
  const out: MailRow[] = [];
  for (let i = 0; i < mails.length && out.length < n; i++) {
    out.push(mails[i]);
  }
  return out;
}

export function formatMailRoute(m: MailRow): string {
  const fro = String(m.fro || "?").trim() || "?";
  const to = String(m.to || "?").trim() || "?";
  return fro + " → " + to;
}

export function formatMailWhat(m: MailRow): string {
  if (m.item && m.item.name) {
    const name = String(m.item.name);
    let label = name;
    try {
      label =
        itemInstanceLabel(name, {
          p: typeof m.item.p === "string" ? m.item.p : undefined,
          level: m.item.level,
        }) || name;
    } catch {
      /* no G / window in unit tests */
    }
    const q =
      typeof m.item.q === "number" && m.item.q > 1 ? " ×" + m.item.q : "";
    return label + q;
  }
  const sub = String(m.subject || "").trim();
  return sub || "(no subject)";
}

export function formatNewMailPlainLine(m: MailRow): string {
  return formatMailRoute(m) + " · " + formatMailWhat(m);
}

export type NewMailToastPayload = {
  text: string;
  head: string;
  rows: MailRow[];
  durationMs: number;
};

/**
 * Build toast text + row list. UI mounts ItemInstance icons separately.
 * `deltaHint` is the X.unread bump when rows are still empty.
 */
export function buildNewMailToast(
  rows: MailRow[],
  deltaHint: number,
): NewMailToastPayload {
  const count = Math.max(rows.length, Math.max(0, deltaHint | 0));
  const head = count === 1 ? "1 new mail" : count + " new mails";
  if (!rows.length) {
    return {
      text: head,
      head,
      rows: [],
      durationMs: 3200,
    };
  }

  const textLines: string[] = [head];
  for (let i = 0; i < rows.length; i++) {
    textLines.push(formatNewMailPlainLine(rows[i]));
  }

  return {
    text: textLines.join("\n"),
    head,
    rows: rows.slice(),
    durationMs: Math.min(9000, 2800 + rows.length * 1100),
  };
}
