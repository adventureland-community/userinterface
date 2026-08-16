import type { ItemFingerprint, MailItem } from "./types";

/** True when live item still matches the Comm snapshot fingerprint. */
export function itemMatchesFingerprint(
  item: MailItem | null | undefined,
  expected: ItemFingerprint,
): boolean {
  if (!item || !item.name) return false;
  if (item.name !== expected.name) return false;
  if (expected.level != null) {
    if (item.level !== expected.level) return false;
  }
  if (expected.q != null) {
    if (item.q !== expected.q) return false;
  }
  if (expected.p != null) {
    if (item.p !== expected.p) return false;
  }
  return true;
}

export function fingerprintFromSlot(
  slot: number,
  item: MailItem | null | undefined,
): ItemFingerprint | null {
  if (!item || !item.name || item.name === "placeholder") return null;
  const fp: ItemFingerprint = { slot, name: String(item.name) };
  if (item.level != null) fp.level = Number(item.level);
  if (item.q != null) fp.q = Number(item.q);
  if (item.p != null) fp.p = String(item.p);
  return fp;
}

/**
 * Find a bag slot matching `expected` (name/level/q/p). Prefers `expected.slot`
 * when it still matches. `usedSlots` skips slots already claimed in a batch.
 * Returns -1 when not found.
 */
export function findFingerprintSlot(
  items: Array<MailItem | null | undefined> | null | undefined,
  expected: ItemFingerprint,
  usedSlots?: Set<number> | null,
): number {
  if (!items || !items.length) return -1;
  const prefer = Number(expected.slot) | 0;
  if (
    prefer >= 0 &&
    prefer < items.length &&
    !(usedSlots && usedSlots.has(prefer)) &&
    itemMatchesFingerprint(items[prefer], expected)
  ) {
    return prefer;
  }
  for (let i = 0; i < items.length; i++) {
    if (usedSlots && usedSlots.has(i)) continue;
    if (itemMatchesFingerprint(items[i], expected)) return i;
  }
  return -1;
}
