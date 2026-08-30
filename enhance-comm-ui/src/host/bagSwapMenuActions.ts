import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import { invSwapCommand } from "./gearCommands";
import { canEditObservedBag } from "./gearObserved";
import type { MailItem } from "./mail/types";

function formatSwapTargetLabel(slot: number, item: MailItem): string {
  let label = `[${slot}] ${item.name}`;
  if (item.level != null) label += ` +${item.level}`;
  if (item.q != null && item.q > 1) label += ` ×${item.q}`;
  return label;
}

function promptSwapSlot(fromSlot: number, maxSlot: number): number | null {
  const raw = window.prompt(
    `Swap slot ${fromSlot} with slot (0–${maxSlot - 1}):`,
    "",
  );
  if (raw == null || String(raw).trim() === "") return null;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n >= maxSlot) {
    window.alert(`Enter a slot number from 0 to ${maxSlot - 1}.`);
    return null;
  }
  if (n === fromSlot) return null;
  return n;
}

function buildSwapSubmenu(fromSlot: number, obsItems: MailItem[]): BagMenuAction {
  const children: BagMenuAction[] = [];

  for (let i = 0; i < obsItems.length; i++) {
    if (i === fromSlot) continue;
    const other = obsItems[i];
    if (!other || !other.name || other.name === "placeholder") continue;
    children.push({
      id: `swap-${i}`,
      label: formatSwapTargetLabel(i, other),
      title: `Swap slot ${fromSlot} ↔ ${i}`,
      run: () => {
        invSwapCommand(fromSlot, i);
      },
    });
  }

  children.push({
    id: "swap-prompt",
    label: "Other slot…",
    title: "Swap with any inventory slot by number (including empty)",
    separatorBefore: children.length > 0,
    run: () => {
      const target = promptSwapSlot(fromSlot, obsItems.length);
      if (target == null) return;
      invSwapCommand(fromSlot, target);
    },
  });

  return {
    id: "swap-submenu",
    label: "Swap with…",
    title: "Reorder inventory — or drag the item to another slot",
    separatorBefore: true,
    children,
  };
}

function buildBagSwapMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  if (!canEditObservedBag()) return [];

  const snap = window.observing;
  const obsItems =
    snap && Array.isArray(snap.items)
      ? (snap.items as MailItem[])
      : null;
  if (!obsItems || obsItems.length < 2) return [];

  const fromSlot = Number(ctx.fp.slot) | 0;
  return [buildSwapSubmenu(fromSlot, obsItems)];
}

registerBagMenuProvider(buildBagSwapMenuActions);
