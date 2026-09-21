/**
 * When a search is active but older pages are still on the server, keep
 * prefetching — mail search is client-side only over the loaded cache.
 */

export function mailSearchWantsBurst(opts: {
  query: string;
  hasMore: boolean;
}): boolean {
  return String(opts.query || "").trim().length > 0 && !!opts.hasMore;
}

/** Empty-list copy while a search cannot yet see unloaded older mail. */
export function mailSearchEmptyHint(opts: {
  query: string;
  hasMore: boolean;
  matchCount: number;
  loadedCount: number;
}): string | null {
  const q = String(opts.query || "").trim();
  if (!q) return null;
  if (opts.matchCount > 0) return null;
  if (opts.hasMore) {
    return (
      "No matches in " +
      opts.loadedCount +
      " loaded — fetching older mail…"
    );
  }
  return "No matches";
}
