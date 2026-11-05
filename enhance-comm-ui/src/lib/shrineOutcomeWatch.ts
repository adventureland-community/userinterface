/**
 * Upgrade / compound bag outcome while observing.
 *
 * Placeholder in a watched slot = roll still running (not failure).
 * Higher level at name / watched slot = success.
 * Watched slots empty (no placeholder) after debounce = failure.
 */

export type BagItemLike = {
  name?: string;
  level?: number;
} | null | undefined;

export function isBagPlaceholder(it: BagItemLike): boolean {
  return !!(it && it.name === "placeholder");
}

export function countNameLevel(
  items: Array<BagItemLike> | null | undefined,
  name: string,
  level: number,
): number {
  if (!items) return 0;
  let n = 0;
  const want = Number(level) || 0;
  const wantName = String(name || "");
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || it.name !== wantName) continue;
    const lv = it.level != null ? Number(it.level) : 0;
    if (lv === want) n += 1;
  }
  return n;
}

export type ShrineWatchVerdict =
  | "success"
  | "failure"
  | "progress"
  | "pending";

export type ShrineWatchEval = {
  items: Array<BagItemLike> | null | undefined;
  name: string;
  fromLevel: number;
  beforeNext: number;
  watchedSlots: number[];
  elapsedMs: number;
  /** Default 2500 — ignore empty-slot flicker before declaring failure. */
  failureDebounceMs?: number;
};

/**
 * Pure poll verdict for shrine outcome.
 * Prefer watchedSlots (item / compound trio); placeholders mean still rolling.
 */
export function evaluateShrineBagWatch(opts: ShrineWatchEval): ShrineWatchVerdict {
  const items = opts.items;
  const name = String(opts.name || "");
  const fromLevel = Number(opts.fromLevel) || 0;
  const nextLevel = fromLevel + 1;
  const atNext = countNameLevel(items, name, nextLevel);
  if (atNext > opts.beforeNext) return "success";

  const slots = opts.watchedSlots || [];
  let hasPlaceholder = false;
  let allMissing = slots.length > 0;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i] | 0;
    const it = items && items[slot];
    if (isBagPlaceholder(it)) {
      hasPlaceholder = true;
      allMissing = false;
      continue;
    }
    if (it && it.name) {
      allMissing = false;
      const lv = it.level != null ? Number(it.level) : 0;
      if (it.name === name && lv === nextLevel) return "success";
    }
  }

  if (hasPlaceholder) return "progress";

  const debounce =
    opts.failureDebounceMs != null && opts.failureDebounceMs > 0
      ? opts.failureDebounceMs
      : 2500;
  if (allMissing && atNext <= opts.beforeNext && opts.elapsedMs > debounce) {
    return "failure";
  }
  return "pending";
}
