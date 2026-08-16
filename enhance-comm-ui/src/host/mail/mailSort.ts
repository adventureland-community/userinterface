import type { MailRow } from "./types";

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
