/**
 * Bag drag-and-drop on /comm — stock on_drop reads window.character (null while
 * observing). Bridge to invSwapCommand / swap() on the watched character.
 */

import { invSwapCommand } from "../../host/gearCommands";
import { canEditObservedBag } from "../../host/gearObserved";
import {
  readBagDragPayload,
  writeBagDragPayload,
} from "./bagDragPayload";
import { readTradeDragPayload, hasTradeDragPayload } from "./tradeDragPayload";
import { handleBagDropOnTradeSlotDelist } from "../trade/tradeSlotDragDrop";
import { observingBagItem, resolveInventorySlotNum } from "./bagItemContextMenu";

function resolveDragSourceSlot(
  transferId: string,
  host: HTMLElement,
): number | null {
  if (!transferId) return null;
  const ecuMatch = /^inv:(\d+)$/.exec(transferId);
  if (ecuMatch) return parseInt(ecuMatch[1], 10);
  const el = document.getElementById(transferId);
  if (!el || !host.contains(el)) return null;
  return resolveInventorySlotNum(el, host);
}

function readDragSourceSlot(ev: DragEvent, host: HTMLElement): number | null {
  const fromPayload = readBagDragPayload(ev);
  if (fromPayload != null) return fromPayload;
  const dt = ev.dataTransfer;
  if (!dt) return null;
  return resolveDragSourceSlot(dt.getData("text") || "", host);
}

/**
 * Capture-phase drag bridge on #bottomleftcorner (installed from BagPanel).
 * Stock item_container already sets draggable + ondrop; we intercept before
 * the broken stock handler when editing the observed bag is allowed.
 */
export function installBagDragDrop(host: HTMLElement): () => void {
  const onDragStart = (ev: DragEvent) => {
    if (!canEditObservedBag()) return;
    const target = ev.target as HTMLElement | null;
    if (!target || !host.contains(target)) return;
    const fromSlot = resolveInventorySlotNum(target, host);
    if (fromSlot == null || !Number.isFinite(fromSlot)) {
      ev.preventDefault();
      return;
    }
    if (!observingBagItem(fromSlot)) {
      ev.preventDefault();
      return;
    }
    const dt = ev.dataTransfer;
    if (!dt) return;
    writeBagDragPayload(dt, fromSlot);
  };

  const onDragOver = (ev: DragEvent) => {
    if (!canEditObservedBag()) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
  };

  const onDrop = (ev: DragEvent) => {
    if (!canEditObservedBag()) return;
    const target = ev.target as HTMLElement | null;
    if (!target || !host.contains(target)) return;

    const toSlot = resolveInventorySlotNum(target, host);
    if (toSlot == null || !Number.isFinite(toSlot)) return;

    const fromSlot = readDragSourceSlot(ev, host);
    if (fromSlot == null || !Number.isFinite(fromSlot) || fromSlot === toSlot) {
      return;
    }

    if (!observingBagItem(fromSlot)) return;

    ev.preventDefault();
    ev.stopPropagation();
    invSwapCommand(fromSlot, toSlot);
  };

  host.addEventListener("dragstart", onDragStart, true);
  host.addEventListener("dragover", onDragOver, true);
  host.addEventListener("drop", onDrop, true);
  return () => {
    host.removeEventListener("dragstart", onDragStart, true);
    host.removeEventListener("dragover", onDragOver, true);
    host.removeEventListener("drop", onDrop, true);
  };
}
