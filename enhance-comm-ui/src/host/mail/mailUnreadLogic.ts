/**
 * Pure unread / command-outcome helpers.
 */

import type { MailRow } from "./types";

/**
 * Assign local `read` flags for a pull merge.
 * Bootstrap: mark the newest `unreadBudget` rows unread.
 * Delta: mark brand-new ids unread.
 */
export function assignLocalReadFlags(
  rows: MailRow[],
  prevIds: Set<string>,
  bootstrap: boolean,
  unreadBudget: number,
  locallyReadIds: Set<string>,
): { rows: MailRow[]; newIds: string[] } {
  let budgetLeft = bootstrap ? unreadBudget : 0;
  const out: MailRow[] = [];
  const newIds: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const m = { ...rows[i] };
    const isNew = !prevIds.has(m.id);
    if (isNew && !bootstrap) newIds.push(m.id);
    if (locallyReadIds.has(m.id)) {
      m.read = true;
    } else if (bootstrap && budgetLeft > 0) {
      m.read = false;
      budgetLeft -= 1;
    } else if (isNew && !bootstrap) {
      m.read = false;
    } else if (m.read == null) {
      m.read = true;
    }
    out.push(m);
  }
  return { rows: out, newIds };
}

/** Return a new mails array with the given ids marked read (immutable). */
export function markRowsRead(mails: MailRow[], ids: Set<string>): MailRow[] {
  if (!ids.size) return mails;
  const out: MailRow[] = [];
  let changed = false;
  for (let i = 0; i < mails.length; i++) {
    const row = mails[i];
    if (ids.has(row.id) && row.read !== true) {
      out.push({ ...row, read: true });
      changed = true;
    } else {
      out.push(row);
    }
  }
  return changed ? out : mails;
}

export type CommandOutcomeCode =
  | "looks_sent"
  | "partial_sent"
  | "sent_inconclusive"
  | "looks_taken"
  | "partial_taken"
  | "take_no_change";

export type CommandOutcome = {
  code: CommandOutcomeCode;
  text: string;
  kind: "" | "warn" | "err";
};

export function resolveCommandOutcome(
  p: {
    kind: "send" | "take";
    beforeIds: string[];
    targetIds: string[];
    expect: number;
    /** When set, only count new mails whose `fro` matches (case-insensitive). */
    fromNames?: string[];
  },
  mails: MailRow[],
): CommandOutcome {
  if (p.kind === "send") {
    const fromKeys: string[] = [];
    if (p.fromNames) {
      for (let i = 0; i < p.fromNames.length; i++) {
        const n = String(p.fromNames[i] || "")
          .trim()
          .toLowerCase();
        if (n) fromKeys.push(n);
      }
    }
    let newCount = 0;
    for (let i = 0; i < mails.length; i++) {
      const row = mails[i];
      if (p.beforeIds.indexOf(row.id) >= 0) continue;
      if (fromKeys.length) {
        const fro = String(row.fro || "")
          .trim()
          .toLowerCase();
        if (fromKeys.indexOf(fro) < 0) continue;
      }
      newCount += 1;
    }
    const expect = p.expect > 0 ? p.expect : 1;
    // Outbound mail often lands after mail_sending; inbox may still be flat.
    // Treat zero new rows as inconclusive — character log has Mail sent/failed.
    if (expect > 1) {
      if (newCount >= expect) {
        return {
          code: "looks_sent",
          text: "Looks sent · " + newCount + "/" + expect,
          kind: "",
        };
      }
      if (newCount > 0) {
        return {
          code: "partial_sent",
          text:
            "Partial · " + newCount + "/" + expect + " — check character log",
          kind: "warn",
        };
      }
      return {
        code: "sent_inconclusive",
        text: "Sent — confirm on character log",
        kind: "",
      };
    }
    if (newCount > 0) {
      return { code: "looks_sent", text: "Looks sent", kind: "" };
    }
    return {
      code: "sent_inconclusive",
      text: "Sent — confirm on character log",
      kind: "",
    };
  }

  let okCount = 0;
  for (let i = 0; i < p.targetIds.length; i++) {
    let row: MailRow | null = null;
    for (let j = 0; j < mails.length; j++) {
      if (mails[j].id === p.targetIds[i]) {
        row = mails[j];
        break;
      }
    }
    if (row && (row.taken || !row.item)) okCount += 1;
  }
  const expect = p.expect > 0 ? p.expect : p.targetIds.length || 1;
  if (expect > 1 || p.targetIds.length > 1) {
    if (okCount >= expect) {
      return {
        code: "looks_taken",
        text: "Looks taken · " + okCount + "/" + expect,
        kind: "",
      };
    }
    if (okCount > 0) {
      return {
        code: "partial_taken",
        text:
          "Partial take · " + okCount + "/" + expect + " — check bag / log",
        kind: "warn",
      };
    }
    return {
      code: "take_no_change",
      text: "No change — check character log / bag",
      kind: "warn",
    };
  }
  if (okCount > 0) {
    return { code: "looks_taken", text: "Looks taken", kind: "" };
  }
  return {
    code: "take_no_change",
    text: "No change — check character log / bag",
    kind: "warn",
  };
}
