/**
 * Diff two bank snapshots — explorer-style added / removed / qty·stack changes.
 * Presentation helpers match al-data-explorer BankRefreshSummaryView.
 */

import { formatCompactNumber } from "../format";
import { itemInstanceLabel } from "../gameIcon";
import {
  aggregateBankItems,
  flattenBankSlots,
  isOfficialBankPack,
  SLOTS_PER_BANK_PACK,
} from "./bankBrowse";
import type { BankAggItem, BankSnapshot } from "./bankTypes";

export type BankItemChangeKind = "added" | "removed" | "changed";

export type BankItemChange = {
  kind: BankItemChangeKind;
  item: BankAggItem;
  previousQ?: number;
  previousStacks?: number;
  deltaQ?: number;
  deltaStacks?: number;
};

export type BankRefreshSummary = {
  changes: BankItemChange[];
  goldDelta?: number;
  usedSlotsDelta?: number;
  hasChanges: boolean;
};

export type BankChangeFilter = "all" | "gear" | "quantity";

function stackWord(n: number): string {
  return n === 1 ? "stack" : "stacks";
}

export function countBankUsedSlots(packs: BankSnapshot["packs"]): {
  usedOfficial: number;
  totalOfficial: number;
  usedAll: number;
} {
  let usedOfficial = 0;
  let totalOfficial = 0;
  let usedAll = 0;
  const keys = Object.keys(packs || {});
  for (let i = 0; i < keys.length; i++) {
    const pack = keys[i];
    const slots = packs[pack];
    if (!Array.isArray(slots)) continue;
    const official = isOfficialBankPack(pack);
    if (official) totalOfficial += SLOTS_PER_BANK_PACK;
    for (let j = 0; j < slots.length; j++) {
      const it = slots[j];
      if (!it || !it.name || it.name === "placeholder") continue;
      usedAll += 1;
      if (official) usedOfficial += 1;
    }
  }
  return { usedOfficial, totalOfficial, usedAll };
}

export function compareBankSnapshots(
  prev: BankSnapshot | null | undefined,
  next: BankSnapshot | null | undefined,
): BankRefreshSummary {
  if (!prev || !next) {
    return { changes: [], hasChanges: false };
  }
  const prevAgg = aggregateBankItems(flattenBankSlots(prev.packs));
  const nextAgg = aggregateBankItems(flattenBankSlots(next.packs));
  const prevByKey: Record<string, BankAggItem> = Object.create(null);
  const nextByKey: Record<string, BankAggItem> = Object.create(null);
  for (let i = 0; i < prevAgg.length; i++) prevByKey[prevAgg[i].key] = prevAgg[i];
  for (let i = 0; i < nextAgg.length; i++) nextByKey[nextAgg[i].key] = nextAgg[i];

  const changes: BankItemChange[] = [];
  const nextKeys = Object.keys(nextByKey);
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    const nextItem = nextByKey[key];
    const prevItem = prevByKey[key];
    if (!prevItem) {
      changes.push({ kind: "added", item: nextItem });
      continue;
    }
    const deltaQ = nextItem.q - prevItem.q;
    const deltaStacks = nextItem.locs.length - prevItem.locs.length;
    if (deltaQ !== 0 || deltaStacks !== 0) {
      changes.push({
        kind: "changed",
        item: nextItem,
        previousQ: prevItem.q,
        previousStacks: prevItem.locs.length,
        deltaQ,
        deltaStacks,
      });
    }
  }
  const prevKeys = Object.keys(prevByKey);
  for (let i = 0; i < prevKeys.length; i++) {
    const key = prevKeys[i];
    if (!nextByKey[key]) {
      changes.push({ kind: "removed", item: prevByKey[key] });
    }
  }

  changes.sort((a, b) => {
    const n = a.item.name.localeCompare(b.item.name);
    if (n !== 0) return n;
    const la = a.item.level != null ? a.item.level : -1;
    const lb = b.item.level != null ? b.item.level : -1;
    if (la !== lb) return la - lb;
    return String(a.item.p || "").localeCompare(String(b.item.p || ""));
  });

  const goldDelta = next.gold - prev.gold;
  const prevSlots = countBankUsedSlots(prev.packs);
  const nextSlots = countBankUsedSlots(next.packs);
  const usedSlotsDelta = nextSlots.usedAll - prevSlots.usedAll;

  return {
    changes,
    goldDelta,
    usedSlotsDelta,
    hasChanges:
      changes.length > 0 || goldDelta !== 0 || usedSlotsDelta !== 0,
  };
}

/** Explorer All / Gear / Quantity filter for change tiles. */
export function filterBankChanges(
  changes: BankItemChange[],
  mode: BankChangeFilter,
  G?: { items?: Record<string, { upgrade?: boolean; compound?: boolean }> },
): BankItemChange[] {
  if (mode === "all") return changes;
  const out: BankItemChange[] = [];
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    if (mode === "gear") {
      const gItem = G && G.items ? G.items[change.item.name] : undefined;
      const level = change.item.level != null ? change.item.level : 0;
      if (
        (gItem && (gItem.upgrade || gItem.compound)) ||
        level > 0
      ) {
        out.push(change);
      }
      continue;
    }
    if (change.kind === "changed" && (change.deltaQ || 0) !== 0) {
      out.push(change);
    }
  }
  return out;
}

export function changeBadgeQuantity(change: BankItemChange): number {
  if (change.kind === "added" || change.kind === "removed") {
    return change.item.q;
  }
  if (change.deltaQ != null && change.deltaQ !== 0) {
    return Math.abs(change.deltaQ);
  }
  if (change.deltaStacks != null && change.deltaStacks !== 0) {
    return Math.abs(change.deltaStacks);
  }
  return change.item.q;
}

export function changeCaption(change: BankItemChange): string {
  if (change.kind === "added") return "Added";
  if (change.kind === "removed") return "Removed";
  if (change.deltaQ != null && change.deltaQ !== 0) {
    return (
      (change.deltaQ > 0 ? "+" : "") +
      formatCompactNumber(change.deltaQ) +
      " qty"
    );
  }
  if (change.deltaStacks != null && change.deltaStacks !== 0) {
    const n = change.deltaStacks;
    return (
      (n > 0 ? "+" : "") +
      String(n) +
      " " +
      stackWord(Math.abs(n))
    );
  }
  return "Changed";
}

/** Qty badge color — explorer green / red. */
export function changeQuantityColor(
  kind: BankItemChangeKind,
  deltaQ?: number,
): string | undefined {
  if (kind === "added") return "#81c784";
  if (kind === "removed") return "#ff5252";
  if (deltaQ == null || deltaQ === 0) return undefined;
  return deltaQ > 0 ? "#81c784" : "#ff5252";
}

/** Border / caption tone class suffix. */
export function changeToneClass(
  kind: BankItemChangeKind,
  deltaQ?: number,
): string {
  if (kind === "added") return "is-added";
  if (kind === "removed") return "is-removed";
  if ((deltaQ || 0) < 0) return "is-changed-down";
  return "is-changed-up";
}

export function formatRefreshSummaryLine(
  summary: BankRefreshSummary,
  visibleCount: number,
  title = "Refresh complete",
): string {
  let line =
    title +
    " — " +
    String(visibleCount) +
    " item change" +
    (visibleCount === 1 ? "" : "s");
  if (summary.goldDelta) {
    line +=
      ", gold " +
      (summary.goldDelta > 0 ? "+" : "") +
      formatCompactNumber(summary.goldDelta);
  }
  if (summary.usedSlotsDelta) {
    line +=
      ", slots " +
      (summary.usedSlotsDelta > 0 ? "+" : "") +
      String(summary.usedSlotsDelta);
  }
  return line;
}

export function formatBankItemChange(change: BankItemChange): string {
  const label = itemInstanceLabel(change.item.name, {
    level: change.item.level,
    p: change.item.p != null ? String(change.item.p) : undefined,
  });
  const stacks = change.item.locs.length;
  if (change.kind === "added") {
    return (
      "Added " +
      label +
      " (" +
      change.item.q.toLocaleString() +
      " qty, " +
      stacks +
      " " +
      stackWord(stacks) +
      ")"
    );
  }
  if (change.kind === "removed") {
    return (
      "Removed " +
      label +
      " (" +
      change.item.q.toLocaleString() +
      " qty, " +
      stacks +
      " " +
      stackWord(stacks) +
      ")"
    );
  }
  const parts: string[] = [];
  if (change.deltaQ) {
    parts.push(
      (change.deltaQ > 0 ? "+" : "") + change.deltaQ + " qty",
    );
  }
  if (change.deltaStacks) {
    const n = change.deltaStacks;
    parts.push(
      (n > 0 ? "+" : "") + String(n) + " " + stackWord(Math.abs(n)),
    );
  }
  return label + ": " + parts.join(", ");
}

/** Hover tip for a change tile (ItemInstance title). */
export function formatBankChangeTip(change: BankItemChange): string {
  const label = itemInstanceLabel(change.item.name, {
    level: change.item.level,
    p: change.item.p != null ? String(change.item.p) : undefined,
  });
  const stacks = change.item.locs.length;
  if (change.kind === "added") {
    return (
      label +
      "\nAdded · " +
      change.item.q.toLocaleString() +
      " qty · " +
      stacks +
      " " +
      stackWord(stacks)
    );
  }
  if (change.kind === "removed") {
    return (
      label +
      "\nRemoved · " +
      change.item.q.toLocaleString() +
      " qty · " +
      stacks +
      " " +
      stackWord(stacks)
    );
  }
  const bits: string[] = [label, "Updated"];
  if (change.deltaQ) {
    bits.push(
      (change.deltaQ > 0 ? "+" : "") +
        change.deltaQ.toLocaleString() +
        " qty (" +
        change.item.q.toLocaleString() +
        " now)",
    );
  }
  if (change.deltaStacks) {
    const n = change.deltaStacks;
    bits.push(
      (n > 0 ? "+" : "") +
        String(n) +
        " " +
        stackWord(Math.abs(n)) +
        " (" +
        stacks +
        " now)",
    );
  }
  return bits.join("\n");
}
