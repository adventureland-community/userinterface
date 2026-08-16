/**
 * Gmail-inspired mail search operators for Comm inbox.
 * See: https://support.google.com/mail/answer/7190
 *
 * Supported (AND across clauses; free text matches fro/to/subject/body/item):
 *   from:name  to:name  subject:text  item:name
 *   has:attachment|item|untaken   -has:attachment
 *   is:unread|read|taken|untaken
 *   after:YYYY/MM/DD  before:YYYY/MM/DD
 *   newer_than:2d|3m|1y   older_than:7d
 *   "exact phrase"   -word
 */

import type { MailRow } from "./types";

export type MailSearchClause =
  | { kind: "from"; value: string; negate: boolean }
  | { kind: "to"; value: string; negate: boolean }
  | { kind: "subject"; value: string; negate: boolean }
  | { kind: "item"; value: string; negate: boolean }
  | { kind: "text"; value: string; negate: boolean }
  | { kind: "has"; value: "attachment" | "untaken"; negate: boolean }
  | {
      kind: "is";
      value: "unread" | "read" | "taken" | "untaken";
      negate: boolean;
    }
  | { kind: "after"; ms: number; negate: boolean }
  | { kind: "before"; ms: number; negate: boolean };

export type ParsedMailSearch = {
  clauses: MailSearchClause[];
  /** True when the query used at least one operator / quote / exclusion. */
  structured: boolean;
};

const OP_RE =
  /^(from|to|subject|item|has|is|after|before|newer_than|older_than):(.*)$/i;

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const a = s.charAt(0);
    const b = s.charAt(s.length - 1);
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return s.slice(1, -1);
    }
  }
  return s;
}

/** Split on spaces while keeping "quoted phrases" intact. */
export function tokenizeMailQuery(raw: string): string[] {
  const s = String(raw || "").trim();
  if (!s) return [];
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (quote) {
      if (ch === quote) {
        quote = null;
        cur += ch;
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function parseDateMs(raw: string): number | null {
  const cleaned = String(raw || "")
    .trim()
    .replace(/-/g, "/");
  if (!cleaned) return null;
  // YYYY/MM/DD or YYYY/M/D
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(cleaned);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const t = Date.UTC(y, mo, d);
    return Number.isFinite(t) ? t : null;
  }
  const t = Date.parse(cleaned);
  return Number.isFinite(t) ? t : null;
}

function parseRelativeMs(
  raw: string,
  now: number,
  mode: "newer" | "older",
): number | null {
  const m = /^(\d+)\s*([dmy])$/i.exec(String(raw || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 0) return null;
  const unit = m[2].toLowerCase();
  const day = 86400000;
  let delta = n * day;
  if (unit === "m") delta = n * 30 * day;
  if (unit === "y") delta = n * 365 * day;
  if (mode === "newer") return now - delta;
  return now - delta;
}

function sentMs(m: MailRow): number | null {
  const t = Date.parse(String(m.sent || ""));
  return Number.isFinite(t) ? t : null;
}

function includesLoose(hay: string, needle: string): boolean {
  if (!needle) return true;
  return hay.toLowerCase().indexOf(needle.toLowerCase()) >= 0;
}

export function parseMailSearch(
  raw: string,
  now: number = Date.now(),
): ParsedMailSearch {
  const tokens = tokenizeMailQuery(raw);
  const clauses: MailSearchClause[] = [];
  let structured = false;

  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i];
    let negate = false;
    if (tok.charAt(0) === "-" && tok.length > 1) {
      negate = true;
      tok = tok.slice(1);
      structured = true;
    }
    const op = OP_RE.exec(tok);
    if (op) {
      structured = true;
      const key = op[1].toLowerCase();
      const val = stripQuotes(op[2]).trim();
      if (key === "from") {
        clauses.push({ kind: "from", value: val.toLowerCase(), negate });
      } else if (key === "to") {
        clauses.push({ kind: "to", value: val.toLowerCase(), negate });
      } else if (key === "subject") {
        clauses.push({ kind: "subject", value: val.toLowerCase(), negate });
      } else if (key === "item") {
        clauses.push({ kind: "item", value: val.toLowerCase(), negate });
      } else if (key === "has") {
        const hv = val.toLowerCase();
        if (hv === "attachment" || hv === "item" || hv === "attach") {
          clauses.push({ kind: "has", value: "attachment", negate });
        } else if (hv === "untaken") {
          clauses.push({ kind: "has", value: "untaken", negate });
        }
      } else if (key === "is") {
        const iv = val.toLowerCase();
        if (
          iv === "unread" ||
          iv === "read" ||
          iv === "taken" ||
          iv === "untaken"
        ) {
          clauses.push({ kind: "is", value: iv, negate });
        }
      } else if (key === "after") {
        const ms = parseDateMs(val);
        if (ms != null) clauses.push({ kind: "after", ms, negate });
      } else if (key === "before") {
        const ms = parseDateMs(val);
        if (ms != null) clauses.push({ kind: "before", ms, negate });
      } else if (key === "newer_than") {
        const ms = parseRelativeMs(val, now, "newer");
        if (ms != null) clauses.push({ kind: "after", ms, negate });
      } else if (key === "older_than") {
        const ms = parseRelativeMs(val, now, "older");
        // older_than:7d → sent before (now - 7d)
        if (ms != null) clauses.push({ kind: "before", ms, negate });
      }
      continue;
    }

    const phrase = stripQuotes(tok).trim().toLowerCase();
    if (!phrase) continue;
    if (tok.charAt(0) === '"' || tok.charAt(0) === "'") structured = true;
    clauses.push({ kind: "text", value: phrase, negate });
  }

  return { clauses, structured };
}

function matchClause(m: MailRow, c: MailSearchClause): boolean {
  switch (c.kind) {
    case "from": {
      const ok = includesLoose(String(m.fro || ""), c.value);
      return c.negate ? !ok : ok;
    }
    case "to": {
      const ok = includesLoose(String(m.to || ""), c.value);
      return c.negate ? !ok : ok;
    }
    case "subject": {
      const ok = includesLoose(String(m.subject || ""), c.value);
      return c.negate ? !ok : ok;
    }
    case "item": {
      const name = m.item && m.item.name ? String(m.item.name) : "";
      const ok = !!name && includesLoose(name, c.value);
      return c.negate ? !ok : ok;
    }
    case "text": {
      const itemName = m.item && m.item.name ? String(m.item.name) : "";
      const hay = [m.fro, m.to, m.subject, m.message, itemName]
        .join(" ")
        .toLowerCase();
      const ok = includesLoose(hay, c.value);
      return c.negate ? !ok : ok;
    }
    case "has": {
      let ok = false;
      if (c.value === "attachment") ok = !!m.item;
      else ok = !!(m.item && !m.taken);
      return c.negate ? !ok : ok;
    }
    case "is": {
      let ok = false;
      if (c.value === "unread") ok = m.read === false;
      else if (c.value === "read") ok = m.read !== false;
      else if (c.value === "taken") ok = !!(m.item && m.taken);
      else ok = !!(m.item && !m.taken);
      return c.negate ? !ok : ok;
    }
    case "after": {
      const t = sentMs(m);
      const ok = t != null && t >= c.ms;
      return c.negate ? !ok : ok;
    }
    case "before": {
      const t = sentMs(m);
      const ok = t != null && t < c.ms;
      return c.negate ? !ok : ok;
    }
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      return true;
    }
  }
}

/** True when mail matches the parsed query (empty query → true). */
export function mailMatchesSearch(
  m: MailRow,
  parsed: ParsedMailSearch,
): boolean {
  if (!parsed.clauses.length) return true;
  for (let i = 0; i < parsed.clauses.length; i++) {
    if (!matchClause(m, parsed.clauses[i])) return false;
  }
  return true;
}

export const MAIL_SEARCH_HINT =
  'from: to: subject: item: has:attachment is:unread is:taken after: newer_than:2d "phrase" -word';
