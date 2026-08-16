/**
 * Stock Comm unread counter on window.X.
 * Server recounts unread with `.limit(100)` (send_mail / read_mail / SAC),
 * so the published count never exceeds 100 even if the inbox has more.
 */
export const SERVER_UNREAD_CAP = 100;

export function getXUnread(): number {
  const x = window.X as { unread?: number } | undefined;
  return Math.max(0, Number(x && x.unread) || 0);
}

/** Badge / chrome label; `100+` when at the server cap. */
export function formatUnreadBadgeLabel(n: number): string {
  const c = Math.max(0, Math.floor(Number(n) || 0));
  if (c >= SERVER_UNREAD_CAP) return SERVER_UNREAD_CAP + "+";
  return String(c);
}
