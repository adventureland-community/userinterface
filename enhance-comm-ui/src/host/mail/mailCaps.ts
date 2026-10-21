/**
 * Adventure.land mail attachment caps (mongodb safe-claim era / upstream mail.js).
 *
 * Caps are **per destination character**, not account-wide:
 * - 200 uncollected attachments on that character (`mailbox_full`)
 * - 20 of those from the same sending account (`mail_sender_limit`)
 *
 * Pending claims still count; settled takes and plain letters do not.
 * Automatic reward mail is exempt server-side — pull_mail cannot always tell,
 * so cached counts are estimates.
 */

import type { MailRow } from "./types";

export const MAIL_ATTACH_CAP = 200;
export const MAIL_ATTACH_SENDER_CAP = 20;

/** Soft warn thresholds (UI only). */
export const MAIL_ATTACH_CAP_WARN = 160;
export const MAIL_ATTACH_SENDER_CAP_WARN = 15;

export type MailCapPressure = "" | "warn" | "full";

/** True while the attachment still occupies a mailbox slot. */
export function countsTowardAttachCap(m: MailRow): boolean {
  if (!m.item) return false;
  if (m.taken && !m.takenPending) return false;
  return true;
}

function nameSet(names: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < names.length; i++) {
    const n = String(names[i] || "")
      .trim()
      .toLowerCase();
    if (n) out.add(n);
  }
  return out;
}

/**
 * Uncollected attachments in *this* account's receive slots (can_take !== false).
 * Account-wide total — useful for stats, not for the 200 cap (that is per char).
 */
export function countMailboxAttachments(mails: MailRow[]): number {
  let n = 0;
  for (let i = 0; i < mails.length; i++) {
    const m = mails[i];
    if (!countsTowardAttachCap(m)) continue;
    if (m.canTake === false) continue;
    n += 1;
  }
  return n;
}

export type CharMailboxFill = {
  /** Display casing from mail `to` (or roster). */
  name: string;
  count: number;
  pressure: MailCapPressure;
};

/**
 * Uncollected attachments grouped by recipient character (server cap unit).
 * When `ownedNames` is set, only those recipients are included.
 */
export function countAttachmentsByRecipient(
  mails: MailRow[],
  ownedNames?: string[],
): CharMailboxFill[] {
  const owned =
    ownedNames && ownedNames.length ? nameSet(ownedNames) : null;
  const buckets = new Map<string, { name: string; count: number }>();
  for (let i = 0; i < mails.length; i++) {
    const m = mails[i];
    if (!countsTowardAttachCap(m)) continue;
    if (m.canTake === false) continue;
    const display = String(m.to || "").trim();
    const key = display.toLowerCase();
    if (!key) continue;
    if (owned && !owned.has(key)) continue;
    const prev = buckets.get(key);
    if (prev) prev.count += 1;
    else buckets.set(key, { name: display, count: 1 });
  }
  const out: CharMailboxFill[] = [];
  buckets.forEach((v) => {
    out.push({
      name: v.name,
      count: v.count,
      pressure: mailboxCapPressure(v.count),
    });
  });
  out.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return out;
}

/**
 * Uncollected attachments from `fromNames` to recipient `toName` still visible
 * in the account inbox (sender copies + self-mail). Under-counts if the sender
 * already hid their copy.
 */
export function countSenderAttachmentsTo(
  mails: MailRow[],
  fromNames: string[],
  toName: string,
): number {
  const from = nameSet(fromNames);
  const to = String(toName || "")
    .trim()
    .toLowerCase();
  if (!from.size || !to) return 0;
  let n = 0;
  for (let i = 0; i < mails.length; i++) {
    const m = mails[i];
    if (!countsTowardAttachCap(m)) continue;
    if (
      String(m.to || "")
        .trim()
        .toLowerCase() !== to
    ) {
      continue;
    }
    if (
      !from.has(
        String(m.fro || "")
          .trim()
          .toLowerCase(),
      )
    ) {
      continue;
    }
    n += 1;
  }
  return n;
}

export function mailboxCapPressure(
  count: number,
  incomplete?: boolean,
): MailCapPressure {
  if (count >= MAIL_ATTACH_CAP) return "full";
  if (!incomplete && count >= MAIL_ATTACH_CAP_WARN) return "warn";
  if (incomplete && count >= MAIL_ATTACH_CAP_WARN) return "warn";
  return "";
}

export function senderCapPressure(
  count: number,
  queued = 0,
): MailCapPressure {
  const have = Math.max(0, count | 0);
  const add = Math.max(0, queued | 0);
  // 20th is kept; 21st is refused — at 20 you cannot send another.
  if (have >= MAIL_ATTACH_SENDER_CAP || have + add > MAIL_ATTACH_SENDER_CAP) {
    return "full";
  }
  if (have + add >= MAIL_ATTACH_SENDER_CAP_WARN) return "warn";
  return "";
}

/** Compact `47/200` or `47+/200` when older pages may hold more. */
export function formatCapFraction(
  count: number,
  cap: number,
  incomplete?: boolean,
): string {
  const n = Math.max(0, count | 0);
  return n + (incomplete ? "+" : "") + "/" + cap;
}

/** @deprecated Prefer mailboxCapsTitle — aggregate vs 200 was misleading. */
export function mailboxCapTitle(count: number, incomplete?: boolean): string {
  return mailboxCapsTitle(
    [{ name: "mailbox", count, pressure: mailboxCapPressure(count, incomplete) }],
    incomplete,
  );
}

function worstPressure(fills: CharMailboxFill[]): MailCapPressure {
  let worst: MailCapPressure = "";
  for (let i = 0; i < fills.length; i++) {
    const p = fills[i].pressure;
    if (p === "full") return "full";
    if (p === "warn") worst = "warn";
  }
  return worst;
}

/**
 * Compact inbox line: `thmsn 200/200 · RedMill 185/200 · +3 chars`
 * Prefers the observed character when present, then highest fills.
 */
export function formatMailboxCapsLine(
  fills: CharMailboxFill[],
  opts?: { incomplete?: boolean; preferName?: string | null; maxNames?: number },
): string {
  const incomplete = !!(opts && opts.incomplete);
  const maxNames = opts && opts.maxNames != null ? opts.maxNames : 2;
  if (!fills.length) {
    return "0/" + MAIL_ATTACH_CAP + " per char" + (incomplete ? "+" : "");
  }
  const prefer = String((opts && opts.preferName) || "")
    .trim()
    .toLowerCase();
  const shown: CharMailboxFill[] = [];
  const used = new Set<string>();
  if (prefer) {
    for (let i = 0; i < fills.length; i++) {
      const key = fills[i].name.toLowerCase();
      if (key !== prefer) continue;
      shown.push(fills[i]);
      used.add(key);
      break;
    }
  }
  for (let i = 0; i < fills.length && shown.length < maxNames; i++) {
    const key = fills[i].name.toLowerCase();
    if (used.has(key)) continue;
    shown.push(fills[i]);
    used.add(key);
  }
  const parts: string[] = [];
  for (let i = 0; i < shown.length; i++) {
    const f = shown[i];
    parts.push(
      f.name +
        " " +
        formatCapFraction(f.count, MAIL_ATTACH_CAP, incomplete),
    );
  }
  const rest = fills.length - shown.length;
  if (rest > 0) {
    parts.push("+" + rest + " char" + (rest === 1 ? "" : "s"));
  }
  return parts.join(" · ");
}

export function mailboxCapsTitle(
  fills: CharMailboxFill[],
  incomplete?: boolean,
): string {
  const lines: string[] = [
    "Server caps are per character: 200 uncollected attachments each, and at most 20 from one sending account. Pending claims count; take or delete before new item mail can land.",
  ];
  if (!fills.length) {
    lines.push("No untaken attachments in the cached inbox.");
  } else {
    const maxList = Math.min(fills.length, 12);
    for (let i = 0; i < maxList; i++) {
      const f = fills[i];
      const frac = formatCapFraction(f.count, MAIL_ATTACH_CAP, incomplete);
      let note = "";
      if (f.pressure === "full") note = " — full (new item mail blocked)";
      else if (f.pressure === "warn") note = " — nearly full";
      lines.push(f.name + " " + frac + note);
    }
    if (fills.length > maxList) {
      lines.push("…and " + (fills.length - maxList) + " more characters");
    }
  }
  if (incomplete) {
    lines.push("Cache still loading older pages — counts may rise.");
  }
  return lines.join("\n");
}

function withFillPressure(
  fills: CharMailboxFill[],
  incomplete?: boolean,
): CharMailboxFill[] {
  const out: CharMailboxFill[] = [];
  for (let i = 0; i < fills.length; i++) {
    const f = fills[i];
    out.push({
      name: f.name,
      count: f.count,
      pressure: mailboxCapPressure(f.count, incomplete),
    });
  }
  return out;
}

export function summarizeMailboxCaps(opts: {
  fills: CharMailboxFill[];
  incomplete?: boolean;
  preferName?: string | null;
}): { line: string; pressure: MailCapPressure; title: string } {
  const incomplete = !!opts.incomplete;
  const withPressure = withFillPressure(opts.fills, incomplete);
  return {
    line: formatMailboxCapsLine(withPressure, {
      incomplete,
      preferName: opts.preferName,
    }),
    pressure: worstPressure(withPressure),
    title: mailboxCapsTitle(withPressure, incomplete),
  };
}

/** UI model for the compact caps card + details modal. */
export type MailboxCapsView = {
  pressure: MailCapPressure;
  title: string;
  incomplete: boolean;
  /** Observed character when present, else the fullest mailbox. */
  primary: CharMailboxFill | null;
  /** 0–100 for the primary meter (capped; over-cap still paints full). */
  primaryPct: number;
  primaryLabel: string;
  /** Compact tally e.g. `3 full · 1 near · 8 holding`. */
  summaryLine: string;
  fullCount: number;
  warnCount: number;
  okCount: number;
  holdingCount: number;
  /** All fills for the details modal (pressure-sorted). */
  fills: CharMailboxFill[];
};

function pickPrimaryFill(
  fills: CharMailboxFill[],
  preferName?: string | null,
): CharMailboxFill | null {
  if (!fills.length) return null;
  const prefer = String(preferName || "")
    .trim()
    .toLowerCase();
  if (prefer) {
    for (let i = 0; i < fills.length; i++) {
      if (fills[i].name.toLowerCase() === prefer) return fills[i];
    }
  }
  // Prefer a full/warn mailbox over a quiet observed miss already handled.
  for (let i = 0; i < fills.length; i++) {
    if (fills[i].pressure === "full") return fills[i];
  }
  for (let i = 0; i < fills.length; i++) {
    if (fills[i].pressure === "warn") return fills[i];
  }
  return fills[0];
}

export function fillCapLabel(fill: CharMailboxFill): string {
  if (fill.pressure === "full") {
    return fill.count > MAIL_ATTACH_CAP ? "over cap" : "full";
  }
  if (fill.pressure === "warn") return "nearly full";
  if (fill.count > 0) return "ok";
  return "clear";
}

export function fillCapPct(count: number): number {
  return Math.min(
    100,
    Math.round((100 * Math.max(0, count | 0)) / MAIL_ATTACH_CAP),
  );
}

/**
 * Merge roster names so the details modal can list every owned character,
 * including empty mailboxes (sorted full → warn → holding → clear).
 */
export function mergeOwnedMailboxFills(
  fills: CharMailboxFill[],
  ownedNames: string[],
  incomplete?: boolean,
): CharMailboxFill[] {
  const byKey = new Map<string, CharMailboxFill>();
  for (let i = 0; i < fills.length; i++) {
    const f = fills[i];
    byKey.set(f.name.toLowerCase(), {
      name: f.name,
      count: f.count,
      pressure: mailboxCapPressure(f.count, incomplete),
    });
  }
  for (let i = 0; i < ownedNames.length; i++) {
    const display = String(ownedNames[i] || "").trim();
    if (!display) continue;
    const key = display.toLowerCase();
    if (byKey.has(key)) continue;
    byKey.set(key, {
      name: display,
      count: 0,
      pressure: "",
    });
  }
  const out: CharMailboxFill[] = [];
  byKey.forEach((v) => out.push(v));
  out.sort((a, b) => {
    const ra =
      a.pressure === "full"
        ? 0
        : a.pressure === "warn"
          ? 1
          : a.count > 0
            ? 2
            : 3;
    const rb =
      b.pressure === "full"
        ? 0
        : b.pressure === "warn"
          ? 1
          : b.count > 0
            ? 2
            : 3;
    if (ra !== rb) return ra - rb;
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return out;
}

function formatCapsSummaryLine(
  fullCount: number,
  warnCount: number,
  holdingCount: number,
): string {
  const parts: string[] = [];
  if (fullCount > 0) {
    parts.push(fullCount + " full");
  }
  if (warnCount > 0) {
    parts.push(warnCount + " near");
  }
  const quiet = Math.max(0, holdingCount - fullCount - warnCount);
  if (quiet > 0) {
    parts.push(quiet + " holding");
  }
  if (!parts.length) return "All clear";
  return parts.join(" · ");
}

export function buildMailboxCapsView(opts: {
  fills: CharMailboxFill[];
  incomplete?: boolean;
  preferName?: string | null;
  ownedNames?: string[];
}): MailboxCapsView {
  const incomplete = !!opts.incomplete;
  const owned = opts.ownedNames || [];
  const fills = mergeOwnedMailboxFills(opts.fills, owned, incomplete);
  // Compact card only cares about characters currently holding attaches.
  const holding = fills.filter((f) => f.count > 0);
  const primary = pickPrimaryFill(
    holding.length ? holding : fills,
    opts.preferName,
  );
  let fullCount = 0;
  let warnCount = 0;
  for (let i = 0; i < holding.length; i++) {
    if (holding[i].pressure === "full") fullCount += 1;
    else if (holding[i].pressure === "warn") warnCount += 1;
  }
  const okCount = Math.max(0, holding.length - fullCount - warnCount);
  return {
    pressure: worstPressure(holding),
    title: mailboxCapsTitle(holding, incomplete),
    incomplete,
    primary,
    primaryPct: primary ? fillCapPct(primary.count) : 0,
    primaryLabel: primary ? fillCapLabel(primary) : "clear",
    summaryLine: formatCapsSummaryLine(
      fullCount,
      warnCount,
      holding.length,
    ),
    fullCount,
    warnCount,
    okCount,
    holdingCount: holding.length,
    fills,
  };
}

export type ComposeCapNotice = {
  key: string;
  text: string;
  pressure: MailCapPressure;
  title: string;
};

/**
 * Compose hints for attachment caps. `queued` lists recipients about to receive
 * attaches (display casing preserved).
 */
export function buildComposeCapNotices(opts: {
  mails: MailRow[];
  selfNames: string[];
  queued: Array<{ to: string; count: number }>;
  hasMore?: boolean;
}): ComposeCapNotice[] {
  const notices: ComposeCapNotice[] = [];
  const incomplete = !!opts.hasMore;
  const fills = countAttachmentsByRecipient(opts.mails, opts.selfNames);
  const box = summarizeMailboxCaps({
    fills,
    incomplete,
    preferName: opts.queued.length === 1 ? opts.queued[0].to : null,
  });
  notices.push({
    key: "mailbox",
    text: "Per-char mailbox · " + box.line + " · max 20 from one account",
    pressure: box.pressure,
    title: box.title,
  });

  const self = nameSet(opts.selfNames);
  const queued = opts.queued.slice();
  queued.sort((a, b) =>
    String(a.to || "").localeCompare(String(b.to || ""), undefined, {
      sensitivity: "base",
    }),
  );
  for (let i = 0; i < queued.length; i++) {
    const display = String(queued[i].to || "").trim();
    const queuedN = queued[i].count | 0;
    if (!display || queuedN <= 0) continue;
    const key = display.toLowerCase();
    const have = countSenderAttachmentsTo(opts.mails, opts.selfNames, display);
    const pressure = senderCapPressure(have, queuedN);
    const frac = formatCapFraction(have, MAIL_ATTACH_SENDER_CAP, incomplete);
    const selfHit = self.has(key);
    notices.push({
      key: "to:" + key,
      text:
        (selfHit ? "Self-mail " : "To " + display + " ") +
        frac +
        " from you" +
        (queuedN > 1 ? " · +" + queuedN + " queued" : " · +1 queued"),
      pressure,
      title:
        "Per-account sender cap to this character (" +
        frac +
        "). New item mail is refused at 20 uncollected from your account." +
        (incomplete ? " Older cached pages may raise this count." : ""),
    });
  }
  return notices;
}
