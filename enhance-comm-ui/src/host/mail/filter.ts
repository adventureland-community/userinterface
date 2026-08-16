import type { MailPill, MailRow } from "./types";
import { mailMatchesSearch, parseMailSearch } from "./mailSearch";
import { sortMailsNewestFirst } from "./mailSort";

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

export { mailSentMs, sortMailsNewestFirst } from "./mailSort";

export {
  MAIL_SEARCH_HINT,
  parseMailSearch,
  mailMatchesSearch,
} from "./mailSearch";
export type { ParsedMailSearch, MailSearchClause } from "./mailSearch";
export {
  EMPTY_MAIL_SEARCH_FORM,
  MAIL_SEARCH_SCOPES,
  mailSearchFormToQuery,
  queryToMailSearchForm,
} from "./mailSearchForm";
export type { MailSearchFormState } from "./mailSearchForm";
