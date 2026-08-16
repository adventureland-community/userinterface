import type { MailPill, MailRow } from "./types";
import { mailMatchesSearch, parseMailSearch } from "./mailSearch";

export type FilterMailsOpts = {
  pill: MailPill;
  query: string;
  /** Own character names (case-insensitive match for to-me / from-me). */
  selfNames: string[];
  /** Override "now" for newer_than / older_than tests. */
  now?: number;
};

function selfSet(names: string[]): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    if (n) s.add(String(n).toLowerCase());
  }
  return s;
}

/** Sent time for sort — ISO dates, else numeric epoch/sentinel strings. */
export function mailSentMs(m: MailRow): number {
  const raw = String(m.sent || "");
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return parsed;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  return 0;
}

/** Newest first (flat and stacked both consume this order). */
export function sortMailsNewestFirst(mails: MailRow[]): MailRow[] {
  const out = mails.slice();
  out.sort((a, b) => {
    const d = mailSentMs(b) - mailSentMs(a);
    if (d !== 0) return d;
    // Stable tie-break so identical timestamps don’t shuffle.
    return String(b.id).localeCompare(String(a.id));
  });
  return out;
}

export function filterMails(
  mails: MailRow[],
  opts: FilterMailsOpts,
): MailRow[] {
  const self = selfSet(opts.selfNames);
  const pill = opts.pill;
  const parsed = parseMailSearch(opts.query, opts.now);
  const out: MailRow[] = [];
  for (let i = 0; i < mails.length; i++) {
    const m = mails[i];
    if (pill === "unread" && m.read !== false) continue;
    if (pill === "item" && !(m.item && !m.taken)) continue;
    if (pill === "tome" && !self.has(String(m.to || "").toLowerCase()))
      continue;
    if (pill === "fromme" && !self.has(String(m.fro || "").toLowerCase())) {
      continue;
    }
    if (!mailMatchesSearch(m, parsed)) continue;
    out.push(m);
  }
  return sortMailsNewestFirst(out);
}

export {
  MAIL_SEARCH_HINT,
  parseMailSearch,
  mailMatchesSearch,
} from "./mailSearch";
export type { ParsedMailSearch, MailSearchClause } from "./mailSearch";
