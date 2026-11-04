/**
 * Ordered peer “pages” — same chrome, different dataset/mode.
 * Swipe language: dir &lt; 0 previous, &gt; 0 next; clamp at ends.
 */

/** Index of active key, or -1 when not in the set. */
export function peerPageIndex(
  keys: ReadonlyArray<string>,
  activeKey: string | null | undefined,
): number {
  if (!activeKey) return -1;
  return keys.indexOf(activeKey);
}

/**
 * Next peer key for swipe dir. When active is missing, jump to
 * `fallbackKey` if present, else the first key. Clamp at ends.
 */
export function stepPeerPage(
  keys: ReadonlyArray<string>,
  activeKey: string | null | undefined,
  dir: number,
  fallbackKey?: string | null,
): string | null {
  if (!keys.length) return null;
  let idx = peerPageIndex(keys, activeKey);
  if (idx < 0) {
    if (fallbackKey) {
      const fb = keys.indexOf(fallbackKey);
      if (fb >= 0) return keys[fb];
    }
    return keys[0];
  }
  if (dir < 0) return idx > 0 ? keys[idx - 1] : keys[idx];
  if (dir > 0) return idx < keys.length - 1 ? keys[idx + 1] : keys[idx];
  return keys[idx];
}
