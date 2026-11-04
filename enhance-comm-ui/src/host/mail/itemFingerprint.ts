import { getItemData } from "../../lib/itemInstanceData";
import type { ItemFingerprint, MailItem } from "./types";

function titleKey(p: string | null | undefined): string {
  return p != null && String(p).trim() !== "" ? String(p) : "";
}

function dataKey(data: unknown): string {
  return getItemData({ data }) ?? "";
}

function levelKey(level: number | string | null | undefined): number | null {
  if (level == null || level === "") return null;
  const n = Number(level);
  return Number.isFinite(n) ? n : null;
}

/**
 * Same item variant for “queue all matching” — name + title (`p`) + level + data.
 * Quantity is ignored (separate stacks still match).
 */
export function itemMatchesQueueIdentity(
  item: MailItem | null | undefined,
  expected: {
    name: string;
    level?: number | string | null;
    p?: string | null;
    data?: unknown;
  },
): boolean {
  if (!item || !item.name || item.name === "placeholder") return false;
  if (String(item.name) !== String(expected.name || "")) return false;
  if (titleKey(item.p) !== titleKey(expected.p)) return false;
  if (levelKey(item.level) !== levelKey(expected.level)) return false;
  if (dataKey(item.data) !== dataKey(expected.data)) return false;
  return true;
}

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
  if (expected.data != null) {
    if (dataKey(item.data) !== dataKey(expected.data)) return false;
  }
  return true;
}

/**
 * Every bag slot matching name + title + level + data of `template` (qty ignored).
 * Slot order is inventory order.
 */
export function listBagFingerprintsMatchingIdentity(
  items: Array<MailItem | null | undefined> | null | undefined,
  template: {
    name: string;
    level?: number | string | null;
    p?: string | null;
    data?: unknown;
  },
): ItemFingerprint[] {
  if (!items || !items.length) return [];
  const out: ItemFingerprint[] = [];
  for (let i = 0; i < items.length; i++) {
    if (!itemMatchesQueueIdentity(items[i], template)) continue;
    const fp = fingerprintFromSlot(i, items[i]);
    if (fp) out.push(fp);
  }
  return out;
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
  const data = getItemData(item);
  if (data) fp.data = data;
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
