/**
 * Gmail-style search options form ↔ operator query string.
 */

import type { MailPill } from "./types";
import { parseMailSearch, tokenizeMailQuery } from "./mailSearch";

export type MailSearchFormState = {
  from: string;
  to: string;
  subject: string;
  hasWords: string;
  doesntHave: string;
  item: string;
  hasAttachment: boolean;
  untakenOnly: boolean;
  /** Attachment already taken — for cleanup / batch delete. */
  takenOnly: boolean;
  newerThan: "" | "1d" | "7d" | "30d" | "1y";
  scope: MailPill;
};

export const EMPTY_MAIL_SEARCH_FORM: MailSearchFormState = {
  from: "",
  to: "",
  subject: "",
  hasWords: "",
  doesntHave: "",
  item: "",
  hasAttachment: false,
  untakenOnly: false,
  takenOnly: false,
  newerThan: "",
  scope: "all",
};

export const MAIL_SEARCH_SCOPES: { id: MailPill; label: string }[] = [
  { id: "all", label: "All mail" },
  { id: "unread", label: "Unread" },
  { id: "item", label: "Has item" },
  { id: "tome", label: "To me" },
  { id: "fromme", label: "From me" },
];

function quoteToken(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/[\s"]/.test(s)) return '"' + s.replace(/"/g, "") + '"';
  return s;
}

/** Build the operator query from the options form (scope stays on pill). */
export function mailSearchFormToQuery(form: MailSearchFormState): string {
  const parts: string[] = [];
  const from = quoteToken(form.from);
  if (from) parts.push("from:" + from);
  const to = quoteToken(form.to);
  if (to) parts.push("to:" + to);
  const subject = quoteToken(form.subject);
  if (subject) parts.push("subject:" + subject);
  const item = quoteToken(form.item);
  if (item) parts.push("item:" + item);
  if (form.hasAttachment) parts.push("has:attachment");
  if (form.untakenOnly) parts.push("has:untaken");
  if (form.takenOnly) parts.push("is:taken");
  if (form.newerThan) parts.push("newer_than:" + form.newerThan);

  const hasWords = String(form.hasWords || "").trim();
  if (hasWords) {
    const toks = tokenizeMailQuery(hasWords);
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (!t || t.charAt(0) === "-") continue;
      // Keep user phrases; re-quote if needed.
      if (
        /^(from|to|subject|item|has|is|after|before|newer_than|older_than):/i.test(
          t,
        )
      ) {
        parts.push(t);
      } else {
        parts.push(quoteToken(stripOuterQuotes(t)) || t);
      }
    }
  }

  const doesnt = String(form.doesntHave || "").trim();
  if (doesnt) {
    const toks = tokenizeMailQuery(doesnt);
    for (let i = 0; i < toks.length; i++) {
      let t = toks[i];
      if (!t) continue;
      if (t.charAt(0) === "-") t = t.slice(1);
      const body = quoteToken(stripOuterQuotes(t));
      if (body) parts.push("-" + body);
    }
  }

  return parts.join(" ");
}

function stripOuterQuotes(s: string): string {
  if (s.length >= 2) {
    const a = s.charAt(0);
    const b = s.charAt(s.length - 1);
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return s.slice(1, -1);
    }
  }
  return s;
}

function formatDateToken(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return y + "/" + m + "/" + day;
}

/**
 * Parse the free-text query (+ current pill) into the options form.
 * Best-effort — unknown tokens land in “Has the words”.
 */
export function queryToMailSearchForm(
  query: string,
  scope: MailPill = "all",
  now: number = Date.now(),
): MailSearchFormState {
  const form: MailSearchFormState = {
    ...EMPTY_MAIL_SEARCH_FORM,
    scope,
  };
  const parsed = parseMailSearch(query, now);
  const hasWords: string[] = [];
  const doesntHave: string[] = [];

  for (let i = 0; i < parsed.clauses.length; i++) {
    const c = parsed.clauses[i];
    if (c.kind === "from" && !c.negate && !form.from) form.from = c.value;
    else if (c.kind === "to" && !c.negate && !form.to) form.to = c.value;
    else if (c.kind === "subject" && !c.negate && !form.subject)
      form.subject = c.value;
    else if (c.kind === "item" && !c.negate && !form.item) form.item = c.value;
    else if (c.kind === "has" && c.value === "attachment" && !c.negate)
      form.hasAttachment = true;
    else if (c.kind === "has" && c.value === "untaken" && !c.negate) {
      form.untakenOnly = true;
      form.takenOnly = false;
    } else if (c.kind === "is" && c.value === "taken" && !c.negate) {
      form.takenOnly = true;
      form.untakenOnly = false;
    } else if (c.kind === "is" && c.value === "untaken" && !c.negate) {
      form.untakenOnly = true;
      form.takenOnly = false;
    } else if (c.kind === "is" && c.value === "unread" && !c.negate) {
      if (form.scope === "all") form.scope = "unread";
    } else if (c.kind === "after" && !c.negate) {
      // Map after: to a coarse newer_than preset when close.
      const age = now - c.ms;
      const day = 86400000;
      if (age <= 1.5 * day) form.newerThan = "1d";
      else if (age <= 10 * day) form.newerThan = "7d";
      else if (age <= 45 * day) form.newerThan = "30d";
      else if (age <= 400 * day) form.newerThan = "1y";
      else hasWords.push("after:" + formatDateToken(c.ms));
    } else if (c.kind === "text") {
      const q = quoteToken(c.value);
      if (!q) continue;
      if (c.negate) doesntHave.push(stripOuterQuotes(q));
      else hasWords.push(q);
    } else {
      // Preserve less-common operators in free text.
      if (c.kind === "before") {
        hasWords.push(
          (c.negate ? "-" : "") + "before:" + formatDateToken(c.ms),
        );
      } else if (c.kind === "is") {
        if (c.value === "taken" || c.value === "untaken") {
          /* already mapped above */
        } else {
          hasWords.push((c.negate ? "-" : "") + "is:" + c.value);
        }
      } else if (c.kind === "has") {
        if (c.value === "untaken" && !c.negate) {
          /* already mapped */
        } else {
          hasWords.push((c.negate ? "-" : "") + "has:" + c.value);
        }
      }
    }
  }

  form.hasWords = hasWords.join(" ");
  form.doesntHave = doesntHave.join(" ");
  return form;
}
