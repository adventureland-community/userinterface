/**
 * Mail STATUS card copy — live cache size so warm progress matches INBOX.
 */

/**
 * Prefixed STATUS title: always show current `mailCount`, keep strategy/reason
 * from the last head (or pass-through delete/refresh strings).
 */
export function formatLiveMailLoadedStatus(
  status: string,
  mailCount: number,
  hasMore: boolean,
): string {
  if (!status) return "";
  // Progress / refresh owned strings — do not rewrite.
  if (
    status.indexOf("Cache refreshed") === 0 ||
    status.indexOf("Deleting") === 0 ||
    status.indexOf("Refresh") === 0
  ) {
    return status;
  }
  const countBit = String(mailCount) + (hasMore ? "+" : "");
  if (status.indexOf("Loaded ") === 0) {
    const rest = status.replace(/^Loaded \d+\+?/, "").replace(/^ · /, "");
    return "Loaded " + countBit + (rest ? " · " + rest : "");
  }
  // "Loaded · N+" from older cursor pulls
  if (status.indexOf("Loaded · ") === 0) {
    return "Loaded " + countBit;
  }
  return "Loaded " + countBit + " · " + status;
}
